import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from './AnimatedBackground';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
} from '@mui/material';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AnimatedBackground />
      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4, background: 'rgba(255,255,255,0.88)', boxShadow: '0 4px 32px 0 rgba(33,150,243,0.10)', backdropFilter: 'blur(2px)' }}>
          <Typography variant="h5" align="center" sx={{ mb: 2, fontWeight: 700 }}>
            Вход
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              sx={{ background: 'rgba(255,255,255,0.7)', borderRadius: 2 }}
            />
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              sx={{ background: 'rgba(255,255,255,0.7)', borderRadius: 2 }}
            />
            {error && (
              <Typography color="error" sx={{ mt: 1, mb: 1 }}>
                {error}
              </Typography>
            )}
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2, fontWeight: 700 }}>
              Войти
            </Button>
            <Button color="primary" fullWidth sx={{ mt: 1 }} onClick={() => navigate('/register')}>
              Регистрация
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
} 