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
  Popover,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import VideocamIcon from "@mui/icons-material/Videocam";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import { useRouter } from "next/navigation";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Slider } from "@mui/material";

// Custom Audio Player Component for stable UI
const CustomAudioPlayer = ({ src, isMe }: { src: string; isMe: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [previousVolume, setPreviousVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (_: any, newValue: number | number[]) => {
    if (audioRef.current) {
      const time = newValue as number;
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (_: any, newValue: number | number[]) => {
    const newVolume = newValue as number;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (volume > 0) {
        setPreviousVolume(volume);
        setVolume(0);
        audioRef.current.volume = 0;
      } else {
        const targetVol = previousVolume === 0 ? 1 : previousVolume;
        setVolume(targetVol);
        audioRef.current.volume = targetVol;
      }
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      width: '100%',
      minWidth: { xs: '200px', sm: '220px' },
      py: 0.2
    }}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <IconButton
        onClick={togglePlay}
        size="small"
        sx={{
          bgcolor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.1)',
          color: isMe ? 'white' : '#6366f1',
          '&:hover': { bgcolor: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(99, 102, 241, 0.2)' }
        }}
      >
        {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
        <Slider
          size="small"
          value={currentTime}
          max={duration || 100}
          onChange={handleSliderChange}
          sx={{
            color: isMe ? 'white' : '#6366f1',
            height: 3,
            padding: '11px 0',
            '& .MuiSlider-thumb': {
              width: 10,
              height: 10,
              transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
              '&:before': { boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)' },
              '&:hover, &.Mui-focusVisible': {
                boxShadow: `0px 0px 0px 6px ${isMe ? 'rgba(255,255,255,0.16)' : 'rgba(99, 102, 241, 0.16)'}`,
              },
              '&.Mui-active': { width: 14, height: 14 },
            },
            '& .MuiSlider-rail': { opacity: 0.28 },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.8, color: 'inherit' }}>
            {formatTime(currentTime)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.8, color: 'inherit' }}>
            {formatTime(duration)}
          </Typography>
        </Box>
      </Box>

      <Box
        onMouseEnter={() => setShowVolume(true)}
        onMouseLeave={() => setShowVolume(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          ml: 1,
          position: 'relative',
          transition: 'all 0.3s ease'
        }}
      >
        <IconButton
          size="small"
          onClick={toggleMute}
          sx={{
            color: isMe ? 'white' : '#6366f1',
            opacity: 0.8,
            p: 0.4
          }}
        >
          {volume === 0 ? <VolumeOffIcon sx={{ fontSize: 14 }} /> : volume < 0.5 ? <VolumeDownIcon sx={{ fontSize: 14 }} /> : <VolumeUpIcon sx={{ fontSize: 14 }} />}
        </IconButton>

        <Box sx={{
          width: showVolume ? { xs: 40, sm: 60 } : 0,
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Slider
            size="small"
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            sx={{
              width: { xs: 32, sm: 45 },
              color: isMe ? 'white' : '#6366f1',
              height: 2,
              mx: 0.5,
              '& .MuiSlider-thumb': {
                width: 6,
                height: 6,
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: `0px 0px 0px 3px ${isMe ? 'rgba(255,255,255,0.16)' : 'rgba(99, 102, 241, 0.16)'}`,
                },
              },
              '& .MuiSlider-rail': { opacity: 0.28 },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

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
    sendMedia,
  } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const router = useRouter();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldScrollRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setIsRecordingVideo(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
          sendMedia(activeRoomId!, file);
          closeCamera();
        }
      }, "image/jpeg");
    }
  };

  const startVideoRecording = () => {
    if (cameraStream) {
      const mimeTypes = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
      const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || "";

      const mediaRecorder = new MediaRecorder(cameraStream, supportedType ? { mimeType: supportedType } : {});
      videoMediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = videoMediaRecorderRef.current?.mimeType || "video/mp4";
        const extension = mimeType.split('/')[1].split(';')[0] || 'mp4';
        const videoBlob = new Blob(videoChunksRef.current, { type: mimeType });
        const file = new File([videoBlob], `video-${Date.now()}.${extension}`, { type: mimeType });
        sendMedia(activeRoomId!, file);
        closeCamera();
      };

      mediaRecorder.start();
      setIsRecordingVideo(true);
    }
  };

  const stopVideoRecording = () => {
    if (videoMediaRecorderRef.current && isRecordingVideo) {
      videoMediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
        sendMedia(activeRoomId!, file);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleEmojiOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiClose = () => {
    setEmojiAnchorEl(null);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  const openEmoji = Boolean(emojiAnchorEl);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = (url: string, filename: string) => {
    // For Cloudinary, we can add fl_attachment to force download
    const downloadUrl = url.includes('cloudinary.com')
      ? url.replace('/upload/', '/upload/fl_attachment/')
      : url;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                    minWidth: msg.message?.startsWith("data:audio/") ? { xs: '210px', sm: '250px' } : 'auto',
                    // Gradient for me, slightly dimmer white/gray for them
                    background: isMe ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "#fff9f0",
                    color: isMe ? 'white' : '#1e293b',
                    borderRadius: '20px', // Pill shape
                    borderBottomRightRadius: isMe ? '4px' : '20px',
                    borderBottomLeftRadius: isMe ? '20px' : '4px',
                    boxShadow: isMe ? '0 4px 15px rgba(99, 102, 241, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)', // Softer shadow
                    border: isMe ? 'none' : '1px solid rgba(255, 243, 224, 0.5)', // Subtle border for received
                    overflow: 'hidden'
                  }}
                >
                  <Typography variant="body1" sx={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {msg.type === 'image' || (msg.mediaUrl && (msg.mediaUrl.includes('.jpg') || msg.mediaUrl.includes('.png') || msg.mediaUrl.includes('.jpeg') || msg.mediaUrl.includes('.webp'))) ? (
                      <Box sx={{ position: 'relative' }}>
                        <Box
                          component="img"
                          src={msg.mediaUrl}
                          alt="Shared image"
                          sx={{
                            width: '100%',
                            maxWidth: '300px',
                            borderRadius: '12px',
                            display: 'block',
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(msg.mediaUrl, '_blank')}
                        />
                        {!isMe && (
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(msg.mediaUrl!, `image-${msg._id}.jpg`)}
                            sx={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              bgcolor: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                            }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    ) : msg.type === 'video' || (msg.mediaUrl && (msg.mediaUrl.includes('.mp4') || msg.mediaUrl.includes('.mov') || msg.mediaUrl.includes('.avi') || msg.mediaUrl.includes('.webm'))) ? (
                      <Box sx={{ position: 'relative' }}>
                        <Box
                          component="video"
                          src={msg.mediaUrl}
                          controls
                          sx={{
                            width: '100%',
                            maxWidth: '300px',
                            borderRadius: '12px',
                            display: 'block'
                          }}
                        />
                        {!isMe && (
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(msg.mediaUrl!, `video-${msg._id}.mp4`)}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              bgcolor: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                              zIndex: 1
                            }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    ) : msg.type === 'audio' || msg.message?.startsWith("data:audio/") ? (
                      <CustomAudioPlayer src={msg.mediaUrl || msg.message} isMe={isMe} />
                    ) : msg.mediaUrl ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Media file: {msg.mediaUrl.split('/').pop()}
                        </Typography>
                        {!isMe && (
                          <IconButton size="small" onClick={() => handleDownload(msg.mediaUrl!, 'file')}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    ) : (
                      msg.message
                    )}
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
                      ) : (msg.read || msg.readAt) ? (
                        <DoneAllIcon sx={{ fontSize: 14, color: "#00e5ff", filter: 'drop-shadow(0 0 2px rgba(0,229,255,0.5))' }} />
                      ) : (msg.delivered || msg.deliveredAt) ? (
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
            placeholder={isRecording ? "Recording..." : "Type a message..."}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            value={isRecording ? "" : input}
            onChange={handleTyping}
            disabled={isRecording}
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
          {isRecording && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, color: '#ef4444' }}>
              <FiberManualRecordIcon sx={{ fontSize: 12, animation: 'pulse 1.5s infinite' }} />
              <Typography variant="body2" fontWeight="600">
                {formatTime(recordingTime)}
              </Typography>
              <style>
                {`
                  @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                  }
                `}
              </style>
            </Box>
          )}
          <IconButton
            onClick={openCamera}
            disabled={isRecording}
            sx={{
              color: 'text.secondary',
              transition: 'all 0.2s',
              '&:hover': { color: '#6366f1' }
            }}
          >
            <CameraAltIcon fontSize="medium" />
          </IconButton>
          <IconButton
            onClick={handleEmojiOpen}
            disabled={isRecording}
            sx={{
              color: openEmoji ? '#6366f1' : 'text.secondary',
              transition: 'all 0.2s',
              '&:hover': { color: '#6366f1' }
            }}
          >
            <EmojiEmotionsIcon fontSize="medium" />
          </IconButton>
          <Popover
            open={openEmoji}
            anchorEl={emojiAnchorEl}
            onClose={handleEmojiClose}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                border: 'none',
                mt: -1
              }
            }}
          >
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              autoFocusSearch={false}
              theme={"light" as any}
              width={320}
              height={400}
              skinTonesDisabled
              searchPlaceHolder="Search emoji..."
            />
          </Popover>
          {input.trim() || isRecording ? (
            <IconButton
              onClick={isRecording ? stopRecording : handleSend}
              sx={{
                bgcolor: '#6366f1',
                color: 'white',
                '&:hover': { bgcolor: '#4f46e5' },
                width: 44,
                height: 44,
                borderRadius: '18px',
                transition: 'all 0.2s',
              }}
            >
              {isRecording ? <StopIcon fontSize="small" /> : <SendIcon fontSize="small" />}
            </IconButton>
          ) : (
            <IconButton
              onClick={startRecording}
              sx={{
                bgcolor: 'rgba(0,0,0,0.05)',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.1)', color: '#6366f1' },
                width: 44,
                height: 44,
                borderRadius: '18px',
                transition: 'all 0.2s',
              }}
            >
              <MicIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Camera Modal */}
      {isCameraOpen && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.9)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}
        >
          <IconButton
            onClick={closeCamera}
            sx={{ position: 'absolute', top: 20, right: 20, color: 'white' }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ position: 'relative', width: '100%', maxWidth: 640, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', display: 'block' }}
            />
            {isRecordingVideo && (
              <Box sx={{ position: 'absolute', top: 20, left: 20, display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444', bgcolor: 'rgba(0,0,0,0.5)', px: 1.5, py: 0.5, borderRadius: '20px' }}>
                <FiberManualRecordIcon sx={{ fontSize: 12, animation: 'pulse 1.5s infinite' }} />
                <Typography variant="caption" fontWeight="700">REC</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 4, display: 'flex', gap: 3 }}>
            {!isRecordingVideo ? (
              <>
                <IconButton
                  onClick={capturePhoto}
                  sx={{
                    bgcolor: 'white',
                    color: '#1e293b',
                    width: 64,
                    height: 64,
                    '&:hover': { bgcolor: '#f1f5f9' }
                  }}
                >
                  <CameraAltIcon fontSize="large" />
                </IconButton>
                <IconButton
                  onClick={startVideoRecording}
                  sx={{
                    bgcolor: '#ef4444',
                    color: 'white',
                    width: 64,
                    height: 64,
                    '&:hover': { bgcolor: '#dc2626' }
                  }}
                >
                  <VideocamIcon fontSize="large" />
                </IconButton>
              </>
            ) : (
              <IconButton
                onClick={stopVideoRecording}
                sx={{
                  bgcolor: 'white',
                  color: '#ef4444',
                  width: 64,
                  height: 64,
                  '&:hover': { bgcolor: '#f1f5f9' }
                }}
              >
                <StopIcon fontSize="large" />
              </IconButton>
            )}
          </Box>
          <Typography sx={{ color: 'white', mt: 2, opacity: 0.7 }}>
            {isRecordingVideo ? "Recording video..." : "Capture a photo or record a video"}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
