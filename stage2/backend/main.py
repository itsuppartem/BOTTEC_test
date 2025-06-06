from fastapi import FastAPI, Depends, HTTPException, status, Query, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import models
import schemas
import crud
from database import SessionLocal, engine
from jose import JWTError, jwt
from pydantic import BaseModel, constr
from sqlalchemy import desc, asc
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from starlette.responses import JSONResponse
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
import logging
import time
import os
import redis.asyncio as redis

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Task Manager API",
    description="API для управления задачами с аутентификацией",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost")
redis_client = None

@app.on_event("startup")
async def startup():
    global redis_client
    redis_client = await redis.from_url(REDIS_URL, encoding="utf8", decode_responses=True)
    await FastAPILimiter.init(redis_client)

# HTTPS заглушка
# app.add_middleware(HTTPSRedirectMiddleware)  # Раскомментировать для реального HTTPS

# CSRF/XSS заглушка
# Для JWT в header CSRF не требуется, но если будут cookie — добавить защиту

# Логирование
logger = logging.getLogger("uvicorn.error")

# Refresh/revoke токенов (in-memory) 
revoked_tokens = set()
refresh_tokens = {}

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

class UserRegister(BaseModel):
    username: constr(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    password: constr(min_length=6, max_length=64)

class UserLogin(BaseModel):
    username: constr(min_length=3, max_length=32)
    password: constr(min_length=6, max_length=64)

@app.post("/register", dependencies=[Depends(RateLimiter(times=5, seconds=60))],
    response_model=dict,
    summary="Регистрация нового пользователя",
    description="Создает нового пользователя в системе. Требует email и пароль.",
    responses={
        200: {
            "description": "Пользователь успешно создан",
            "content": {
                "application/json": {
                    "example": {"message": "User created successfully"}
                }
            }
        },
        400: {
            "description": "Email уже зарегистрирован",
            "content": {
                "application/json": {
                    "example": {"detail": "Email already registered"}
                }
            }
        }
    }
)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = crud.create_user(db=db, user=user)
    return {"message": "User created successfully"}

@app.post("/token", dependencies=[Depends(RateLimiter(times=10, seconds=60))],
    response_model=schemas.Token,
    summary="Получение токена доступа",
    description="Аутентифицирует пользователя и возвращает JWT токен для доступа к API.",
    responses={
        200: {
            "description": "Успешная аутентификация",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer"
                    }
                }
            }
        },
        401: {
            "description": "Неверные учетные данные",
            "content": {
                "application/json": {
                    "example": {"detail": "Incorrect username or password"}
                }
            }
        }
    }
)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    # Логирование неудачных попыток
    logger.info(f"Login attempt: {form_data.username} at {time.time()}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token/refresh", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def refresh_token(refresh_token: str):
    if refresh_token in revoked_tokens:
        raise HTTPException(status_code=401, detail="Token revoked")
    # ... проверить refresh_token ...
    # выдать новый access_token
    return {"access_token": "..."}

@app.post("/token/revoke")
async def revoke_token(token: str):
    revoked_tokens.add(token)
    return {"msg": "revoked"}

@app.get("/tasks/", dependencies=[Depends(RateLimiter(times=30, seconds=60))],
    response_model=List[schemas.Task],
    summary="Получение списка задач",
    description="Возвращает список всех задач пользователя. Требует JWT токен.",
    responses={
        200: {
            "description": "Список задач успешно получен",
            "content": {
                "application/json": {
                    "example": [{
                        "id": 1,
                        "title": "Задача 1",
                        "description": "Описание задачи",
                        "is_completed": False,
                        "created_at": "2024-01-01T12:00:00",
                        "owner_id": 1
                    }]
                }
            }
        },
        401: {
            "description": "Неверный токен доступа",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid authentication credentials"}
                }
            }
        }
    }
)
def read_tasks(
    skip: int = 0,
    limit: int = 100,
    is_completed: Optional[bool] = None,
    sort_by: str = Query("created_at", description="Поле для сортировки (created_at или is_completed)"),
    sort_order: str = Query("desc", description="Порядок сортировки (asc или desc)"),
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    sort_column = getattr(models.Task, sort_by, models.Task.created_at)
    sort_func = desc if sort_order == "desc" else asc
    
    tasks = crud.get_tasks(
        db,
        skip=skip,
        limit=limit,
        is_completed=is_completed,
        sort_column=sort_column,
        sort_func=sort_func
    )
    return tasks

@app.post("/tasks/", dependencies=[Depends(RateLimiter(times=10, seconds=60))],
    response_model=schemas.Task,
    summary="Создание новой задачи",
    description="Создает новую задачу для текущего пользователя. Требует JWT токен.",
    responses={
        200: {
            "description": "Задача успешно создана",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "title": "Новая задача",
                        "description": "Описание задачи",
                        "is_completed": False,
                        "created_at": "2024-01-01T12:00:00",
                        "owner_id": 1
                    }
                }
            }
        },
        401: {
            "description": "Неверный токен доступа",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid authentication credentials"}
                }
            }
        }
    }
)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = crud.get_user_by_email(db, email=email)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return crud.create_task(db=db, task=task, user_id=user.id)

@app.put("/tasks/{task_id}",
    response_model=schemas.Task,
    summary="Обновление задачи",
    description="Обновляет существующую задачу. Требует JWT токен.",
    responses={
        200: {
            "description": "Задача успешно обновлена",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "title": "Обновленная задача",
                        "description": "Новое описание",
                        "is_completed": True,
                        "created_at": "2024-01-01T12:00:00",
                        "owner_id": 1
                    }
                }
            }
        },
        401: {
            "description": "Неверный токен доступа",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid authentication credentials"}
                }
            }
        }
    }
)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return crud.update_task(db=db, task_id=task_id, task=task)

@app.delete("/tasks/{task_id}",
    response_model=dict,
    summary="Удаление задачи",
    description="Удаляет существующую задачу. Требует JWT токен.",
    responses={
        200: {
            "description": "Задача успешно удалена",
            "content": {
                "application/json": {
                    "example": {"message": "Task deleted successfully"}
                }
            }
        },
        401: {
            "description": "Неверный токен доступа",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid authentication credentials"}
                }
            }
        }
    }
)
def delete_task(task_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return crud.delete_task(db=db, task_id=task_id)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Suspicious or error request: {request.url} - {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# refresh token
async def store_refresh_token(user_id: str, refresh_token: str, expires: int = 3600*24*7):
    await redis_client.set(f"refresh_token:{user_id}", refresh_token, ex=expires)

async def get_refresh_token(user_id: str):
    return await redis_client.get(f"refresh_token:{user_id}")

async def revoke_refresh_token(user_id: str):
    await redis_client.delete(f"refresh_token:{user_id}")

# revoked access token
async def store_revoked_token(jti: str, expires: int):
    await redis_client.set(f"revoked_token:{jti}", "1", ex=expires)

async def is_token_revoked(jti: str):
    return await redis_client.exists(f"revoked_token:{jti}")

# Использовать эти функции в эндпоинтах refresh/revoke 