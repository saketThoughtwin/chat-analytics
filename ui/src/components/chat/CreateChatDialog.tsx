'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    ListItemButton,
    Typography,
    Box,
    IconButton,
    Backdrop
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../lib/api';
import { API_ENDPOINTS } from '../../lib/apiendpoint';
import { JSON_HEADERS } from '../../lib/headers';
import { useChatStore } from '../../store/chatStore';
import Spinner from '../ui/Spinner';

interface User {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface CreateChatDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function CreateChatDialog({ open, onClose }: CreateChatDialogProps) {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const { setActiveRoom, fetchRooms } = useChatStore();

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const endpoint = search.trim()
                    ? `${API_ENDPOINTS.USERS.SEARCH}?q=${search}`
                    : API_ENDPOINTS.USERS.SEARCH;
                const response = await api.get(endpoint);
                setUsers(response.data);
            } catch (error) {
                console.error('Failed to fetch users', error);
            } finally {
                setLoading(false);
            }
        };

        if (search.trim()) {
            const delayDebounceFn = setTimeout(fetchUsers, 300);
            return () => clearTimeout(delayDebounceFn);
        } else if (open) {
            fetchUsers();
        } else {
            setUsers([]);
        }
    }, [search, open]);

    const handleCreateRoom = async (otherUserId: string) => {
        setCreating(true);
        try {
            const response = await api.post(API_ENDPOINTS.CHAT.ROOMS, { otherUserId }, { headers: JSON_HEADERS });
            const newRoom = response.data;
            await fetchRooms();
            setActiveRoom(newRoom._id);
            onClose();
        } catch (error) {
            console.error('Failed to create room', error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    New Chat
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Search users by name or email"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ mb: 2 }}
                />
                {loading ? (
                    <Box display="flex" justifyContent="center" p={2}>
                        <Spinner size={24} color="#4f46e5" />
                    </Box>
                ) : (
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {users.map((user) => (
                            <ListItem key={user._id} disablePadding>
                                <ListItemButton onClick={() => handleCreateRoom(user._id)}>
                                    <ListItemAvatar>
                                        <Avatar alt={user.name} src={user.avatar}>
                                            {user.name.charAt(0)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={user.name} secondary={user.email} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {search && !loading && users.length === 0 && (
                            <Typography variant="body2" color="textSecondary" align="center" sx={{ p: 2 }}>
                                No users found
                            </Typography>
                        )}
                    </List>
                )}
            </DialogContent>
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, position: 'absolute' }}
                open={creating}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Spinner size={32} color="#ffffff" opacity={0.8} />

                </Box>
            </Backdrop>
        </Dialog>
    );
}
