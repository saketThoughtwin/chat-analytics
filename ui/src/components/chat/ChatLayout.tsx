'use client';

import React, { useEffect } from 'react';
import { Box, Grid, Paper, CircularProgress } from '@mui/material';
import RoomList from './RoomList';
import MessageWindow from './MessageWindow';
import { useChatStore } from '../../store/chatStore';
import { connectSocket, disconnectSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';

export default function ChatLayout() {
    const initSocketEvents = useChatStore((state) => state.initSocketEvents);
    const activeRoomId = useChatStore((state) => state.activeRoomId);
    const { token, fetchMe, _hasHydrated } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!_hasHydrated) return;

        if (!token) {
            router.push('/login');
            return;
        }

        fetchMe();
        connectSocket();
        initSocketEvents();

        return () => {
            disconnectSocket();
        };
    }, [token, initSocketEvents, router, fetchMe, _hasHydrated]);

    if (!_hasHydrated) {
        return (
            <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{
            height: '100dvh',
            overflow: 'hidden',
            p: { xs: 0, md: 3 },
            // Dimmer, softer background (Slate/Blue-ish gray)
            background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
            bgcolor: '#f1f5f9'
        }}>
            {/* Soft ambient overlay */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.4) 0%, rgba(0,0,0,0.05) 100%)',
                opacity: 0.8
            }} />

            <Grid container sx={{
                position: 'relative',
                zIndex: 1,
                height: '100%',
                borderRadius: { xs: 0, md: '24px' },
                overflow: 'hidden',
                boxShadow: { xs: 'none', md: '0 20px 60px rgba(0,0,0,0.15)' }, // Slightly deeper shadow
                // Dimmer glass base (Off-white/Grayish)
                bgcolor: 'rgba(248, 250, 252, 0.85)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.4)'
            }}>
                <Grid size={{ xs: 12, md: 4, lg: 3 }} sx={{
                    height: '100%',
                    borderRight: '1px solid rgba(0,0,0,0.06)',
                    display: { xs: activeRoomId ? 'none' : 'block', md: 'block' }
                }}>
                    <Paper square elevation={0} sx={{ height: '100%', bgcolor: 'transparent' }}>
                        <RoomList />
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 8, lg: 9 }} sx={{
                    height: '100%',
                    display: { xs: activeRoomId ? 'block' : 'none', md: 'block' }
                }}>
                    <Paper square elevation={0} sx={{ height: '100%', bgcolor: 'transparent' }}>
                        <MessageWindow />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
