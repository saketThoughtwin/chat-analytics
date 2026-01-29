export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        SIGNUP: '/auth/signup',
        ME: '/auth/me',
        SEND_OTP: '/auth/send-otp',
    },
    USERS: {
        SEARCH: '/users/search',
    },
    CHAT: {
        ROOMS: '/chat/rooms',
        ROOM_BY_ID: '/chat/rooms/:roomId',
        MESSAGES: (roomId: string) => `/chat/rooms/${roomId}/messages`,
        READ: (roomId: string) => `/chat/rooms/${roomId}/read`,
        READ_MESSAGES: '/chat/messages/read',
        UNREAD: '/chat/unread',
        DELETE_MESSAGE: '/chat/messages/:messageId',
        STAR_MESSAGE: '/chat/messages/:messageId/star',
        STARRED_MESSAGES: (roomId: string) => `/chat/rooms/${roomId}/starred`,
        ALL_STARRED_MESSAGES: '/chat/starred',
    },
    ANALYTICS: {
        DASHBOARD: '/analytics/dashboard',
        ACTIVE_USERS: (roomId: string) => `/analytics/chat/${roomId}/active`,
    }
};
