export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        SIGNUP: '/auth/signup',
        ME: '/auth/me',
    },
    USERS: {
        SEARCH: '/users/search',
    },
    CHAT: {
        ROOMS: '/chat/rooms',
        MESSAGES: (roomId: string) => `/chat/rooms/${roomId}/messages`,
        READ: (roomId: string) => `/chat/rooms/${roomId}/read`,
        READ_MESSAGES: '/chat/messages/read',
        UNREAD: '/chat/unread',
    },
    ANALYTICS: {
        DASHBOARD: '/analytics/dashboard',
        ACTIVE_USERS: (roomId: string) => `/analytics/chat/${roomId}/active`,
    }
};
