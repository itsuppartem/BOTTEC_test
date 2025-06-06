import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from './AnimatedBackground';
import axios from 'axios';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  Box,
  AppBar,
  Toolbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Grow,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  Snackbar,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Logout as LogoutIcon, FilterList as FilterIcon } from '@mui/icons-material';

interface Task {
  id: number;
  title: string;
  description: string;
  is_completed: boolean;
  created_at: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const showError = (msg: string) => {
    setError(msg);
    setSnackbarOpen(true);
  };

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (filter !== 'all') {
        params.append('is_completed', filter === 'completed' ? 'true' : 'false');
      }
      const response = await axios.get(`http://localhost:8000/tasks/?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setTasks(response.data);
    } catch (error) {
      showError('Ошибка загрузки задач');
    }
  }, [filter, sortBy, sortOrder, token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchTasks();
  }, [token, navigate, fetchTasks]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/tasks/', {
        title: newTaskTitle,
        description: newTaskDescription,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setTasks(prevTasks => [response.data, ...prevTasks]);
      setIsAddDialogOpen(false);
    } catch (error) {
      showError('Ошибка добавления задачи');
    }
  };

  const handleToggleTask = async (taskId: number, isCompleted: boolean) => {
    try {
      await axios.put(`http://localhost:8000/tasks/${taskId}`, {
        is_completed: !isCompleted,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchTasks();
    } catch (error) {
      showError('Ошибка обновления задачи');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setDeletingTaskId(taskId);
    setTimeout(async () => {
      try {
        await axios.delete(`http://localhost:8000/tasks/${taskId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      } catch (error) {
        showError('Ошибка удаления задачи');
      } finally {
        setDeletingTaskId(null);
      }
    }, 300);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFilterChange = (event: SelectChangeEvent) => {
    setFilter(event.target.value);
    if (isMobile) {
      setIsFilterDrawerOpen(false);
    }
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
    if (isMobile) {
      setIsFilterDrawerOpen(false);
    }
  };

  const handleSortOrderChange = (event: SelectChangeEvent) => {
    setSortOrder(event.target.value);
    if (isMobile) {
      setIsFilterDrawerOpen(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const FilterControls = () => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel>Фильтр</InputLabel>
        <Select
          value={filter}
          label="Фильтр"
          onChange={handleFilterChange}
        >
          <MenuItem value="all">Все</MenuItem>
          <MenuItem value="completed">Выполненные</MenuItem>
          <MenuItem value="active">Активные</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>Сортировка</InputLabel>
        <Select
          value={sortBy}
          label="Сортировка"
          onChange={handleSortChange}
        >
          <MenuItem value="created_at">По дате</MenuItem>
          <MenuItem value="is_completed">По статусу</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>Порядок</InputLabel>
        <Select
          value={sortOrder}
          label="Порядок"
          onChange={handleSortOrderChange}
        >
          <MenuItem value="desc">По убыванию</MenuItem>
          <MenuItem value="asc">По возрастанию</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1, pb: 7, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <AnimatedBackground />
      <AppBar position="fixed" sx={{ zIndex: 2, background: 'rgba(33, 150, 243, 0.95)', boxShadow: '0 4px 24px 0 rgba(33,150,243,0.12)' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Список задач
          </Typography>
          <IconButton color="inherit" onClick={() => setIsFilterDrawerOpen(true)}>
            <FilterIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Container maxWidth="md" sx={{ mt: 2, position: 'relative', zIndex: 1 }}>
        <List>
          {tasks.map((task) => (
            <Grow
              key={task.id}
              in={deletingTaskId !== task.id}
              timeout={300}
              onExited={() => {
                if (deletingTaskId === task.id) {
                  setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
                }
              }}
            >
              <Paper sx={{ mb: 2, borderRadius: 4, boxShadow: '0 4px 32px 0 rgba(33,150,243,0.10)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(2px)' }}>
                <ListItem alignItems="flex-start">
                  <Checkbox
                    edge="start"
                    checked={task.is_completed}
                    onChange={() => handleToggleTask(task.id, task.is_completed)}
                    sx={{ color: '#2196f3' }}
                  />
                  <ListItemText
                    primary={task.title}
                    secondary={<>
                      {task.description && <span>{task.description}<br/></span>}
                      <span style={{ color: '#888', fontSize: 13 }}>Создано: {formatDate(task.created_at)}</span>
                    </>}
                    sx={{
                      textDecoration: task.is_completed ? 'line-through' : 'none',
                      color: task.is_completed ? '#90caf9' : '#222',
                    }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteTask(task.id)}
                      sx={{ color: '#2196f3' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            </Grow>
          ))}
        </List>
      </Container>
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>Новая задача</DialogTitle>
        <DialogContent>
          <form onSubmit={handleAddTask}>
            <TextField
              fullWidth
              label="Название задачи"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              margin="normal"
              required
              sx={{ background: 'rgba(255,255,255,0.7)', borderRadius: 2 }}
            />
            <TextField
              fullWidth
              label="Описание"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              margin="normal"
              multiline
              rows={4}
              sx={{ background: 'rgba(255,255,255,0.7)', borderRadius: 2 }}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddTask} variant="contained">Добавить</Button>
        </DialogActions>
      </Dialog>
      <SwipeableDrawer
        anchor="right"
        open={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        onOpen={() => setIsFilterDrawerOpen(true)}
        PaperProps={{ sx: { background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(2px)' } }}
      >
        <Box sx={{ width: 280 }}>
          <FilterControls />
        </Box>
      </SwipeableDrawer>
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 16, zIndex: 3, boxShadow: '0 4px 32px 0 rgba(33,150,243,0.18)' }}
        onClick={() => setIsAddDialogOpen(true)}
      >
        <AddIcon />
      </Fab>
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
} 