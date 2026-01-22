"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Divider,
  Badge,
  ListItemButton,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useRouter } from "next/navigation";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import CreateChatDialog from "./CreateChatDialog";

export default function RoomList() {
  const {
    rooms,
    fetchRooms,
    setActiveRoom,
    activeRoomId,
    onlineUsers,
    typingUsers,
    deleteRoom,
    loadingRooms,
    reset,
  } = useChatStore();
  const { user: currentUser, logout } = useAuthStore();
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{
    [key: string]: HTMLElement | null;
  }>({});

  // Deletion Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  // Success Snackbar State
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleLogout = () => {
    reset(); // Clear chat state (active room, messages, etc.)
    logout();
    router.push("/login");
  };

  const getOtherParticipant = (room: any) => {
    return room.participants.find((p: any) => (p._id || p) !== currentUser?.id);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    roomId: string,
  ) => {
    event.stopPropagation();
    setMenuAnchor({ ...menuAnchor, [roomId]: event.currentTarget });
  };

  const handleMenuClose = (roomId: string) => {
    setMenuAnchor({ ...menuAnchor, [roomId]: null });
  };

  const handleDeleteClick = (roomId: string) => {
    setRoomToDelete(roomId);
    setDeleteDialogOpen(true);
    handleMenuClose(roomId);
  };

  const handleDeleteConfirm = async () => {
    if (roomToDelete) {
      await deleteRoom(roomToDelete);
      setSnackbarOpen(true);
    }
    setDeleteDialogOpen(false);
    setRoomToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setRoomToDelete(null);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        borderRight: "1px solid #e0e0e0",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 80,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            src="/logo.png"
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'transparent',
              filter: 'drop-shadow(0 4px 6px rgba(99, 102, 241, 0.3))'
            }}
            variant="rounded"
          >
            C
          </Avatar>
          <Typography variant="h5" fontWeight="800" sx={{
            background: 'linear-gradient(45deg, #1e1b4b, #4338ca)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            Chats
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="New Chat">
            <IconButton
              onClick={() => setCreateDialogOpen(true)}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.5)',
                boxShadow: 'none',
                border: '1px solid rgba(0,0,0,0.05)',
                '&:hover': { bgcolor: 'white', transform: 'translateY(-1px)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
                transition: 'all 0.2s',
                width: 36,
                height: 36,
                color: '#6366f1'
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Analytics">
            <IconButton
              onClick={() => router.push("/analytics")}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.5)',
                boxShadow: 'none',
                border: '1px solid rgba(0,0,0,0.05)',
                '&:hover': { bgcolor: 'white', transform: 'translateY(-1px)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
                transition: 'all 0.2s',
                width: 36,
                height: 36,
                color: '#6366f1'
              }}
            >
              <AssessmentIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton
              onClick={handleLogout}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.5)',
                boxShadow: 'none',
                border: '1px solid rgba(0,0,0,0.05)',
                color: '#ef4444',
                '&:hover': { bgcolor: '#fee2e2', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
                width: 36,
                height: 36
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{ px: 3, pb: 2 }}>
        {/* Placeholder for search if needed later */}
      </Box>
      <CreateChatDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
      <List sx={{ overflowY: "auto", height: "calc(100% - 64px)" }}>
        {loadingRooms ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 1,
              opacity: 0.8,
            }}
          >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Loading chats...
            </Typography>
          </Box>
        ) : rooms.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
            }}
          >
            No chats found
          </Box>
        ) : (
          rooms.map((room) => {
            const otherUser = getOtherParticipant(room);
            const isOnline = onlineUsers.includes(otherUser?._id);

            return (
              <ListItem
                key={room._id}
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {room.unreadCount ? (
                      <Box sx={{
                        bgcolor: '#6366f1',
                        color: 'white',
                        borderRadius: '12px',
                        px: 1,
                        py: 0.2,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        mr: 1,
                        boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
                      }}>
                        {room.unreadCount}
                      </Box>
                    ) : null}
                    <IconButton
                      edge="end"
                      aria-label="more"
                      size="small"
                      onClick={(e) => handleMenuOpen(e, room._id)}
                      sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                    <Menu
                      anchorEl={menuAnchor[room._id]}
                      open={Boolean(menuAnchor[room._id])}
                      onClose={() => handleMenuClose(room._id)}
                      onClick={(e) => e.stopPropagation()}
                      PaperProps={{
                        elevation: 0,
                        sx: {
                          borderRadius: 3,
                          mt: 1,
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                          border: '1px solid rgba(0,0,0,0.05)'
                        }
                      }}
                    >
                      <MenuItem
                        onClick={() => handleDeleteClick(room._id)}
                        sx={{ color: "error.main", fontSize: '0.9rem', fontWeight: 500 }}
                      >
                        Delete Chat
                      </MenuItem>
                    </Menu>
                  </Box>
                }
                sx={{
                  px: 2,
                  py: 0.5
                }}
              >
                <ListItemButton
                  selected={activeRoomId === room._id}
                  onClick={() => setActiveRoom(room._id)}
                  sx={{
                    borderRadius: '16px',
                    mb: 0.5,
                    transition: 'all 0.2s ease',
                    "&.Mui-selected": {
                      bgcolor: "rgba(255,255,255,0.6)", // More transparent/dimmer
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transform: 'scale(1.01)',
                      '&:hover': { bgcolor: "rgba(255,255,255,0.7)" }
                    },
                    "&:hover": { bgcolor: "rgba(0,0,0,0.03)" }, // Subtle dark hover instead of white
                  }}
                >
                  <ListItemAvatar>
                    <Box sx={{ position: 'relative' }}>
                      <Avatar
                        alt={otherUser?.name}
                        src={otherUser?.avatar}
                        sx={{
                          width: 52,
                          height: 52,
                          border: activeRoomId === room._id ? '2px solid #6366f1' : '2px solid transparent',
                          transition: 'border 0.2s'
                        }}
                      >
                        {otherUser?.name?.charAt(0)}
                      </Avatar>
                      {isOnline && (
                        <Box sx={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 12,
                          height: 12,
                          bgcolor: '#22c55e',
                          borderRadius: '50%',
                          border: '2px solid white'
                        }} />
                      )}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" fontWeight={activeRoomId === room._id ? "700" : "600"} color="text.primary" noWrap>
                        {otherUser?.name || "Unknown"}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color={room.unreadCount ? "text.primary" : "text.secondary"}
                        fontWeight={room.unreadCount ? "600" : "400"}
                        noWrap
                        sx={{ maxWidth: '85%', opacity: 0.8 }}
                      >
                        {typingUsers[room._id]?.length > 0
                          ? <span style={{ color: '#22c55e', fontWeight: 'bold' }}>typing...</span>
                          : room.lastMessage?.message || "No messages yet"}
                      </Typography>
                    }
                    sx={{ my: 0, ml: 1 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })
        )}
      </List>

      {/* Deletion Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">{"Delete Chat?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this chat? This will permanently
            remove all messages in this conversation. This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            autoFocus
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      {/* <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
          variant="filled"
        >
          Chat deleted successfully!
        </Alert>
      </Snackbar> */}
    </Box>
  );
}
