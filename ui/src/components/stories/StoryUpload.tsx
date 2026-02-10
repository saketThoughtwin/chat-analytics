import React, { useState, useRef } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    CircularProgress,
    IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideoCameraBackIcon from "@mui/icons-material/VideoCameraBack";
import { useChatStore } from "../../store/chatStore";

interface StoryUploadProps {
    open: boolean;
    onClose: () => void;
}

export default function StoryUpload({ open, onClose }: StoryUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { postStory } = useChatStore();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            await postStory(file);
            onClose();
            setFile(null);
            setPreview(null);
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setLoading(false);
        }
    };

    const cleanUp = () => {
        setFile(null);
        setPreview(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={cleanUp} fullWidth maxWidth="xs">
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    Add Story
                    <IconButton onClick={cleanUp} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        width: "100%",
                        height: 300,
                        bgcolor: "#f0f2f5",
                        borderRadius: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative",
                        cursor: "pointer",
                    }}
                    onClick={() => !loading && fileInputRef.current?.click()}
                >
                    {preview ? (
                        file?.type.startsWith("video") ? (
                            <video
                                src={preview}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        ) : (
                            <img
                                src={preview}
                                alt="Preview"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        )
                    ) : (
                        <>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <PhotoCameraIcon sx={{ fontSize: 40, color: "#6366f1" }} />
                                <VideoCameraBackIcon sx={{ fontSize: 40, color: "#6366f1" }} />
                            </Box>
                            <Typography color="text.secondary">
                                Select Photo or Video
                            </Typography>
                        </>
                    )}

                    {loading && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                bgcolor: "rgba(255,255,255,0.7)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    )}
                </Box>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    style={{ display: "none" }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={cleanUp} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleUpload}
                    variant="contained"
                    disabled={!file || loading}
                    sx={{ bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
                >
                    Post Story
                </Button>
            </DialogActions>
        </Dialog>
    );
}
