import { create } from "zustand";
import { getSocket } from "../lib/socket";
import api from "../lib/api";
import { API_ENDPOINTS } from "../lib/apiendpoint";
import { useAuthStore } from "./authStore";


interface Message {
  _id: string;
  sender: string;
  roomId: string;
  message: string;
  read: boolean;
  delivered?: boolean;
  createdAt: string;
  tempId?: string;
  pending?: boolean;
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
  deleteRoom: (roomId: string) => Promise<void>;
  addLocalMessage: (msg: Message) => void;
  replaceMessage: (tempId: string, newMsg: Message) => void;

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
      console.error("Failed to fetch rooms", error);
    }
  },

  setActiveRoom: (roomId) => {
    set({ activeRoomId: roomId });
    if (roomId) {
      get().fetchMessages(roomId);
      const socket = getSocket();
      socket.emit("join_room", roomId);
      get().markAsRead(roomId);
    } else {
      set({ messages: [] });
    }
  },

  fetchMessages: async (roomId) => {
    try {
      const response = await api.get(API_ENDPOINTS.CHAT.MESSAGES(roomId));
      set({ messages: response.data.messages || [] });
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  },

  sendMessage: async (roomId, content) => {
    const tempId = `temp-${Date.now()}`;
    const currentUser = useAuthStore.getState().user;

    const senderId = currentUser?.id || "me";

    get().addLocalMessage({
      _id: tempId,
      tempId,
      roomId,
      sender: senderId,
      message: content,
      createdAt: new Date().toISOString(),
      read: false,
      pending: true,
    });

    try {
      const res = await api.post(API_ENDPOINTS.CHAT.MESSAGES(roomId), {
        message: content,
      });
      get().replaceMessage(tempId, {
        ...res.data,
        pending: false,
      });
    } catch (error) {
      console.error("Failed to send message", error);
    }
  },

  markAsRead: async (roomId) => {
    try {
      const { messages } = get();
      const unreadMessageIds = messages
        .filter((m) => m.roomId === roomId && !m.read && m.sender !== useAuthStore.getState().user?.id)
        .map((m) => m._id);

      // Update local state immediately to avoid race conditions
      set((state) => ({
        rooms: state.rooms.map((r) =>
          r._id === roomId ? { ...r, unreadCount: 0 } : r,
        ),
        messages: state.messages.map((m) =>
          m.roomId === roomId && m.sender !== useAuthStore.getState().user?.id
            ? { ...m, read: true }
            : m
        )
      }));

      if (unreadMessageIds.length > 0) {
        await api.put(API_ENDPOINTS.CHAT.READ_MESSAGES, {
          messageIds: unreadMessageIds,
          roomId
        });
      } else {
        await api.put(API_ENDPOINTS.CHAT.READ(roomId));
      }
    } catch (error) {
      console.error("Failed to mark room as read", error);
    }
  },

  deleteRoom: async (roomId) => {
    try {
      await api.delete(API_ENDPOINTS.CHAT.ROOM_BY_ID.replace(":roomId", roomId));
      set((state) => ({
        rooms: state.rooms.filter((r) => r._id !== roomId),
        activeRoomId: state.activeRoomId === roomId ? null : state.activeRoomId,
        messages: state.activeRoomId === roomId ? [] : state.messages,
      }));
    } catch (error) {
      console.error("Failed to delete room", error);
    }
  },
  addLocalMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),
  replaceMessage: (tempId, newMsg) =>
    set((state) => {
      const messageExists = state.messages.some((m) => m._id === newMsg._id);
      if (messageExists) {
        // If the message already exists (e.g. from socket), just remove the temp one
        return {
          messages: state.messages.filter((m) => m.tempId !== tempId),
        };
      }
      return {
        messages: state.messages.map((m) => (m.tempId === tempId ? newMsg : m)),
      };
    }),


  initSocketEvents: () => {
    const socket = getSocket();

    socket.on("receive_message", (message: Message) => {
      const { activeRoomId } = get();
      const currentUserId = useAuthStore.getState().user?.id;

      set((state) => {
        // 1. Check for duplicates (very important since we emit to room AND user)
        const isDuplicate = state.messages.some((m) => m._id === message._id);
        if (isDuplicate) return state;

        // 2. Update messages list
        let newMessages = [...state.messages];
        if (message.roomId === activeRoomId) {
          const pendingIndex = state.messages.findIndex(
            (m) =>
              m.pending &&
              m.message === message.message &&
              m.sender === message.sender,
          );

          if (pendingIndex !== -1) {
            newMessages[pendingIndex] = message;
          } else {
            newMessages.push(message);
          }
        }

        // 3. Update rooms list (last message and unread count)
        const roomExists = state.rooms.some((r) => r._id === message.roomId);
        let newRooms = [...state.rooms];

        if (roomExists) {
          newRooms = newRooms.map((r) => {
            if (r._id === message.roomId) {
              const isMe = message.sender === currentUserId;
              const isRoomActive = message.roomId === activeRoomId;

              return {
                ...r,
                lastMessage: message,
                unreadCount: (isMe || isRoomActive)
                  ? (r.unreadCount || 0)
                  : (r.unreadCount || 0) + 1,
              };
            }
            return r;
          }).sort((a, b) => {
            if (a._id === message.roomId) return -1;
            if (b._id === message.roomId) return 1;
            return 0;
          });
        }

        return {
          messages: newMessages,
          rooms: newRooms
        };
      });

      // 4. If message is for active room and from someone else, mark as read
      if (message.roomId === activeRoomId && message.sender !== currentUserId) {
        get().markAsRead(message.roomId);
      }

      // 5. If room doesn't exist, fetch all rooms
      const { rooms } = get();
      if (!rooms.some((r) => r._id === message.roomId)) {
        get().fetchRooms();
      }
    });

    socket.on("message_delivered", ({ messageId, roomId }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, delivered: true } : m
        ),
        rooms: state.rooms.map((r) =>
          r._id === roomId && r.lastMessage?._id === messageId
            ? { ...r, lastMessage: { ...r.lastMessage!, delivered: true } }
            : r
        )
      }));
    });

    socket.on("messages_read", ({ messageIds, readBy, roomId }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          messageIds.includes(msg._id) ? { ...msg, read: true } : msg,
        ),
        rooms: state.rooms.map((r) =>
          r._id === roomId && r.lastMessage?._id && messageIds.includes(r.lastMessage._id)
            ? { ...r, lastMessage: { ...r.lastMessage!, read: true } }
            : r
        )
      }));
    });

    socket.on("room_read", ({ roomId, readBy }) => {
      if (readBy !== useAuthStore.getState().user?.id) {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.roomId === roomId ? { ...m, read: true } : m
          ),
          rooms: state.rooms.map((r) =>
            r._id === roomId
              ? { ...r, lastMessage: r.lastMessage ? { ...r.lastMessage, read: true } : undefined }
              : r
          )
        }));
      }
    });

    socket.on("online_users_list", ({ userIds }: { userIds: string[] }) => {
      set({ onlineUsers: userIds });
    });

    socket.on("user_online", ({ userId }) => {
      set((state) => ({
        onlineUsers: [...new Set([...state.onlineUsers, userId])],
      }));
    });

    socket.on("user_offline", ({ userId }) => {
      set((state) => ({
        onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      }));
    });

    socket.on("typing", ({ from, roomId }) => {
      set((state) => {
        const roomTyping = state.typingUsers[roomId] || [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [roomId]: [...new Set([...roomTyping, from])],
          },
        };
      });
    });

    socket.on("stop_typing", ({ from, roomId }) => {
      set((state) => {
        const roomTyping = state.typingUsers[roomId] || [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [roomId]: roomTyping.filter((id) => id !== from),
          },
        };
      });
    });
  },
}));
