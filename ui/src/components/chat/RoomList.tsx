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
  Fab,
  Tabs,
  Tab,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import ChatIcon from "@mui/icons-material/Chat";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import StarIcon from "@mui/icons-material/Star";
import { useRouter } from "next/navigation";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import CreateChatDialog from "./CreateChatDialog";
import StoriesSection from "../stories/StoriesSection";

// Utility function to get relative time
const getRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  // For older messages, show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

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
    fetchAllStarredMessages,
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

  // Header Menu State
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [starredMessagesDialogOpen, setStarredMessagesDialogOpen] =
    useState(false);
  const [starredMessages, setStarredMessages] = useState<any[]>([]);

  // State to force re-render for time updates
  const [, setTimeUpdateTrigger] = useState(0);

  // Tab State
  const [currentTab, setCurrentTab] = useState(0);

  const handleHeaderMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setHeaderMenuAnchor(event.currentTarget);
  };

  const handleHeaderMenuClose = () => {
    setHeaderMenuAnchor(null);
  };

  const handleStarredMessagesClick = async () => {
    handleHeaderMenuClose();
    const msgs = await fetchAllStarredMessages();
    setStarredMessages(msgs);
    setStarredMessagesDialogOpen(true);
  };

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Update relative times every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdateTrigger((prev) => prev + 1);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

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
        position: "relative",
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
              bgcolor: "transparent",
              filter: "drop-shadow(0 4px 6px rgba(99, 102, 241, 0.3))",
            }}
            variant="rounded"
          >
            C
          </Avatar>
          <Typography
            fontWeight="800"
            sx={{
              background: "linear-gradient(45deg, #1e1b4b, #4338ca)",
              backgroundClip: "text",
              textFillColor: "transparent",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}
          >
            Chat-Analytics
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Analytics">
            <IconButton
              onClick={() => router.push("/analytics")}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.5)",
                boxShadow: "none",
                border: "1px solid rgba(0,0,0,0.05)",
                "&:hover": {
                  bgcolor: "white",
                  transform: "translateY(-1px)",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                },
                transition: "all 0.2s",
                width: 36,
                height: 36,
                color: "#6366f1",
              }}
            >
              <AssessmentIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Options">
            <IconButton
              onClick={handleHeaderMenuOpen}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.5)",
                boxShadow: "none",
                border: "1px solid rgba(0,0,0,0.05)",
                color: "text.secondary",
                "&:hover": {
                  bgcolor: "white",
                  transform: "translateY(-1px)",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                },
                transition: "all 0.2s",
                width: 36,
                height: 36,
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={headerMenuAnchor}
            open={Boolean(headerMenuAnchor)}
            onClose={handleHeaderMenuClose}
            PaperProps={{
              elevation: 3,
              sx: { borderRadius: 2, minWidth: 130, mt: 1, },
            }}
          >
            <MenuItem onClick={handleStarredMessagesClick}>
              <StarIcon fontSize="small" sx={{ mr: 1.5, color: "#fbbf24" }} />
              <Typography sx={{ fontSize: "1rem" }}>
                Starred
              </Typography>
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
              <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
              <Typography sx={{ fontSize: "1rem" }}>
                Logout
              </Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 1 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            "& .MuiTab-root": {
              fontWeight: 600,
              color: "text.secondary",
              "&.Mui-selected": {
                color: "#4338ca",
              }
            },
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
              bgcolor: "#4338ca",
            }
          }}
        >
          <Tab label="Chats" />
          <Tab label="Stories" />
        </Tabs>
      </Box>

      <Divider />

      <Box sx={{
        height: "calc(100% - 145px)",
        overflowY: "auto",
        "&::-webkit-scrollbar": {
          width: "4px",
        },
        "&::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "rgba(0,0,0,0.05)",
          borderRadius: "10px",
        },
        "&:hover::-webkit-scrollbar-thumb": {
          background: "rgba(0,0,0,0.1)",
        },
      }}>
        {currentTab === 0 ? (
          <List sx={{ p: 0 }}>
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
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <IconButton
                          edge="end"
                          aria-label="more"
                          size="small"
                          onClick={(e) => handleMenuOpen(e, room._id)}
                          sx={{ opacity: 0.4, "&:hover": { opacity: 1 } }}
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
                              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                              border: "1px solid rgba(0,0,0,0.05)",
                            },
                          }}
                        >
                          <MenuItem
                            onClick={() => handleDeleteClick(room._id)}
                            sx={{
                              color: "error.main",
                              fontSize: "0.9rem",
                              fontWeight: 500,
                            }}
                          >
                            Delete Chat
                          </MenuItem>
                        </Menu>
                      </Box>
                    }
                    sx={{
                      px: 2,
                      py: 0.5,
                    }}
                  >
                    <ListItemButton
                      selected={activeRoomId === room._id}
                      onClick={() => setActiveRoom(room._id)}
                      sx={{
                        borderRadius: "16px",
                        mb: 0.5,
                        transition: "all 0.2s ease",
                        "&.Mui-selected": {
                          bgcolor: "rgba(255,255,255,0.6)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                          transform: "scale(1.01)",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.7)" },
                        },
                        "&:hover": { bgcolor: "rgba(0,0,0,0.03)" },
                      }}
                    >
                      <ListItemAvatar>
                        <Box sx={{ position: "relative" }}>
                          <Avatar
                            alt={otherUser?.name}
                            src={otherUser?.avatar}
                            sx={{
                              width: 52,
                              height: 52,
                              border:
                                activeRoomId === room._id
                                  ? "2px solid #6366f1"
                                  : "2px solid transparent",
                              transition: "border 0.2s",
                            }}
                          >
                            {otherUser?.name?.charAt(0)}
                          </Avatar>
                          {isOnline && (
                            <Box
                              sx={{
                                position: "absolute",
                                bottom: 2,
                                right: 2,
                                width: 12,
                                height: 12,
                                bgcolor: "#22c55e",
                                borderRadius: "50%",
                                border: "2px solid white",
                              }}
                            />
                          )}
                        </Box>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography
                              variant="subtitle1"
                              fontWeight={activeRoomId === room._id ? "700" : "600"}
                              color="text.primary"
                              noWrap
                              sx={{ flex: 1, mr: 1 }}
                            >
                              {otherUser?.name || "Unknown"}
                            </Typography>
                            {(room.lastMessage?.createdAt || (room.lastMessage as any)?.timestamp) && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontSize: "0.7rem",
                                  flexShrink: 0,
                                  opacity: 0.7,
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {getRelativeTime(room.lastMessage!.createdAt || (room.lastMessage as any).timestamp)}
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                            <Typography
                              variant="body2"
                              color={
                                room.unreadCount ? "text.primary" : "text.secondary"
                              }
                              fontWeight={room.unreadCount ? "600" : "400"}
                              noWrap
                              sx={{ flex: 1, mr: 1, opacity: 0.8 }}
                            >
                              {typingUsers[room._id]?.length > 0 ? (
                                <span
                                  style={{ color: "#22c55e", fontWeight: "bold" }}
                                >
                                  typing...
                                </span>
                              ) : room.lastMessage?.deleted ? (
                                room.lastMessage.sender === currentUser?.id || room.lastMessage.read ? (
                                  ""
                                ) : (
                                  <span style={{ fontStyle: "italic", opacity: 0.7 }}>
                                    This message was deleted
                                  </span>
                                )
                              ) : (room as any).lastMessagePreview ? (
                                (room as any).lastMessagePreview
                              ) : room.lastMessage?.type === "audio" ? (
                                "🎤 Voice message"
                              ) : (
                                room.lastMessage?.message || "No messages yet"
                              )}
                            </Typography>
                            {(room.unreadCount ?? 0) > 0 && (
                              <Box
                                sx={{
                                  bgcolor: "#6366f1",
                                  color: "white",
                                  borderRadius: "12px",
                                  px: 0.8,
                                  py: 0.2,
                                  minWidth: "18px",
                                  height: "18px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.7rem",
                                  fontWeight: "bold",
                                  boxShadow: "0 2px 4px rgba(99, 102, 241, 0.3)",
                                  flexShrink: 0
                                }}
                              >
                                {room.unreadCount}
                              </Box>
                            )}
                          </Box>
                        }
                        sx={{ my: 0, ml: 1, pr: 1 }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })
            )}
          </List>
        ) : (
          <StoriesSection />
        )}
      </Box>

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

      {/* Starred Messages Dialog */}
      <Dialog
        open={starredMessagesDialogOpen}
        onClose={() => setStarredMessagesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, height: "60vh" },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StarIcon sx={{ color: "#fbbf24" }} />
          Starred Messages
        </DialogTitle>
        <DialogContent dividers>
          {starredMessages.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                opacity: 0.6,
              }}
            >
              <StarIcon sx={{ fontSize: 48, mb: 2, color: "#e2e8f0" }} />
              <Typography color="text.secondary">
                No starred messages found.
              </Typography>
            </Box>
          ) : (
            <List>
              {starredMessages.map((msg) => (
                <ListItem
                  key={msg._id}
                  alignItems="flex-start"
                  sx={{ bgcolor: "rgba(0,0,0,0.02)", mb: 1, borderRadius: 2 }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {msg.message ||
                          (msg.type === "image"
                            ? "📷 Photo"
                            : msg.type === "video"
                              ? "🎥 Video"
                              : msg.type === "audio"
                                ? "🎤 Voice message"
                                : "Media")}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: "block" }}
                      >
                        {new Date(msg.createdAt).toLocaleString()}
                      </Typography>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      // Optional: Navigate to chat or unstar
                    }}
                  >
                    <StarIcon fontSize="small" sx={{ color: "#fbbf24" }} />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStarredMessagesDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <CreateChatDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />

      {/* Floating Action Button for New Chat */}
      {currentTab === 0 && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            position: "absolute",
            bottom: 24,
            right: 24,
            width: 44,
            height: 44,
            minHeight: 44,
            bgcolor: "#6366f1",
            "&:hover": {
              bgcolor: "#4f46e5",
              transform: "scale(1.1)",
            },
            transition: "all 0.2s",
            boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
          }}
        >
          <Box
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChatIcon sx={{ fontSize: 28 }} />
            <AddIcon
              sx={{
                position: "absolute",
                fontSize: 14,
                color: "#6366f1",
                bgcolor: "white",
                borderRadius: "50%",
                p: 0.1,
                top: 2,
                right: -2,
                border: "1px solid #6366f1",
              }}
            />
          </Box>
        </Fab>
      )}
    </Box>
  );
}
