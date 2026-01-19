'use client';

import React, { useEffect } from 'react';
import { Box, Grid, Paper } from '@mui/material';
import RoomList from './RoomList';
import MessageWindow from './MessageWindow';
import { useChatStore } from '../../store/chatStore';
import { connectSocket, disconnectSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';

export default function ChatLayout() {
    const initSocketEvents = useChatStore((state) => state.initSocketEvents);
    const token = useAuthStore((state) => state.token);
    const fetchMe = useAuthStore((state) => state.fetchMe);
    const router = useRouter();

    useEffect(() => {
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
    }, [token, initSocketEvents, router, fetchMe]);

    return (
        <Box sx={{ height: '100vh', p: 2, bgcolor: '#f0f2f5' }}>
            <Grid container sx={{ height: '100%', borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
                <Grid size={{ xs: 12, md: 4, lg: 3 }} sx={{ height: '100%' }}>
                    <Paper square sx={{ height: '100%' }}>
                        <RoomList />
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 8, lg: 9 }} sx={{ height: '100%' }}>
                    <Paper square sx={{ height: '100%' }}>
                        <MessageWindow />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
