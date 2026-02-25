'use client';

import React, { useEffect } from 'react';
import { Box, Grid, Paper } from '@mui/material';
import RoomList from './RoomList';
import MessageWindow from './MessageWindow';
import { useChatStore } from '../../store/chatStore';
import { connectSocket, disconnectSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';
import Spinner from '../ui/Spinner';

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
                <Spinner size={40} className="text-indigo-600" />
            </Box>
        );
    }

    return (
        <Box sx={{
            height: '100dvh',
            overflow: 'hidden',
            p: 0,
            bgcolor: '#fff'
        }}>


            <Grid container sx={{
                position: 'relative',
                zIndex: 1,
                height: '100%',
                borderRadius: 0,
                overflow: 'hidden',
                bgcolor: '#fff',
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
