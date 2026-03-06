'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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
    Backdrop,
    Button,
    Checkbox,
    Chip,
    Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../lib/api';
import { API_ENDPOINTS } from '../../lib/apiendpoint';
import { useChatStore } from '../../store/chatStore';
import Spinner from '../ui/Spinner';

interface User {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface CreateGroupDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function CreateGroupDialog({ open, onClose }: CreateGroupDialogProps) {
    const [step, setStep] = useState(1); // 1: Select Users, 2: Group Info
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const { createGroupRoom } = useChatStore();

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

        if (open) {
            if (search.trim()) {
                const delayDebounceFn = setTimeout(fetchUsers, 300);
                return () => clearTimeout(delayDebounceFn);
            } else {
                fetchUsers();
            }
        }
    }, [search, open]);

    const handleToggleUser = (user: User) => {
        setSelectedUsers((prev) =>
            prev.find((u) => u._id === user._id)
                ? prev.filter((u) => u._id !== user._id)
                : [...prev, user]
        );
    };

    const handleNext = () => {
        if (selectedUsers.length < 2) return;
        setStep(2);
    };

    const handleBack = () => setStep(1);

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedUsers.length === 0) return;
        setCreating(true);
        try {
            await createGroupRoom(
                selectedUsers.map((u) => u._id),
                groupName.trim()
            );
            handleClose();
        } catch (error) {
            console.error('Failed to create group', error);
        } finally {
            setCreating(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setSearch('');
        setSelectedUsers([]);
        setGroupName('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        {step === 2 && (
                            <IconButton onClick={handleBack} size="small">
                                <ArrowBackIcon />
                            </IconButton>
                        )}
                        <Typography variant="h6">
                            {step === 1 ? 'Add Group Members' : 'New Group'}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Typography variant="caption" color="textSecondary">
                            {selectedUsers.length} / 2 minimum
                        </Typography>
                        <IconButton onClick={handleClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent>
                {step === 1 ? (
                    <>
                        <Box sx={{ mb: 2 }}>
                            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: selectedUsers.length > 0 ? 2 : 0 }}>
                                {selectedUsers.map((user) => (
                                    <Chip
                                        key={user._id}
                                        label={user.name}
                                        onDelete={() => handleToggleUser(user)}
                                        avatar={<Avatar src={user.avatar}>{user.name.charAt(0)}</Avatar>}
                                        size="small"
                                    />
                                ))}
                            </Stack>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Search users"
                                type="text"
                                fullWidth
                                variant="standard"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Box>
                        {loading ? (
                            <Box display="flex" justifyContent="center" p={2}>
                                <Spinner size={24} color="#4f46e5" />
                            </Box>
                        ) : (
                            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                                {users.map((user) => {
                                    const isSelected = !!selectedUsers.find((u) => u._id === user._id);
                                    return (
                                        <ListItem key={user._id} disablePadding>
                                            <ListItemButton onClick={() => handleToggleUser(user)}>
                                                <ListItemAvatar>
                                                    <Avatar alt={user.name} src={user.avatar}>
                                                        {user.name.charAt(0)}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText primary={user.name} secondary={user.email} />
                                                <Checkbox checked={isSelected} edge="end" />
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        )}
                    </>
                ) : (
                    <Box sx={{ mt: 1 }}>
                        <TextField
                            autoFocus
                            label="Group Name"
                            fullWidth
                            variant="outlined"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                            Provide a group name and an optional group icon.
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                {step === 1 ? (
                    <Button
                        variant="contained"
                        disabled={selectedUsers.length < 2}
                        onClick={handleNext}
                        fullWidth
                        sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
                    >
                        Next
                    </Button>

                ) : (
                    <Button
                        variant="contained"
                        disabled={!groupName.trim() || creating}
                        onClick={handleCreateGroup}
                        fullWidth
                        sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
                    >
                        {creating ? 'Creating...' : 'Create Group'}
                    </Button>
                )}
            </DialogActions>
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, position: 'absolute' }}
                open={creating}
            >
                <Spinner size={32} color="#ffffff" opacity={0.8} />
            </Backdrop>
        </Dialog>
    );
}
