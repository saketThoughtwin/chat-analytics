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
    CircularProgress,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import StoryUpload from "./StoryUpload";
import StoryViewer from "./StoryViewer";

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
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 0 }}>
            <List>
                {/* My Story */}
                <ListItem disablePadding>
                    <ListItemButton onClick={myGroup ? () => handleOpenViewer(myGroup) : () => setUploadOpen(true)}>
                        <ListItemAvatar>
                            <Box sx={{ position: "relative" }}>
                                <Avatar
                                    src={currentUser?.avatar}
                                    sx={{
                                        width: 50,
                                        height: 50,
                                        border: myGroup ? "2px solid #6366f1" : "none",
                                        p: myGroup ? 0.3 : 0,
                                    }}
                                >
                                    {currentUser?.name?.charAt(0)}
                                </Avatar>
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
                        {!myGroup && (
                            <IconButton onClick={() => setUploadOpen(true)} color="primary">
                                <AddCircleIcon />
                            </IconButton>
                        )}
                    </ListItemButton>
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
                                    <Avatar
                                        src={group.user.avatar}
                                        sx={{
                                            width: 50,
                                            height: 50,
                                            border: "2px solid #6366f1",
                                            p: 0.3,
                                        }}
                                    >
                                        {group.user.name.charAt(0)}
                                    </Avatar>
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
