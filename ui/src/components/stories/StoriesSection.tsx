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
    IconButton,
    ListItemButton,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import StoryUpload from "./StoryUpload";
import StoryViewer from "./StoryViewer";
import Spinner from "../ui/Spinner";

const SegmentedAvatar = ({ src, name, count, hasUnread = true }: { src?: string, name: string, count: number, hasUnread?: boolean }) => {
    if (count <= 1) {
        return (
            <Avatar
                src={src}
                sx={{
                    width: 50,
                    height: 50,
                    border: count > 0 ? "2px solid #6366f1" : "none",
                    p: count > 0 ? 0.3 : 0,
                }}
            >
                {name.charAt(0)}
            </Avatar>
        );
    }

    const size = 50;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const gap = 4; // gap in pixels
    const segmentLength = (circumference / count) - gap;

    return (
        <Box sx={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={size} height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
                {Array.from({ length: count }).map((_, i) => (
                    <circle
                        key={i}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                        strokeDashoffset={-i * (circumference / count)}
                        strokeLinecap="round"
                    />
                ))}
            </svg>
            <Avatar src={src} sx={{ width: size - 8, height: size - 8 }}>
                {name.charAt(0)}
            </Avatar>
        </Box>
    );
};

export default function StoriesSection() {
    const { stories, fetchStories, loadingStories } = useChatStore();
    const { user: currentUser } = useAuthStore();
    const [uploadOpen, setUploadOpen] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    useEffect(() => {
        fetchStories();
    }, [fetchStories]);

    const myGroup = stories.find((g) => g.user._id === currentUser?.id);
    const otherGroups = stories.filter((g) => g.user._id !== currentUser?.id);

    const handleOpenViewer = (group: any) => {
        setSelectedGroup(group);
        setViewerOpen(true);
    };

    if (loadingStories && stories.length === 0) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <Spinner size={32} className="text-indigo-600" />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 0 }}>
            <List>
                {/* My Story */}
                <ListItem disablePadding>
                    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                        <ListItemButton
                            onClick={myGroup ? () => handleOpenViewer(myGroup) : () => setUploadOpen(true)}
                            sx={{ flexGrow: 1 }}
                        >
                            <ListItemAvatar>
                                <Box sx={{ position: "relative" }}>
                                    <SegmentedAvatar
                                        src={currentUser?.avatar}
                                        name={currentUser?.name || ""}
                                        count={myGroup?.stories.length || 0}
                                    />
                                    {!myGroup && (
                                        <AddCircleIcon
                                            sx={{
                                                position: "absolute",
                                                bottom: -2,
                                                right: -2,
                                                color: "#6366f1",
                                                bgcolor: "white",
                                                borderRadius: "50%",
                                                fontSize: 20,
                                            }}
                                        />
                                    )}
                                </Box>
                            </ListItemAvatar>
                            <ListItemText
                                primary="My Status"
                                secondary={myGroup ? "Tap to view" : "Tap to add status update"}
                                primaryTypographyProps={{ fontWeight: 600 }}
                            />
                        </ListItemButton>
                        {myGroup && (
                            <IconButton
                                onClick={() => setUploadOpen(true)}
                                color="primary"
                                sx={{ mr: 1 }}
                                title="Add another status"
                            >
                                <AddCircleIcon />
                            </IconButton>
                        )}
                    </Box>
                </ListItem>

                <Divider sx={{ my: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="700">
                        RECENT UPDATES
                    </Typography>
                </Divider>

                {otherGroups.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: "center", opacity: 0.6 }}>
                        <Typography variant="body2">No recent updates</Typography>
                    </Box>
                ) : (
                    otherGroups.map((group) => (
                        <ListItem key={group.user._id} disablePadding>
                            <ListItemButton onClick={() => handleOpenViewer(group)}>
                                <ListItemAvatar>
                                    <SegmentedAvatar
                                        src={group.user.avatar}
                                        name={group.user.name}
                                        count={group.stories.length}
                                    />
                                </ListItemAvatar>
                                <ListItemText
                                    primary={group.user.name}
                                    secondary={new Date(group.stories[group.stories.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))
                )}
            </List>

            <StoryUpload open={uploadOpen} onClose={() => setUploadOpen(false)} />
            {selectedGroup && (
                <StoryViewer
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    group={selectedGroup}
                />
            )}
        </Box>
    );
}
