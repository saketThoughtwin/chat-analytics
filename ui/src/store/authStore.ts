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
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            _hasHydrated: false,
            setAuth: (user, token) => set({ user, token }),
            logout: () => set({ user: null, token: null }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
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
            onRehydrateStorage: (state) => {
                return () => state.setHasHydrated(true);
            },
        }
    )
);
