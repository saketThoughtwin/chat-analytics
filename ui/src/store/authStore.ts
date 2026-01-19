import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            setAuth: (user, token) => set({ user, token }),
            logout: () => set({ user: null, token: null }),
            fetchMe: async () => {
                try {
                    const response = await api.get('/auth/me');
                    set({ user: response.data });
                } catch (error) {
                    console.error('Failed to fetch user profile', error);
                    set({ user: null, token: null });
                }
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
