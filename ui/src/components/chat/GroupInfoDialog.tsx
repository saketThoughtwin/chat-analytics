'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Typography,
    Box,
    IconButton,
    Button,
    Checkbox,
    Chip,
    Stack,
    ListItemButton,
    Divider,
    Paper,
    DialogContentText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Cropper from 'react-easy-crop';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { API_ENDPOINTS } from '../../lib/apiendpoint';
import Spinner from '../ui/Spinner';

interface User {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface GroupInfoDialogProps {
    open: boolean;
    onClose: () => void;
    roomId: string;
}

export default function GroupInfoDialog({ open, onClose, roomId }: GroupInfoDialogProps) {
    const { rooms, updateRoom, updateGroupAvatar } = useChatStore();
    const { user: currentUser } = useAuthStore();
    const room = rooms.find((r) => r._id === roomId);

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(room?.name || '');
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removalConfirmOpen, setRemovalConfirmOpen] = useState(false);
    const [userToRemove, setUserToRemove] = useState<string | null>(null);

    const isAdmin = currentUser?.id === room?.groupAdmin;
    const groupAvatarInputRef = useRef<HTMLInputElement>(null);

    // Group avatar cropper state (always upload cropped image)
    const [avatarImageSrc, setAvatarImageSrc] = useState<string | null>(null);
    const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
    const [avatarZoom, setAvatarZoom] = useState(1);
    const [avatarCroppedAreaPixels, setAvatarCroppedAreaPixels] = useState<any>(null);
    const [avatarCropOpen, setAvatarCropOpen] = useState(false);

    useEffect(() => {
        if (room?.name) setNewName(room.name);
    }, [room?.name]);

    useEffect(() => {
        if (!open) {
            setAvatarCropOpen(false);
            setAvatarImageSrc(null);
            setAvatarCrop({ x: 0, y: 0 });
            setAvatarZoom(1);
            setAvatarCroppedAreaPixels(null);
        }
    }, [open]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!isAddingMember) return;
            setLoadingUsers(true);
            try {
                const endpoint = search.trim()
                    ? `${API_ENDPOINTS.USERS.SEARCH}?q=${search}`
                    : API_ENDPOINTS.USERS.SEARCH;
                const response = await api.get(endpoint);
                // Filter out users already in the room
                const filtered = response.data.filter(
                    (u: any) => !room?.participants.some((p) => (p._id || p) === u._id)
                );
                setUsers(filtered);
            } catch (error) {
                console.error('Failed to fetch users', error);
            } finally {
                setLoadingUsers(false);
            }
        };

        if (isAddingMember) {
            const delayDebounceFn = setTimeout(fetchUsers, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [search, isAddingMember, room?.participants]);

    const handleSaveName = async () => {
        if (!newName.trim() || newName === room?.name) {
            setIsEditingName(false);
            return;
        }

        setSaving(true);
        try {
            await updateRoom(roomId, { name: newName.trim() });
            setIsEditingName(false);
        } catch (error) {
            console.error('Failed to update group name', error);
        } finally {
            setSaving(false);
        }
    };

    const handleAddUser = async (userToAdd: User) => {
        setSaving(true);
        try {
            const currentParticipantIds = room?.participants.map((p) => (p._id || p)) || [];
            await updateRoom(roomId, {
                participants: [...currentParticipantIds, userToAdd._id]
            });
            setIsAddingMember(false);
            setSearch('');
        } catch (error) {
            console.error('Failed to add user', error);
        } finally {
            setSaving(false);
        }
    };

    const onAvatarCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setAvatarCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const getCroppedImage = async (imageSrc: string, pixelCrop: any): Promise<File> => {
        const image = new Image();
        image.src = imageSrc;
        await new Promise((resolve) => { image.onload = resolve; });

        const canvas = document.createElement("canvas");
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No 2d context");

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Canvas is empty"));
                    return;
                }
                resolve(new File([blob], "group-avatar.jpg", { type: "image/jpeg" }));
            }, "image/jpeg");
        });
    };

    const handleGroupAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            setAvatarImageSrc(reader.result?.toString() || null);
            setAvatarCropOpen(true);
        });
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleUploadCroppedAvatar = async () => {
        if (!avatarImageSrc || !avatarCroppedAreaPixels) return;
        setSaving(true);
        try {
            const croppedFile = await getCroppedImage(avatarImageSrc, avatarCroppedAreaPixels);
            await updateGroupAvatar(roomId, croppedFile);
            setAvatarCropOpen(false);
            setAvatarImageSrc(null);
            setAvatarCroppedAreaPixels(null);
            setAvatarCrop({ x: 0, y: 0 });
            setAvatarZoom(1);
        } catch (error) {
            console.error('Failed to update group avatar', error);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveUserClick = (userId: string) => {
        setUserToRemove(userId);
        setRemovalConfirmOpen(true);
    };

    const handleConfirmRemoval = async () => {
        if (!userToRemove) return;
        setRemovalConfirmOpen(false);
        setSaving(true);
        try {
            const currentParticipantIds = room?.participants.map((p) => (p._id || p)) || [];
            await updateRoom(roomId, {
                participants: currentParticipantIds.filter((id) => id !== userToRemove)
            });
        } catch (error) {
            console.error('Failed to remove user', error);
        } finally {
            setSaving(false);
        }
    };

    if (!room) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" sx={{ '& .MuiDialog-paper': { borderRadius: '16px' } }}>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight="700">Group Info</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                {/* Group Header Area */}
                <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <Box sx={{ position: 'relative', width: 80, height: 80, margin: '0 auto', mb: 2 }}>
                        <Avatar
                            src={room.avatar}
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: '#6366f1',
                                fontSize: '2rem'
                            }}
                        >
                            {room.name?.charAt(0)}
                        </Avatar>

                        {isAdmin && (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={() => groupAvatarInputRef.current?.click()}
                                    sx={{
                                        position: 'absolute',
                                        right: -6,
                                        bottom: -6,
                                        bgcolor: '#00a884',
                                        color: 'white',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                        '&:hover': { bgcolor: '#009478' }
                                    }}
                                    disabled={saving}
                                >
                                    <PhotoCameraIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                <input
                                    ref={groupAvatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleGroupAvatarChange}
                                />
                            </>
                        )}
                    </Box>

                    {isEditingName ? (
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            <TextField
                                size="small"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                autoFocus
                                variant="standard"
                                sx={{ maxWidth: 200 }}
                            />
                            <IconButton onClick={handleSaveName} disabled={saving} size="small" sx={{ color: '#4ade80' }}>
                                <SaveIcon />
                            </IconButton>
                        </Box>
                    ) : (
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            <Typography variant="h5" fontWeight="600">
                                {room.name}
                            </Typography>
                            {isAdmin && (
                                <IconButton onClick={() => setIsEditingName(true)} size="small" sx={{ opacity: 0.6 }}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    )}
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Group • {room.participants.length} members
                    </Typography>
                </Box>

                <Divider />

                {/* Participant List */}
                <Box sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" color="textSecondary" fontWeight="700">
                            MEMBERS
                        </Typography>
                        {isAdmin && !isAddingMember && (
                            <Button
                                size="small"
                                startIcon={<PersonAddIcon />}
                                onClick={() => setIsAddingMember(true)}
                                sx={{ color: '#6366f1' }}
                            >
                                Add Member
                            </Button>
                        )}
                    </Box>

                    {isAddingMember ? (
                        <Box sx={{ mb: 2 }}>
                            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search users..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                />
                                <Button size="small" onClick={() => setIsAddingMember(false)}>Cancel</Button>
                            </Box>
                            <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                                {loadingUsers ? (
                                    <Box p={2} textAlign="center"><Spinner size={20} /></Box>
                                ) : users.length === 0 ? (
                                    <Box p={2} textAlign="center"><Typography variant="caption">No users found</Typography></Box>
                                ) : (
                                    <List>
                                        {users.map((u) => (
                                            <ListItem key={u._id} disablePadding>
                                                <ListItemButton onClick={() => handleAddUser(u)}>
                                                    <ListItemAvatar>
                                                        <Avatar src={u.avatar} sx={{ width: 32, height: 32 }}>{u.name.charAt(0)}</Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText primary={u.name} primaryTypographyProps={{ variant: 'body2' }} />
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Paper>
                        </Box>
                    ) : (
                        <List>
                            {room.participants
                                .map((p: any) => {
                                    const pId = (p._id || p).toString();
                                    const isMemberMe = pId === currentUser?.id;
                                    const isMemberAdmin = pId === room.groupAdmin;

                                    return (
                                        <ListItem
                                            key={pId}
                                            secondaryAction={
                                                isAdmin && !isMemberMe && (
                                                    <IconButton edge="end" size="small" onClick={() => handleRemoveUserClick(pId)} sx={{ color: '#ef4444', opacity: 0.7 }}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )
                                            }
                                        >
                                            <ListItemAvatar>
                                                <Avatar src={p.avatar}>{p.name?.charAt(0) || 'U'}</Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                        <Typography variant="body2">{p.name || 'Unknown'}</Typography>
                                                        {isMemberMe && <Chip label="You" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem' }} />}
                                                        {isMemberAdmin && <Chip label="Admin" size="small" color="primary" sx={{ height: 16, fontSize: '0.65rem', bgcolor: '#6366f1' }} />}
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                    );
                                })}
                        </List>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} fullWidth variant="outlined" sx={{ borderRadius: '8px' }}>Close</Button>
            </DialogActions>

            {/* Removal Confirmation Dialog */}
            <Dialog
                open={removalConfirmOpen}
                onClose={() => setRemovalConfirmOpen(false)}
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle>Remove Member?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to remove this member from the group?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRemovalConfirmOpen(false)} color="inherit" sx={{ borderRadius: 2 }}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmRemoval} color="error" variant="contained" sx={{ borderRadius: 2, boxShadow: 'none' }}>
                        Remove
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Crop Dialog for Group Avatar */}
            <Dialog
                open={avatarCropOpen}
                onClose={() => { if (!saving) setAvatarCropOpen(false); }}
                fullWidth
                maxWidth="xs"
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle>Crop group photo</DialogTitle>
                <DialogContent>
                    <Box sx={{ position: "relative", width: "100%", height: 320, bgcolor: "black", borderRadius: 2, overflow: "hidden" }}>
                        {avatarImageSrc && (
                            <Cropper
                                image={avatarImageSrc}
                                crop={avatarCrop}
                                zoom={avatarZoom}
                                aspect={1}
                                cropShape="round"
                                onCropChange={setAvatarCrop}
                                onCropComplete={onAvatarCropComplete}
                                onZoomChange={setAvatarZoom}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => setAvatarCropOpen(false)}
                        color="inherit"
                        disabled={saving}
                        sx={{ borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUploadCroppedAvatar}
                        variant="contained"
                        disabled={saving || !avatarCroppedAreaPixels}
                        sx={{ borderRadius: 2, boxShadow: 'none', bgcolor: '#00a884', '&:hover': { bgcolor: '#009478' } }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}
