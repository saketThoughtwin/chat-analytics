'use client';

import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Paper, Alert, Link } from '@mui/material';
import { useRouter } from 'next/navigation';
import api from '../../src/lib/api';
import { useAuthStore } from '../../src/store/authStore';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Register user
            await api.post('/auth/signup', { name, email, password });

            // Auto-login after signup
            const loginResponse = await api.post('/auth/login', { email, password });
            const { user, token } = loginResponse.data;
            setAuth(user, token);
            router.push('/chat');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
        >
            <Container maxWidth="xs">
                <Paper elevation={10} sx={{ p: 4, borderRadius: 3 }}>
                    <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight="bold" color="primary">
                        Join Us
                    </Typography>
                    <Typography variant="body1" align="center" color="textSecondary" sx={{ mb: 3 }}>
                        Create your account
                    </Typography>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Full Name"
                            variant="outlined"
                            margin="normal"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Email Address"
                            variant="outlined"
                            margin="normal"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type="password"
                            variant="outlined"
                            margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button
                            fullWidth
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                            disabled={loading}
                            sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: 2, fontWeight: 'bold' }}
                        >
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </Button>
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Typography variant="body2">
                                Already have an account?{' '}
                                <Link href="/login" underline="hover" sx={{ fontWeight: 'bold' }}>
                                    Sign In
                                </Link>
                            </Typography>
                        </Box>
                    </form>
                </Paper>
            </Container>
        </Box>
    );
}
