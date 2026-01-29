export const RoutesConstants = {
    AUTH: {
        DEFAULT: '/auth',
        LOGIN: '/login',
        LOGOUT: '/logout',
        SIGNUP: '/signup',
        ME: '/me',
        FORGOT_PASSWORD: '/forgotPassword',
        RESET_PASSWORD: '/resetPassword/:resetToken',
    },
    USER: {
        DEFAULT: '/users',
        ALL: '/',
        DETAIL: '/:id',
        SEARCH: '/search',
    },
    HEALTH: '/health',
    NOT_FOUND: '*',
    CHAT: {
        DEFAULT: '/chat',
        ROOMS: '/rooms',
        ROOM_BY_ID: '/rooms/:roomId',
        ROOM_BY_ID_UPLOAD:'/rooms/:roomId/upload', 
        MESSAGES: '/rooms/:roomId/messages',
        READ_MESSAGES: '/messages/read',
        READ_ROOM: '/rooms/:roomId/read',
        UNREAD: '/unread',
        ROOM_UNREAD: '/rooms/:roomId/unread',
        CONVERSATION: '/:withUser'
    },
    ANALYTICS: {
        DEFAULT: '/analytics',
        DASHBOARD: '/dashboard',
        ACTIVE_USERS: '/chat/:roomId/active',
        USER_MESSAGES: '/users/:userId/messages',
        ROOM_STATS: '/rooms/:roomId/stats',
        USER_STATS: '/users/:userId/stats'
    }
};
