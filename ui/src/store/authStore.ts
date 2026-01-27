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
    sendOTP: (name: string, email: string) => Promise<void>;
    verifyOTP: (otp: string) => Promise<void>;
    tempSignupData: any;
    setTempSignupData: (data: any) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
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
            sendOTP: async (name: string, email: string) => {
                await api.post('/auth/send-otp', { name, email });
            },
            verifyOTP: async (otp: string) => {
                const { tempSignupData } = get();
                const response = await api.post('/auth/signup', {
                    ...tempSignupData,
                    otp
                });
                const { user, token } = response.data;
                set({ user, token, tempSignupData: null });
            },
            tempSignupData: null,
            setTempSignupData: (data: any) => set({ tempSignupData: data }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token, user: state.user }),
            onRehydrateStorage: (state) => {
                return () => state.setHasHydrated(true);
            },
        }
    )
);
