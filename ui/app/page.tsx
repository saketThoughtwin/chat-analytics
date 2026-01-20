'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../src/store/authStore';
import { Box, CircularProgress } from '@mui/material';

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (token) {
      router.push('/chat');
    } else {
      router.push('/signup');
    }
  }, [token, router, _hasHydrated]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );
}
