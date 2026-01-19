'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, IconButton, Paper, Avatar, List, ListItem, ListItemText } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useRouter } from 'next/navigation';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../lib/socket';

export default function MessageWindow() {
    const { activeRoomId, messages, sendMessage, rooms, typingUsers, setActiveRoom } = useChatStore();
    const currentUser = useAuthStore((state) => state.user);
    const router = useRouter();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const activeRoom = rooms.find(r => r._id === activeRoomId);
    const otherUser = activeRoom?.participants.find((p: any) => (p._id || p) !== currentUser?.id);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
        if (activeRoomId) {
            useChatStore.getState().markAsRead(activeRoomId);
        }
    }, [messages, activeRoomId]);

    const handleSend = async () => {
        if (!input.trim() || !activeRoomId) return;
        await sendMessage(activeRoomId, input);
        setInput('');
        const socket = getSocket();
        socket.emit('stop_typing', { roomId: activeRoomId });
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);

        if (!activeRoomId) return;
        const socket = getSocket();
        socket.emit('typing', { roomId: activeRoomId });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { roomId: activeRoomId });
        }, 2000);
    };

    if (!activeRoomId) {
        return (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9f9f9' }}>
                <Typography variant="h6" color="textSecondary">Select a chat to start messaging</Typography>
            </Box>
        );
    }

    const typingInRoom = typingUsers[activeRoomId] || [];
    const isOtherTyping = typingInRoom.includes(otherUser?._id);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', bgcolor: 'background.paper' }}>
                <IconButton
                    onClick={() => {
                        setActiveRoom(null);
                        router.push('/');
                    }}
                    sx={{ mr: 1, display: { xs: 'flex', md: 'flex' } }}
                    size="small"
                >
                    <ArrowBackIcon />
                </IconButton>
                <Avatar alt={otherUser?.name} src={otherUser?.avatar} sx={{ mr: 2 }}>
                    {otherUser?.name?.charAt(0)}
                </Avatar>
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold">{otherUser?.name}</Typography>
                    {isOtherTyping && (
                        <Typography variant="caption" color="primary">typing...</Typography>
                    )}
                </Box>
            </Box>

            {/* Messages */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#f0f2f5' }}>
                <List>
                    {messages?.map((msg) => {
                        const isMe = msg.sender === currentUser?.id;
                        return (
                            <ListItem
                                key={msg._id}
                                sx={{
                                    flexDirection: 'column',
                                    alignItems: isMe ? 'flex-end' : 'flex-start',
                                    mb: 1
                                }}
                            >
                                <Paper
                                    elevation={1}
                                    sx={{
                                        p: 1.5,
                                        maxWidth: '70%',
                                        bgcolor: isMe ? '#dcf8c6' : 'white',
                                        borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0'
                                    }}
                                >
                                    <Typography variant="body1">{msg.message}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.5 }}>
                                        <Typography variant="caption" color="textSecondary" sx={{ mr: 0.5 }}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                        {isMe && (
                                            msg.read ? (
                                                <DoneAllIcon sx={{ fontSize: 16, color: '#34b7f1' }} />
                                            ) : (
                                                <DoneAllIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            )
                                        )}
                                    </Box>
                                </Paper>
                            </ListItem>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </List>
            </Box>

            {/* Input */}
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid #e0e0e0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        placeholder="Type a message..."
                        variant="outlined"
                        size="small"
                        value={input}
                        onChange={handleTyping}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        sx={{ mr: 1 }}
                    />
                    <IconButton color="primary" onClick={handleSend} disabled={!input.trim()}>
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
}
