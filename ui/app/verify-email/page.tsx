'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Container, Paper, Alert, Backdrop, CircularProgress } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../src/store/authStore';

export default function VerifyEmailPage() {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    const verifyOTP = useAuthStore((state) => state.verifyOTP);
    const tempSignupData = useAuthStore((state) => state.tempSignupData);

    useEffect(() => {
        if (!tempSignupData) {
            router.push('/signup');
        }
    }, [tempSignupData, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await verifyOTP(otp);
            router.push('/chat');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
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
                        Verify Email
                    </Typography>
                    <Typography variant="body1" align="center" color="textSecondary" sx={{ mb: 3 }}>
                        We've sent a 6-digit code to <strong>{email}</strong> via EmailJS.
                    </Typography>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Enter 6-digit OTP"
                            variant="outlined"
                            margin="normal"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                            inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '8px', fontSize: '24px' } }}
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
                            {loading ? 'Verifying...' : 'Verify & Create Account'}
                        </Button>
                    </form>
                </Paper>
            </Container>
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={loading}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        </Box>
    );
}
