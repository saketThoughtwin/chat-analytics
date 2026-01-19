import { create } from 'zustand';
import { getSocket } from '../lib/socket';
import api from '../lib/api';
import { API_ENDPOINTS } from '../lib/apiendpoint';

interface Message {
    _id: string;
    sender: string;
    roomId: string;
    message: string;
    read: boolean;
    createdAt: string;
}

interface Room {
    _id: string;
    participants: any[];
    lastMessage?: Message;
    unreadCount?: number;
}

interface ChatState {
    rooms: Room[];
    activeRoomId: string | null;
    messages: Message[];
    onlineUsers: string[];
    typingUsers: Record<string, string[]>; // roomId -> userIds

    fetchRooms: () => Promise<void>;
    setActiveRoom: (roomId: string | null) => void;
    fetchMessages: (roomId: string) => Promise<void>;
    sendMessage: (roomId: string, content: string) => Promise<void>;
    markAsRead: (roomId: string) => Promise<void>;

    // Socket event handlers
    initSocketEvents: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    rooms: [],
    activeRoomId: null,
    messages: [],
    onlineUsers: [],
    typingUsers: {},

    fetchRooms: async () => {
        try {
            const response = await api.get(API_ENDPOINTS.CHAT.ROOMS);
            set({ rooms: response.data || [] });
        } catch (error) {
            console.error('Failed to fetch rooms', error);
        }
    },

    setActiveRoom: (roomId) => {
        set({ activeRoomId: roomId });
        if (roomId) {
            get().fetchMessages(roomId);
            const socket = getSocket();
            socket.emit('join_room', roomId);
        } else {
            set({ messages: [] });
        }
    },

    fetchMessages: async (roomId) => {
        try {
            const response = await api.get(API_ENDPOINTS.CHAT.MESSAGES(roomId));
            set({ messages: response.data.messages || [] });
        } catch (error) {
            console.error('Failed to fetch messages', error);
        }
    },

    sendMessage: async (roomId, content) => {
        try {
            await api.post(API_ENDPOINTS.CHAT.MESSAGES(roomId), { message: content });
            // Message will be received via socket
        } catch (error) {
            console.error('Failed to send message', error);
        }
    },

    markAsRead: async (roomId) => {
        try {
            await api.put(API_ENDPOINTS.CHAT.READ(roomId));
            set((state) => ({
                rooms: state.rooms.map(r => r._id === roomId ? { ...r, unreadCount: 0 } : r)
            }));
        } catch (error) {
            console.error('Failed to mark room as read', error);
        }
    },

    initSocketEvents: () => {
        const socket = getSocket();

        socket.on('receive_message', (message: Message) => {
            const { activeRoomId, messages, rooms } = get();

            // If message is for active room, add to messages list
            if (message.roomId === activeRoomId) {
                set({ messages: [...messages, message] });
                get().markAsRead(message.roomId);
            }

            // Check if room exists in our list
            const roomExists = rooms.some(r => r._id === message.roomId);

            if (roomExists) {
                // Update existing room and move to top
                const updatedRooms = rooms.map(r => {
                    if (r._id === message.roomId) {
                        return {
                            ...r,
                            lastMessage: message,
                            unreadCount: (r.unreadCount || 0) + (message.roomId === activeRoomId ? 0 : 1)
                        };
                    }
                    return r;
                }).sort((a, b) => {
                    if (a._id === message.roomId) return -1;
                    if (b._id === message.roomId) return 1;
                    return 0;
                });
                set({ rooms: updatedRooms });
            } else {
                // Room doesn't exist (new chat), fetch all rooms to get the new one
                get().fetchRooms();
            }
        });

        socket.on('online_users_list', ({ userIds }: { userIds: string[] }) => {
            set({ onlineUsers: userIds });
        });

        socket.on('user_online', ({ userId }) => {
            set((state) => ({ onlineUsers: [...new Set([...state.onlineUsers, userId])] }));
        });

        socket.on('user_offline', ({ userId }) => {
            set((state) => ({ onlineUsers: state.onlineUsers.filter(id => id !== userId) }));
        });

        socket.on('typing', ({ from, roomId }) => {
            set((state) => {
                const roomTyping = state.typingUsers[roomId] || [];
                return {
                    typingUsers: {
                        ...state.typingUsers,
                        [roomId]: [...new Set([...roomTyping, from])]
                    }
                };
            });
        });

        socket.on('stop_typing', ({ from, roomId }) => {
            set((state) => {
                const roomTyping = state.typingUsers[roomId] || [];
                return {
                    typingUsers: {
                        ...state.typingUsers,
                        [roomId]: roomTyping.filter(id => id !== from)
                    }
                };
            });
        });

        socket.on('messages_read', ({ messageIds, readBy }) => {
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                messageIds.includes(msg._id) ? { ...msg, read: true } : msg
            );
            set({ messages: updatedMessages });
        });
    }
}));
