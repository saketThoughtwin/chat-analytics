import React, { useState, useEffect, useCallback } from "react";
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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const { stories, viewStory, fetchStoryViewers, deleteStory } = useChatStore();
    const { user: currentUser } = useAuthStore();
    const [viewers, setViewers] = useState<any[]>([]);
    const [showViewers, setShowViewers] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const duration = 5000;

    useEffect(() => {
        if (open) {
            setProgress(0);
            setShowViewers(false);
            setViewers([]);
            // Basic safety index check
            if (currentIndex >= group.stories.length) {
                setCurrentIndex(0);
            }
        }
    }, [open, currentIndex, group.stories.length]);

    const currentStory = group.stories[currentIndex];
    const isMyStory = group.user._id === currentUser?.id;

    useEffect(() => {
        if (open && !isMyStory && currentStory && currentUser) {
            const hasViewed = currentStory.views.some((v: any) => (v.userId?.toString() || v.toString()) === currentUser.id.toString());
            if (!hasViewed) {
                viewStory(currentStory._id);
            }
        }
    }, [open, isMyStory, currentStory?._id, viewStory, currentUser]);

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

    const nextStory = useCallback(() => {
        if (currentIndex < group.stories.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setProgress(0);
        } else {
            onClose();
        }
    }, [currentIndex, group.stories.length, onClose]);

    const prevStory = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
            setProgress(0);
        }
    };

    useEffect(() => {
        if (!open || showViewers || deleteConfirmOpen) return;

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    nextStory();
                    return 0;
                }
                return prev + (100 / (duration / 100));
            });
        }, 100);

        return () => clearInterval(interval);
    }, [open, nextStory, showViewers, deleteConfirmOpen]);

    const videoRef = React.useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            if (showViewers || deleteConfirmOpen) {
                videoRef.current.pause();
            } else if (open) {
                videoRef.current.play().catch(e => console.log("Auto-play blocked", e));
            }
        }
    }, [showViewers, deleteConfirmOpen, open]);

    const handleDelete = async () => {
        if (!currentStory) return;
        setDeleting(true);
        try {
            await deleteStory(currentStory._id);
            setDeleteConfirmOpen(false);
            if (group.stories.length > 1) {
                // Remove current story from UI immediately or let store update reflect
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
                            value={index === currentIndex ? progress : index < currentIndex ? 100 : 0}
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
                            ref={videoRef}
                            src={currentStory.mediaUrl}
                            autoPlay={!showViewers && !deleteConfirmOpen}
                            loop={false}
                            onEnded={nextStory}
                            style={{ maxWidth: "100%", maxHeight: "100%" }}
                        />
                    ) : (
                        <img
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
                        onClick={prevStory}
                    />
                    <Box
                        sx={{ flex: 1, pointerEvents: "auto", cursor: "pointer" }}
                        onClick={nextStory}
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
                        gap: 4,
                        zIndex: 10,
                    }}
                >
                    {isMyStory && (
                        <IconButton
                            onClick={() => setDeleteConfirmOpen(true)}
                            sx={{
                                color: "white",
                                bgcolor: "rgba(255,255,255,0.1)",
                                "&:hover": { bgcolor: "rgba(255,0,0,0.2)" }
                            }}
                        >
                            <DeleteIcon />
                        </IconButton>
                    )}

                    {isMyStory && (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                cursor: "pointer",
                            }}
                            onClick={() => setShowViewers(!showViewers)}
                        >
                            <VisibilityIcon sx={{ mb: 0.5 }} />
                            <Typography variant="body2">{currentStory.views.length}</Typography>
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
