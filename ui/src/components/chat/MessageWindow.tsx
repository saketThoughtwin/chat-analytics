"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const activeRoom = rooms.find((r) => r._id === activeRoomId);
  const otherUser = activeRoom?.participants.find(
    (p: any) => (p._id || p) !== currentUser?.id,
  );

  const scrollToBottom = () => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [messages]);

  // Reset scroll behavior when room changes
  useEffect(() => {
    setShouldScrollToBottom(true);
  }, [activeRoomId]);

  // Mark as read only when activeRoomId changes or when new messages arrive from others
  useEffect(() => {
    if (activeRoomId) {
      const hasUnreadFromOthers = messages.some(
        (m) => m.roomId === activeRoomId && !m.read && m.sender !== currentUser?.id
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
    setShouldScrollToBottom(true);
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

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop === 0 && hasMore && !loadingMore && activeRoomId) {
      const previousHeight = container.scrollHeight;
      await loadMoreMessages(activeRoomId);
      // Maintain scroll position after loading more
      setTimeout(() => {
        container.scrollTop = container.scrollHeight - previousHeight;
      }, 0);
      setShouldScrollToBottom(false);
    } else {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShouldScrollToBottom(isNearBottom);
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
        <Typography variant="h4" fontWeight="300" color="textPrimary" gutterBottom>
          Chat Analytics
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 500 }}>
          Send and receive messages without keeping your phone online.
        </Typography>
        <Box sx={{ mt: "auto", display: "flex", alignItems: "center", gap: 1, color: "textSecondary" }}>
          <DoneAllIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption">
            End-to-end encrypted
          </Typography>
        </Box>
      </Box>
    );
  }

  const typingInRoom = typingUsers[activeRoomId] || [];
  const isOtherTyping = typingInRoom.includes(otherUser?._id);
  const isOnline = otherUser?._id && onlineUsers.includes(otherUser._id);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Initial Loading Loader */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, position: 'absolute' }}
        open={loading}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress color="inherit" />
          <Typography variant="body1">Loading messages...</Typography>
        </Box>
      </Backdrop>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          bgcolor: "background.paper",
        }}
      >
        <IconButton
          onClick={() => {
            setActiveRoom(null);
            router.push("/");
          }}
          sx={{ mr: 1, display: { xs: "flex", md: "flex" } }}
          size="small"
        >
          <ArrowBackIcon />
        </IconButton>
        <Avatar alt={otherUser?.name} src={otherUser?.avatar} sx={{ mr: 2 }}>
          {otherUser?.name?.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {otherUser?.name}
          </Typography>
          {isOtherTyping ? (
            <Typography variant="caption" sx={{ color: "#25D366", fontWeight: "bold" }}>
              typing...
            </Typography>
          ) : isOnline ? (
            <Typography variant="caption" color="primary">
              online
            </Typography>
          ) : null}
        </Box>
      </Box>

      {/* Messages */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{ flexGrow: 1, overflowY: "auto", p: 2, bgcolor: "#f0f2f5" }}
      >
        {loadingMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        <List>
          {messages?.map((msg) => {
            const isMe = msg.sender === currentUser?.id;
            return (
              <ListItem
                key={msg._id}
                sx={{
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                  mb: 1,
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    maxWidth: "70%",
                    bgcolor: isMe ? "#dcf8c6" : "white",
                    borderRadius: isMe
                      ? "15px 15px 0 15px"
                      : "15px 15px 15px 0",
                  }}
                >
                  <Typography variant="body1">{msg.message}</Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      mt: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ mr: 0.5 }}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                    {isMe && (
                      msg.pending ? (
                        <DoneIcon sx={{ fontSize: 16, color: "gray", opacity: 0.5 }} />
                      ) : msg.read ? (
                        <DoneAllIcon sx={{ fontSize: 16, color: "#34b7f1" }} />
                      ) : msg.delivered ? (
                        <DoneAllIcon sx={{ fontSize: 16, color: "gray" }} />
                      ) : (
                        <DoneIcon sx={{ fontSize: 16, color: "gray" }} />
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
      <Box
        sx={{
          p: 2,
          bgcolor: "background.paper",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            variant="outlined"
            size="small"
            value={input}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            sx={{ mr: 1 }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
