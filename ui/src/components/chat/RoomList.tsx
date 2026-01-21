import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, ListItemAvatar, Avatar, ListItemText, Typography, Divider, Badge, ListItemButton, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useRouter } from 'next/navigation';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import CreateChatDialog from './CreateChatDialog';

export default function RoomList() {
    const { rooms, fetchRooms, setActiveRoom, activeRoomId, onlineUsers, typingUsers, deleteRoom } = useChatStore();
    const { user: currentUser, logout } = useAuthStore();
    const router = useRouter();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const getOtherParticipant = (room: any) => {
        return room.participants.find((p: any) => (p._id || p) !== currentUser?.id);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, roomId: string) => {
        event.stopPropagation();
        setMenuAnchor({ ...menuAnchor, [roomId]: event.currentTarget });
    };

    const handleMenuClose = (roomId: string) => {
        setMenuAnchor({ ...menuAnchor, [roomId]: null });
    };

    const handleDeleteChat = async (roomId: string) => {
        if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
            await deleteRoom(roomId);
        }
        handleMenuClose(roomId);
    };

    return (
        <Box sx={{ width: '100%', height: '100%', borderRight: '1px solid #e0e0e0', bgcolor: 'background.paper' }}>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title="Back">
                        <IconButton onClick={() => router.push('/')} size="small" sx={{ mr: 1 }}>
                            <ArrowBackIcon />
                        </IconButton>
                    </Tooltip>
                    <Typography variant="h6" fontWeight="bold">Chats</Typography>
                </Box>
                <Box>
                    <Tooltip title="New Chat">
                        <IconButton onClick={() => setCreateDialogOpen(true)} size="small" color="primary">
                            <AddIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Analytics">
                        <IconButton onClick={() => router.push('/analytics')} size="small" color="primary">
                            <AssessmentIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Logout">
                        <IconButton onClick={handleLogout} size="small" color="error" sx={{ ml: 1 }}>
                            <LogoutIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            <Divider />
            <CreateChatDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
            <List sx={{ overflowY: 'auto', height: 'calc(100% - 64px)' }}>
                {rooms?.map((room) => {
                    const otherUser = getOtherParticipant(room);
                    const isOnline = onlineUsers.includes(otherUser?._id);

                    return (
                        <ListItem
                            key={room._id}
                            disablePadding
                            secondaryAction={
                                <>
                                    <IconButton edge="end" aria-label="more" onClick={(e) => handleMenuOpen(e, room._id)}>
                                        <MoreVertIcon />
                                    </IconButton>
                                    <Menu
                                        anchorEl={menuAnchor[room._id]}
                                        open={Boolean(menuAnchor[room._id])}
                                        onClose={() => handleMenuClose(room._id)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MenuItem onClick={() => handleDeleteChat(room._id)} sx={{ color: 'error.main' }}>
                                            Delete Chat
                                        </MenuItem>
                                    </Menu>
                                </>
                            }
                            sx={{
                                '&:hover': { bgcolor: '#f5f5f5' }
                            }}
                        >
                            <ListItemButton
                                selected={activeRoomId === room._id}
                                onClick={() => setActiveRoom(room._id)}
                                sx={{
                                    '&.Mui-selected': { bgcolor: '#e3f2fd' },
                                }}
                            >
                                <ListItemAvatar>
                                    <Badge
                                        overlap="circular"
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                        variant="dot"
                                        color={isOnline ? "success" : "error"}
                                    >
                                        <Avatar alt={otherUser?.name} src={otherUser?.avatar}>
                                            {otherUser?.name?.charAt(0)}
                                        </Avatar>
                                    </Badge>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={otherUser?.name || 'Unknown'}
                                    secondary={
                                        <Typography variant="body2" color="textSecondary" noWrap>
                                            {typingUsers[room._id]?.length > 0
                                                ? 'typing...'
                                                : (room.lastMessage?.message || 'No messages yet')}
                                        </Typography>
                                    }
                                />
                                {room.unreadCount ? (
                                    <Badge badgeContent={room.unreadCount} color="success" sx={{ ml: 1, mr: 2 }} />
                                ) : null}
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
}
