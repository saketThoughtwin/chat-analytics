"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Avatar,
  List,
  ListItem,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { useRouter } from "next/navigation";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";

export default function MessageWindow() {
  const {
    activeRoomId,
    messages,
    sendMessage,
    rooms,
    typingUsers,
    setActiveRoom,
    onlineUsers,
    loading,
    loadingMore,
    hasMore,
    loadMoreMessages,
  } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const router = useRouter();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldScrollRef = useRef(true);
  const isInitialLoadRef = useRef(true);

  const activeRoom = rooms.find((r) => r._id === activeRoomId);
  const otherUser = activeRoom?.participants.find(
    (p: any) => (p._id || p) !== currentUser?.id,
  );

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (isInitialLoadRef.current) {
      container.scrollTop = container.scrollHeight;
      isInitialLoadRef.current = false;
      return;
    }

    if (shouldScrollRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Reset scroll behavior when room changes
  useEffect(() => {
    shouldScrollRef.current = true;
    isInitialLoadRef.current = true;
  }, [activeRoomId]);

  // Mark as read only when activeRoomId changes or when new messages arrive from others
  useEffect(() => {
    if (activeRoomId) {
      const hasUnreadFromOthers = messages.some(
        (m) =>
          m.roomId === activeRoomId && !m.read && m.sender !== currentUser?.id,
      );
      if (hasUnreadFromOthers) {
        useChatStore.getState().markAsRead(activeRoomId);
      }
    }
  }, [activeRoomId, messages, currentUser?.id]);

  const handleSend = async () => {
    if (!input.trim() || !activeRoomId) return;
    const message = input;
    setInput("");
    shouldScrollRef.current = true;
    sendMessage(activeRoomId, message);
    const socket = getSocket();
    socket.emit("stop_typing", { roomId: activeRoomId });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (!activeRoomId) return;
    const socket = getSocket();
    socket.emit("typing", { roomId: activeRoomId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { roomId: activeRoomId });
    }, 1000);
  };
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      120;

    shouldScrollRef.current = isNearBottom;

    if (container.scrollTop < 50 && hasMore && !loadingMore && activeRoomId) {
      const prevHeight = container.scrollHeight;

      loadMoreMessages(activeRoomId).then(() => {
        requestAnimationFrame(() => {
          const newHeight = container.scrollHeight;
          container.scrollTop = newHeight - prevHeight;
        });
      });
    }
  };

  if (!activeRoomId) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f0f2f5",
          textAlign: "center",
          p: 3,
        }}
      >
        <Box
          component="img"
          src="/desktop.png"
          alt="Welcome"
          sx={{
            width: "100%",
            maxWidth: 400,
            mb: 4,
            opacity: 0.8,
          }}
        />
        <Typography
          variant="h4"
          fontWeight="300"
          color="textPrimary"
          gutterBottom
        >
          Chat Analytics
        </Typography>
        <Typography
          variant="body1"
          color="textSecondary"
          sx={{ maxWidth: 500 }}
        >
          Send and receive messages without keeping your phone online.
        </Typography>
        <Box
          sx={{
            mt: "auto",
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "textSecondary",
          }}
        >
          <DoneAllIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption">End-to-end encrypted</Typography>
        </Box>
      </Box>
    );
  }

  const typingInRoom = typingUsers[activeRoomId] || [];
  const isOtherTyping = typingInRoom.includes(otherUser?._id);
  const isOnline = otherUser?._id && onlineUsers.includes(otherUser._id);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Initial Loading Loader */}
      <Backdrop
        sx={{ position: "absolute", backgroundColor: "rgba(0,0,0,0.05)" }}
        open={loading}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            backgroundColor: "transparent",
            boxShadow: "none",
          }}
        >
          <CircularProgress color="inherit" sx={{ opacity: 0.4 }} />
          <Typography variant="body1">Loading messages...</Typography>
        </Box>
      </Backdrop>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          bgcolor: "rgba(248, 250, 252, 0.8)", // Dimmer header
          backdropFilter: 'blur(10px)',
          height: 80,
          zIndex: 2,
          borderBottom: '1px solid rgba(0,0,0,0.06)'
        }}
      >
        <IconButton
          onClick={() => {
            setActiveRoom(null);
            router.push("/");
          }}
          sx={{ mr: 1, display: { xs: "flex", md: "none" } }}
          size="small"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ position: 'relative', mr: 2 }}>
          <Avatar
            alt={otherUser?.name}
            src={otherUser?.avatar}
            sx={{ width: 44, height: 44 }}
          >
            {otherUser?.name?.charAt(0)}
          </Avatar>
          {isOnline && (
            <Box sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              bgcolor: '#22c55e',
              borderRadius: '50%',
              border: '2px solid white'
            }} />
          )}
        </Box>
        <Box>
          <Typography variant="h6" fontWeight="700" lineHeight={1.2}>
            {otherUser?.name}
          </Typography>
          {isOtherTyping ? (
            <Typography variant="caption" sx={{ color: "#6366f1", fontWeight: "600" }}>
              typing...
            </Typography>
          ) : isOnline ? (
            <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: '500' }}>
              Active now
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Offline
            </Typography>
          )}
        </Box>
      </Box>

      {/* Messages */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 3,
          bgcolor: "transparent", // Let the gradient shine through or keep white
        }}
      >
        {loadingMore && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages?.map((msg) => {
            const isMe = msg.sender === currentUser?.id;
            return (
              <ListItem
                key={msg._id}
                sx={{
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                  p: 0,
                  width: '100%'
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: '10px 16px',
                    maxWidth: "70%",
                    // Gradient for me, slightly dimmer white/gray for them
                    background: isMe ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "#ffffff",
                    color: isMe ? 'white' : '#1e293b',
                    borderRadius: '20px', // Pill shape
                    borderBottomRightRadius: isMe ? '4px' : '20px',
                    borderBottomLeftRadius: isMe ? '20px' : '4px',
                    boxShadow: isMe ? '0 4px 15px rgba(99, 102, 241, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)', // Softer shadow
                    border: isMe ? 'none' : '1px solid rgba(0,0,0,0.03)' // Subtle border for received
                  }}
                >
                  <Typography variant="body1" sx={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {msg.message}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      mt: 0.5,
                      gap: 0.5,
                      minWidth: 60,
                      opacity: 0.8
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="inherit"
                      sx={{ fontSize: '0.7rem' }}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                    {isMe &&
                      (msg.pending ? (
                        <DoneIcon
                          sx={{ fontSize: 14, color: "inherit", opacity: 0.5 }}
                        />
                      ) : msg.read ? (
                        <DoneAllIcon sx={{ fontSize: 14, color: "#00e5ff", filter: 'drop-shadow(0 0 2px rgba(0,229,255,0.5))' }} />
                      ) : msg.delivered ? (
                        <DoneAllIcon sx={{ fontSize: 14, color: "inherit", opacity: 0.8 }} />
                      ) : (
                        <DoneIcon sx={{ fontSize: 14, color: "inherit", opacity: 0.8 }} />
                      ))}
                  </Box>
                </Paper>
              </ListItem>
            );
          })}
          <div ref={messagesEndRef} />
        </List>
      </Box>

      {/* Input */}
      <Box
        sx={{
          p: 3,
          bgcolor: "transparent",
          position: 'relative',
          zIndex: 2
        }}
      >
        <Box sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: 'rgba(255,255,255,0.8)', // Slightly less opaque
          backdropFilter: 'blur(10px)',
          p: 1,
          borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)', // Softer shadow
          border: '1px solid rgba(255,255,255,0.4)'
        }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            variant="standard"
            InputProps={{ disableUnderline: true }}
            value={input}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            sx={{
              px: 2,
              '& input': { fontSize: '0.95rem' }
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!input.trim()}
            sx={{
              bgcolor: input.trim() ? '#6366f1' : 'rgba(0,0,0,0.05)',
              color: 'white',
              '&:hover': { bgcolor: '#4f46e5' },
              width: 44,
              height: 44,
              borderRadius: '18px',
              transition: 'all 0.2s',
              transform: input.trim() ? 'scale(1)' : 'scale(0.95)'
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
