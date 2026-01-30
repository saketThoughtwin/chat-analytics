import { create } from "zustand";
import { getSocket } from "../lib/socket";
import api from "../lib/api";
import { API_ENDPOINTS } from "../lib/apiendpoint";
import { JSON_HEADERS, MULTIPART_HEADERS } from "../lib/headers";
import { useAuthStore } from "./authStore";

interface Message {
  _id: string;
  sender: string;
  roomId: string;
  message: string;
  type?: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  read: boolean;
  readAt?: string;
  delivered?: boolean;
  deliveredAt?: string;
  createdAt: string;
  tempId?: string;
  pending?: boolean;
  deleted?: boolean;
  starred?: boolean;
}

interface Room {
  _id: string;
  participants: any[];
  lastMessage?: Message;
  unreadCount?: number;
}

interface ChatState {
  rooms: Room[];
  loadingRooms: boolean;
  activeRoomId: string | null;
  messages: Message[];
  onlineUsers: string[];
  typingUsers: Record<string, string[]>; // roomId -> userIds
  messagesCache: Record<string, Message[]>; // roomId -> messages
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;

  fetchRooms: () => Promise<void>;
  setActiveRoom: (roomId: string | null) => void;
  fetchMessages: (roomId: string) => Promise<void>;
  loadMoreMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  sendMedia: (roomId: string, file: File) => Promise<void>;
  markAsRead: (roomId: string) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  addLocalMessage: (msg: Message) => void;
  replaceMessage: (tempId: string, newMsg: Message) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleStarMessage: (messageId: string, starred: boolean) => Promise<void>;
  fetchAllStarredMessages: () => Promise<Message[]>;

  // Socket event handlers
  initSocketEvents: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  loadingRooms: false,
  activeRoomId: null,
  messages: [],
  onlineUsers: [],
  typingUsers: {},
  messagesCache: {},
  loading: false,
  loadingMore: false,
  hasMore: true,
  page: 1,
  error: null,

  fetchRooms: async () => {
    // Only show loading if we don't have any rooms yet (stale-while-revalidate)
    if (get().rooms.length === 0) {
      set({ loadingRooms: true });
    }

    try {
      const response = await api.get(API_ENDPOINTS.CHAT.ROOMS);
      const rooms = response.data || [];
      set({ rooms });

      // Join all rooms to receive real-time updates (typing, etc.)
      const socket = getSocket();
      rooms.forEach((room: Room) => {
        socket.emit("join_room", room._id);
      });
    } catch (error) {
      console.error("Failed to fetch rooms", error);
    } finally {
      set({ loadingRooms: false });
    }
  },

  setActiveRoom: (roomId) => {
    if (roomId) {
      const cachedMessages = get().messagesCache[roomId];
      // Atomically set active room and messages (from cache or empty)
      // This prevents "ghost" messages from the previous room
      set({
        activeRoomId: roomId,
        messages: cachedMessages || [],
        loading: !cachedMessages, // Only show loader if we don't have cache
        error: null,
        page: 1,
        hasMore: true
      });

      get().fetchMessages(roomId);
      const socket = getSocket();
      socket.emit("join_room", roomId);
      get().markAsRead(roomId);
    } else {
      set({ activeRoomId: null, messages: [] });
    }
  },

  fetchMessages: async (roomId) => {
    // Check cache first
    const cachedMessages = get().messagesCache[roomId];
    if (cachedMessages) {
      set({
        messages: cachedMessages,
        loading: false,
        error: null,
        page: 1,
        hasMore: true
      });
    } else {
      // If not in cache, clear messages to avoid showing previous room's messages
      set({ messages: [], loading: true, error: null, page: 1, hasMore: true });
    }

    try {
      const response = await api.get(API_ENDPOINTS.CHAT.MESSAGES(roomId), {
        params: { page: 1, limit: 30 },
      });
      const messages = response.data.messages || response.data;
      const hasMore = Array.isArray(response.data.messages)
        ? response.data.page < response.data.pages
        : messages.length === 30;

      const newMessages = Array.isArray(messages) ? messages : [];

      set((state) => ({
        messages: newMessages,
        messagesCache: {
          ...state.messagesCache,
          [roomId]: newMessages
        },
        loading: false,
        hasMore,
      }));
    } catch (error) {
      console.error("Failed to fetch messages", error);
      // If we have cache, we might want to keep showing it but maybe show an error toast?
      // For now, if we have cache, we just keep it. If not, we show error.
      if (!get().messagesCache[roomId]) {
        set({ error: "Failed to fetch messages", loading: false });
      }
    }
  },

  loadMoreMessages: async (roomId) => {
    const { page, hasMore, loadingMore } = get();
    if (!hasMore || loadingMore) return;

    set({ loadingMore: true });
    try {
      const nextPage = page + 1;
      const response = await api.get(API_ENDPOINTS.CHAT.MESSAGES(roomId), {
        params: { page: nextPage, limit: 30 },
      });

      const newMessages = response.data.messages || response.data;
      const stillHasMore = Array.isArray(response.data.messages)
        ? response.data.page < response.data.pages
        : newMessages.length === 30;

      set((state) => {
        const updatedMessages = [...newMessages, ...state.messages];
        return {
          messages: updatedMessages,
          messagesCache: {
            ...state.messagesCache,
            [roomId]: updatedMessages
          },
          page: nextPage,
          hasMore: stillHasMore,
          loadingMore: false,
        };
      });
    } catch (error) {
      set({ loadingMore: false });
      console.error("Failed to load more messages", error);
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
      }, { headers: JSON_HEADERS });
      get().replaceMessage(tempId, {
        ...res.data,
        pending: false,
      });
    } catch (error) {
      console.error("Failed to send message", error);
    }
  },
  sendMedia: async (roomId, file) => {
    const tempId = `temp-${Date.now()}`;
    const currentUser = useAuthStore.getState().user;
    const senderId = currentUser?.id || "me";

    const isVideo = file.type.startsWith('video');
    const type = isVideo ? 'video' : 'image';

    // Create a local preview URL
    const localUrl = URL.createObjectURL(file);

    get().addLocalMessage({
      _id: tempId,
      tempId,
      roomId,
      sender: senderId,
      message: '',
      type,
      mediaUrl: localUrl,
      createdAt: new Date().toISOString(),
      read: false,
      pending: true,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post(`${API_ENDPOINTS.CHAT.ROOM_BY_ID.replace(':roomId', roomId)}/upload`, formData, {
        headers: MULTIPART_HEADERS,
      });

      get().replaceMessage(tempId, {
        ...res.data,
        pending: false,
      });
    } catch (error) {
      console.error("Failed to upload media", error);
    }
  },

  markAsRead: async (roomId) => {
    try {
      const { messages } = get();
      const unreadMessageIds = messages
        .filter(
          (m) =>
            m.roomId === roomId &&
            !m.read &&
            m.sender !== useAuthStore.getState().user?.id,
        )
        .map((m) => m._id);

      // Update local state immediately to avoid race conditions
      set((state) => {
        const newMessages = state.messages.map((m) =>
          m.roomId === roomId && m.sender !== useAuthStore.getState().user?.id
            ? { ...m, read: true }
            : m
        );

        const newCache = { ...state.messagesCache };
        if (newCache[roomId]) {
          newCache[roomId] = newCache[roomId].map((m) =>
            m.sender !== useAuthStore.getState().user?.id ? { ...m, read: true } : m
          );
        }

        return {
          rooms: state.rooms.map((r) =>
            r._id === roomId ? { ...r, unreadCount: 0 } : r
          ),
          messages: newMessages,
          messagesCache: newCache,
        };
      });

      if (unreadMessageIds.length > 0) {
        await api.put(API_ENDPOINTS.CHAT.READ_MESSAGES, {
          messageIds: unreadMessageIds,
          roomId,
        }, { headers: JSON_HEADERS });
      } else {
        await api.put(API_ENDPOINTS.CHAT.READ(roomId), {}, { headers: JSON_HEADERS });
      }
    } catch (error) {
      console.error("Failed to mark room as read", error);
    }
  },

  deleteRoom: async (roomId) => {
    try {
      await api.delete(
        API_ENDPOINTS.CHAT.ROOM_BY_ID.replace(":roomId", roomId),
      );
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
    set((state) => {
      const newMessages = [...state.messages, msg];
      // Update cache for the room of the message
      const roomId = msg.roomId;
      const roomCache = state.messagesCache[roomId] || [];

      return {
        messages: newMessages,
        messagesCache: {
          ...state.messagesCache,
          [roomId]: [...roomCache, msg]
        }
      };
    }),
  replaceMessage: (tempId, newMsg) =>
    set((state) => {
      const messageExists = state.messages.some((m) => m._id === newMsg._id);
      let newMessages;

      if (messageExists) {
        // If the message already exists (e.g. from socket), just remove the temp one
        newMessages = state.messages.filter((m) => m.tempId !== tempId);
      } else {
        newMessages = state.messages.map((m) => (m.tempId === tempId ? newMsg : m));
      }

      // Update cache
      const roomId = newMsg.roomId;
      // We need to do the same operation on the cache
      const roomCache = state.messagesCache[roomId] || [];
      let newRoomCache;

      const cacheMessageExists = roomCache.some((m) => m._id === newMsg._id);
      if (cacheMessageExists) {
        newRoomCache = roomCache.filter((m) => m.tempId !== tempId);
      } else {
        newRoomCache = roomCache.map((m) => (m.tempId === tempId ? newMsg : m));
      }

      return {
        messages: newMessages,
        messagesCache: {
          ...state.messagesCache,
          [roomId]: newRoomCache
        }
      };
    }),

  deleteMessage: async (messageId: string) => {
    try {
      await api.delete(API_ENDPOINTS.CHAT.DELETE_MESSAGE.replace(':messageId', messageId));
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId
            ? { ...m, deleted: true, message: "This message was deleted", type: 'text', mediaUrl: undefined }
            : m
        ),
        // Update cache as well
        messagesCache: Object.fromEntries(
          Object.entries(state.messagesCache).map(([roomId, msgs]) => [
            roomId,
            msgs.map((m) =>
              m._id === messageId
                ? { ...m, deleted: true, message: "This message was deleted", type: 'text', mediaUrl: undefined }
                : m
            )
          ])
        ),
        // Update room's lastMessagePreview if the deleted message is the last message
        rooms: state.rooms.map((r) =>
          r.lastMessage?._id === messageId
            ? {
              ...r,
              lastMessage: {
                ...r.lastMessage,
                deleted: true,
                message: "This message was deleted",
                type: 'text' as const,
                mediaUrl: undefined
              },
              lastMessagePreview: "Message was deleted" as any
            }
            : r
        )
      }));
    } catch (error) {
      console.error("Failed to delete message", error);
    }
  },

  toggleStarMessage: async (messageId: string, starred: boolean) => {
    try {
      await api.put(API_ENDPOINTS.CHAT.STAR_MESSAGE.replace(':messageId', messageId), { starred });
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, starred } : m
        ),
        // Update cache as well
        messagesCache: Object.fromEntries(
          Object.entries(state.messagesCache).map(([roomId, msgs]) => [
            roomId,
            msgs.map((m) =>
              m._id === messageId ? { ...m, starred } : m
            )
          ])
        )
      }));
    } catch (error) {
      console.error("Failed to toggle star message", error);
    }
  },

  fetchAllStarredMessages: async () => {
    try {
      const res = await api.get(API_ENDPOINTS.CHAT.ALL_STARRED_MESSAGES);
      return res.data;
    } catch (error) {
      console.error("Failed to fetch starred messages", error);
      return [];
    }
  },

  initSocketEvents: () => {
    const socket = getSocket();

    socket.on("receive_message", (message: Message) => {
      console.log("Socket: receive_message", message);
      const { activeRoomId } = get();
      const currentUserId = useAuthStore.getState().user?.id;

      set((state) => {
        // 1. Check for duplicates (very important since we emit to room AND user)
        const isDuplicate = state.messages.some((m) => m._id === message._id);
        if (isDuplicate) return state;

        // 2. Update messages list
        let newMessages = [...state.messages];
        if (message.roomId === activeRoomId) {
          if (message.sender !== currentUserId) {
            message.read = true;
          }
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
          newRooms = newRooms
            .map((r) => {
              if (r._id === message.roomId) {
                const isMe = message.sender === currentUserId;
                const isRoomActive = message.roomId === activeRoomId;

                // Handle deleted messages in preview
                const lastMessagePreview = message.deleted
                  ? 'Message was deleted'
                  : message.type === 'image'
                    ? '📷 Photo'
                    : message.type === 'video'
                      ? '🎥 Video'
                      : message.type === 'audio'
                        ? '🎤 Voice message'
                        : message.message;

                // Check if this message already exists in the room's context or as the last message to prevent double counting
                const messageAlreadyExistsInRoom = state.messages.some(
                  (m) =>
                    m._id === message._id ||
                    (m.tempId &&
                      m.message === message.message &&
                      m.sender === message.sender),
                );
                const isDuplicateLastMessage = r.lastMessage?._id === message._id;

                return {
                  ...r,
                  lastMessage: message,
                  lastMessagePreview,
                  unreadCount:
                    // Don't increment if it's my message, room is active, message already exists, or it's a duplicate of the current last message
                    isMe ||
                      isRoomActive ||
                      messageAlreadyExistsInRoom ||
                      isDuplicateLastMessage
                      ? r.unreadCount || 0
                      : (r.unreadCount || 0) + 1,
                };
              }
              return r;
            })
            .sort((a, b) => {
              if (a._id === message.roomId) return -1;
              if (b._id === message.roomId) return 1;
              return 0;
            });
        }

        // Update cache as well
        const cacheForRoom = state.messagesCache[message.roomId] || [];
        // Check for duplicates in cache
        const isDuplicateInCache = cacheForRoom.some((m) => m._id === message._id);
        let newCacheForRoom = [...cacheForRoom];

        if (!isDuplicateInCache) {
          if (message.roomId === activeRoomId && message.sender !== currentUserId) {
            message.read = true;
          }
          // Handle pending in cache
          const pendingIndexCache = cacheForRoom.findIndex(
            (m) =>
              m.pending &&
              m.message === message.message &&
              m.sender === message.sender
          );
          if (pendingIndexCache !== -1) {
            newCacheForRoom[pendingIndexCache] = message;
          } else {
            newCacheForRoom.push(message);
          }
        }

        return {
          messages: newMessages,
          messagesCache: {
            ...state.messagesCache,
            [message.roomId]: newCacheForRoom
          },
          rooms: newRooms,
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
          m._id === messageId ? { ...m, delivered: true } : m,
        ),
        rooms: state.rooms.map((r) =>
          r._id === roomId && r.lastMessage?._id === messageId
            ? { ...r, lastMessage: { ...r.lastMessage!, delivered: true } }
            : r,
        ),
      }));
    });

    socket.on("messages_read", ({ messageIds, readBy, roomId }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          messageIds.includes(msg._id) ? { ...msg, read: true } : msg,
        ),
        rooms: state.rooms.map((r) =>
          r._id === roomId &&
            r.lastMessage?._id &&
            messageIds.includes(r.lastMessage._id)
            ? { ...r, lastMessage: { ...r.lastMessage!, read: true } }
            : r,
        ),
      }));
    });

    socket.on("room_read", ({ roomId, readBy }) => {
      if (readBy !== useAuthStore.getState().user?.id) {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.roomId === roomId ? { ...m, read: true } : m,
          ),
          rooms: state.rooms.map((r) =>
            r._id === roomId
              ? {
                ...r,
                lastMessage: r.lastMessage
                  ? { ...r.lastMessage, read: true }
                  : undefined,
              }
              : r,
          ),
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
      console.log("Socket: typing event received", { from, roomId });
      set((state) => {
        const roomTyping = state.typingUsers[roomId] || [];
        const newTypingUsers = {
          ...state.typingUsers,
          [roomId]: [...new Set([...roomTyping, from])],
        };
        console.log("Store: updated typingUsers", newTypingUsers);
        return {
          typingUsers: newTypingUsers,
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
  reset: () => {
    set({
      rooms: [],
      loadingRooms: false,
      activeRoomId: null,
      messages: [],
      onlineUsers: [],
      typingUsers: {},
      loading: false,
      loadingMore: false,
      hasMore: true,
      page: 1,
      error: null,
      messagesCache: {},
    });
  },
}));
