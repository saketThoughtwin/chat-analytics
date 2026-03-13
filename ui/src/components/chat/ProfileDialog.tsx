"use client";

import React, { useState, useRef, useCallback } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Avatar,
    IconButton,
    Typography,
    CircularProgress,
    Tooltip,
    Snackbar,
    Alert,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Cropper from "react-easy-crop";
import { useAuthStore } from "../../store/authStore";

interface ProfileDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function ProfileDialog({ open, onClose }: ProfileDialogProps) {
    const { user, updateProfile } = useAuthStore();
    const [name, setName] = useState(user?.name || "");
    const [isEditingName, setIsEditingName] = useState(false);
    const [loading, setLoading] = useState(false);
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

    // Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    // Snackbar State
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error" | "warning">("error");

    const showSnackbar = (message: string, severity: "success" | "error" | "warning" = "error") => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleEditNameClick = () => {
        setIsEditingName(true);
    };

    const handleSaveNameClick = () => {
        if (name.trim() === "") {
            setName(user?.name || "");
        }
        setIsEditingName(false);
    };

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file.type.startsWith("image/")) {
                showSnackbar("Please upload an image file.", "warning");
                return;
            }
            const reader = new FileReader();
            reader.addEventListener("load", () =>
                setImageSrc(reader.result?.toString() || null)
            );
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("removeAvatar", "true");
            await updateProfile(formData);
            setImageSrc(null);
        } catch (error) {
            console.error("Failed to remove avatar", error);
            showSnackbar("Failed to remove avatar. Please try again.", "error");
        } finally {
            setRemoveConfirmOpen(false);
            setLoading(false);
        }
    };

    // Helper to get a cropped image File
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
                resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
            }, "image/jpeg");
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            if (name !== user?.name) {
                formData.append("name", name.trim());
            }
            if (imageSrc && croppedAreaPixels) {
                const croppedFile = await getCroppedImage(imageSrc, croppedAreaPixels);
                formData.append("file", croppedFile);
            }

            await updateProfile(formData);
            onClose();
            setImageSrc(null); // Reset crop view
        } catch (error) {
            console.error("Failed to update profile", error);
            showSnackbar("Failed to update profile. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setName(user?.name || "");
        setIsEditingName(false);
        setImageSrc(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#00a884", color: "white" }}>
                <Typography variant="h6" fontWeight="bold">Profile</Typography>
                <IconButton onClick={handleClose} size="small" sx={{ color: "white" }} disabled={loading}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, bgcolor: "#f0f2f5" }}>

                {/* Avatar Section */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, bgcolor: "white" }}>
                <Box sx={{ position: "relative" }}>
                        <Avatar
                            src={imageSrc || user?.avatar}
                            sx={{ width: 140, height: 140, mb: 1, fontSize: "4rem", bgcolor: "#6366f1", cursor: "pointer", "&:hover": { opacity: 0.8 } }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {user?.name?.charAt(0)}
                        </Avatar>
	                        {!!user?.avatar && !imageSrc && (
	                            <Box
	                                sx={{
	                                    position: "absolute",
	                                    bottom: 8,
	                                    right: 8,
	                                    bgcolor: "#ef4444",
	                                    borderRadius: "50%",
	                                    p: 1,
	                                    cursor: loading ? "default" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
	                                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
	                                    opacity: loading ? 0.6 : 1
	                                }}
	                                onClick={() => { if (!loading) setRemoveConfirmOpen(true); }}
	                            >
	                                <DeleteIcon sx={{ color: "white", fontSize: 20 }} />
	                            </Box>
	                        )}
	                        <Box
	                            sx={{
	                                position: "absolute",
	                                bottom: 8,
	                                left: 8,
	                                bgcolor: "#00a884",
	                                borderRadius: "50%",
	                                p: 1,
	                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <PhotoCameraIcon sx={{ color: "white", fontSize: 20 }} />
                        </Box>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: "none" }}
                        />
                    </Box>
                </Box>

                {/* Cropper Section (only visible if an image is selected) */}
                {imageSrc && (
                    <Box sx={{ position: "relative", width: "100%", height: 300, bgcolor: "black" }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </Box>
                )}

                {/* Info Section */}
                <Box sx={{ mt: 2, bgcolor: "white", px: 3, py: 2 }}>

                    {/* Name Field */}
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        Name
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
                        {isEditingName ? (
                            <Box sx={{ display: "flex", w: "100%", alignItems: "center" }}>
                                <TextField
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    variant="standard"
                                    fullWidth
                                    autoFocus
                                    inputProps={{ maxLength: 25 }}
                                    sx={{ "& .MuiInput-underline:after": { borderBottomColor: "#00a884" } }}
                                />
                                <IconButton size="small" onClick={handleSaveNameClick} sx={{ ml: 1, color: "text.secondary" }}>
                                    <CheckIcon />
                                </IconButton>
                            </Box>
                        ) : (
                            <Box sx={{ display: "flex", w: "100%", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                <Typography variant="body1">{name}</Typography>
                                <IconButton size="small" onClick={handleEditNameClick} sx={{ color: "text.secondary" }}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                        This is not your username or pin. This name will be visible to your WhatsApp contacts.
                    </Typography>

                    {/* Email Field (Read Only) */}
                    <Box sx={{ mt: 3, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                            Email
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
                            {user?.email}
                        </Typography>
                    </Box>
                </Box>

            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: "#f0f2f5" }}>
                <Button onClick={handleClose} color="inherit" disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={loading || (name === user?.name && !imageSrc)}
                    sx={{ bgcolor: "#00a884", "&:hover": { bgcolor: "#008f6f" } }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Save"}
                </Button>
            </DialogActions>

            <Dialog
                open={removeConfirmOpen}
                onClose={() => { if (!loading) setRemoveConfirmOpen(false); }}
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle>Remove Photo?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                       Are you sure you want to remove your display profile?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRemoveConfirmOpen(false)} color="inherit" disabled={loading} sx={{ borderRadius: 2 }}>
                        Cancel
                    </Button>
                    <Button onClick={handleRemoveAvatar} color="error" variant="contained" disabled={loading} sx={{ borderRadius: 2, boxShadow: "none" }}>
                        {loading ? <CircularProgress size={18} color="inherit" /> : "Remove"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: "100%" }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Dialog>
    );
}
