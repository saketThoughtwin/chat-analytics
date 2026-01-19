import { create } from 'zustand';
import api from '../lib/api';

interface DashboardStats {
    totalMessages: number;
    totalUsers: number;
    totalRooms: number;
    activeUsers24h: number;
}

interface RoomStats {
    roomId: string;
    messageCount: number;
    activeUsers: number;
}

interface AnalyticsState {
    dashboardStats: DashboardStats | null;
    roomStats: Record<string, RoomStats>;
    loading: boolean;

    fetchDashboardStats: () => Promise<void>;
    fetchRoomStats: (roomId: string) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
    dashboardStats: null,
    roomStats: {},
    loading: false,

    fetchDashboardStats: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/analytics/dashboard');
            set({ dashboardStats: response.data });
        } catch (error) {
            console.error('Failed to fetch dashboard stats', error);
        } finally {
            set({ loading: false });
        }
    },

    fetchRoomStats: async (roomId) => {
        try {
            const response = await api.get(`/analytics/rooms/${roomId}/stats`);
            set((state) => ({
                roomStats: {
                    ...state.roomStats,
                    [roomId]: response.data
                }
            }));
        } catch (error) {
            console.error('Failed to fetch room stats', error);
        }
    },
}));
