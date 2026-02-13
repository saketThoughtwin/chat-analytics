import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Dialog,
    Box,
    IconButton,
    Typography,
    Avatar,
    LinearProgress,
    Button,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import { useChatStore, GroupedStory } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";

interface StoryViewerProps {
    open: boolean;
    onClose: () => void;
    group: GroupedStory;
}

const getViewerTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMins = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMins < 1) return "just now";
    if (diffInMins < 60) return `${diffInMins} min${diffInMins > 1 ? 's' : ''} ago`;

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function StoryViewer({ open, onClose, group }: StoryViewerProps) {
    const { user: currentUser } = useAuthStore();
    const { stories, viewStory, fetchStoryViewers, deleteStory } = useChatStore();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [viewers, setViewers] = useState<any[]>([]);
    const [showViewers, setShowViewers] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentIndexRef = useRef(currentIndex);

    // Keep ref in sync
    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    const currentStory = group.stories[currentIndex];
    const isMyStory = group.user._id === currentUser?.id;

    const STORY_DURATION = 15000; // 15 seconds per story

    // Go to next story
    const goToNext = useCallback(() => {
        const idx = currentIndexRef.current;
        if (idx < group.stories.length - 1) {
            setCurrentIndex(idx + 1);
            setProgress(0);
        } else {
            onClose();
        }
    }, [group.stories.length, onClose]);

    // Go to previous story
    const goToPrev = useCallback(() => {
        const idx = currentIndexRef.current;
        if (idx > 0) {
            setCurrentIndex(idx - 1);
            setProgress(0);
        }
    }, []);

    // 1. Reset state when viewer opens
    useEffect(() => {
        if (open) {
            setProgress(0);
            setShowViewers(false);
            setViewers([]);
            setIsPaused(false);

            // Jump to first unread story
            const firstUnreadIndex = group.stories.findIndex(s => {
                const viewerId = currentUser?.id?.toString();
                return !s.views.some((v: any) => (v.userId?.toString() || v.toString()) === viewerId);
            });
            setCurrentIndex(firstUnreadIndex === -1 ? 0 : firstUnreadIndex);
        }
    }, [open]);

    // 2. Reset progress on index change
    useEffect(() => {
        setProgress(0);
        setViewers([]);
        setShowViewers(false);
    }, [currentIndex]);

    // 3. THE TIMER - runs a simple interval that increments progress
    useEffect(() => {
        // Clear any existing timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (!open || isPaused || showViewers || deleteConfirmOpen) return;

        const step = 100 / (STORY_DURATION / 100); // progress increment per 100ms

        timerRef.current = setInterval(() => {
            setProgress(prev => {
                const next = prev + step;
                return next;
            });
        }, 100);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [open, isPaused, showViewers, deleteConfirmOpen, currentIndex]);

    // 4. Watch progress and advance when it reaches 100
    useEffect(() => {
        if (progress >= 100) {
            goToNext();
        }
    }, [progress, goToNext]);

    // 5. Mark as Viewed
    useEffect(() => {
        if (open && !isMyStory && currentStory && currentUser) {
            const hasViewed = currentStory.views.some((v: any) => (v.userId?.toString() || v.toString()) === currentUser.id.toString());
            if (!hasViewed) {
                viewStory(currentStory._id);
            }
        }
    }, [open, isMyStory, currentStory?._id, viewStory, currentUser]);

    // 6. Fetch Viewers
    useEffect(() => {
        if (open && isMyStory && currentStory) {
            fetchStoryViewers(currentStory._id).then((data) => {
                const unique = data.filter((v: any, index: number, self: any[]) =>
                    index === self.findIndex((t) => t._id === v._id)
                );
                setViewers(unique);
            });
        }
    }, [open, isMyStory, currentStory?._id, fetchStoryViewers, stories]);

    // 7. Video play/pause control
    useEffect(() => {
        if (videoRef.current) {
            if (showViewers || deleteConfirmOpen || isPaused) {
                videoRef.current.pause();
            } else if (open) {
                videoRef.current.play().catch(e => console.log("Auto-play blocked", e));
            }
        }
    }, [showViewers, deleteConfirmOpen, isPaused, open, currentIndex]);

    const handleDelete = async () => {
        if (!currentStory) return;
        setDeleting(true);
        try {
            await deleteStory(currentStory._id);
            setDeleteConfirmOpen(false);
            if (group.stories.length > 1) {
                if (currentIndex >= group.stories.length - 1) {
                    setCurrentIndex(Math.max(0, group.stories.length - 2));
                }
                setProgress(0);
            } else {
                onClose();
            }
        } catch (error) {
            console.error("Delete failed", error);
        } finally {
            setDeleting(false);
        }
    };

    if (!open || !currentStory) return null;

    return (
        <>
            <Dialog
                fullScreen
                open={open}
                onClose={onClose}
                PaperProps={{
                    sx: {
                        bgcolor: "black",
                        color: "white",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        overflow: "hidden",
                    },
                }}
            >
                {/* Progress Bars */}
                <Box
                    sx={{
                        position: "absolute",
                        top: 20,
                        left: 10,
                        right: 10,
                        display: "flex",
                        gap: 1,
                        zIndex: 10,
                    }}
                >
                    {group.stories.map((_, index) => (
                        <LinearProgress
                            key={index}
                            variant="determinate"
                            value={index === currentIndex ? Math.min(progress, 100) : index < currentIndex ? 100 : 0}
                            sx={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                                bgcolor: "rgba(255,255,255,0.3)",
                                "& .MuiLinearProgress-bar": {
                                    bgcolor: "white",
                                },
                            }}
                        />
                    ))}
                </Box>

                {/* Header */}
                <Box
                    sx={{
                        position: "absolute",
                        top: 40,
                        left: 20,
                        right: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        zIndex: 10,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar src={group.user.avatar}>
                            {group.user.name.charAt(0)}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight="600">
                                {group.user.name}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {new Date(currentStory.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: "white" }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: "500px",
                        height: "80vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {currentStory.type === "video" ? (
                        <video
                            key={currentStory._id}
                            ref={videoRef}
                            src={currentStory.mediaUrl}
                            autoPlay
                            muted={false}
                            loop={false}
                            style={{ maxWidth: "100%", maxHeight: "100%" }}
                        />
                    ) : (
                        <img
                            key={currentStory._id}
                            src={currentStory.mediaUrl}
                            alt="Story"
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                    )}
                </Box>

                {/* Navigation Controls */}
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        pointerEvents: "none",
                    }}
                >
                    <Box
                        sx={{ flex: 1, pointerEvents: "auto", cursor: "pointer" }}
                        onClick={goToPrev}
                    />
                    <Box
                        sx={{ flex: 1, pointerEvents: "auto", cursor: "pointer" }}
                        onClick={goToNext}
                    />
                </Box>

                {/* Footer Controls */}
                <Box
                    sx={{
                        position: "absolute",
                        bottom: 30,
                        left: 0,
                        right: 0,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 2,
                        zIndex: 10,
                    }}
                >
                    {isMyStory && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                bgcolor: 'rgba(255,255,255,0.1)',
                                px: 2,
                                py: 0.5,
                                borderRadius: 5
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    cursor: "pointer",
                                }}
                                onClick={() => setShowViewers(!showViewers)}
                            >
                                <VisibilityIcon sx={{ mb: 0.2, fontSize: 20 }} />
                                <Typography variant="caption">{currentStory.views.length}</Typography>
                            </Box>

                            <Box sx={{ width: '1px', height: '20px', bgcolor: 'rgba(255,255,255,0.2)' }} />

                            <IconButton
                                onClick={() => setDeleteConfirmOpen(true)}
                                size="small"
                                sx={{
                                    color: "white",
                                    "&:hover": { color: "#ef4444" }
                                }}
                            >
                                <DeleteIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                        </Box>
                    )}
                </Box>

                {/* Viewers List Drawer */}
                {showViewers && (
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            bgcolor: "white",
                            color: "black",
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            p: 3,
                            maxHeight: "40vh",
                            overflowY: "auto",
                            zIndex: 20,
                        }}
                    >
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                            <Typography variant="h6">Viewed by {viewers.length}</Typography>
                            <IconButton onClick={() => setShowViewers(false)} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {viewers.length === 0 ? (
                                <Typography color="text.secondary" align="center">No views yet</Typography>
                            ) : (
                                viewers.map((viewer) => (
                                    <Box key={viewer._id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                            <Avatar src={viewer.avatar}>{viewer.name.charAt(0)}</Avatar>
                                            <Typography fontWeight="500">{viewer.name}</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {getViewerTime(viewer.viewedAt)}
                                        </Typography>
                                    </Box>
                                ))
                            )}
                        </Box>
                    </Box>
                )}
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Delete status update?</DialogTitle>
                <DialogContent>
                    <Typography>This status update will be deleted for everyone.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
                        {deleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
