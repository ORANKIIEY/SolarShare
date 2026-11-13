"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'worker' | 'governance' | 'dev' | 'operator' | 'investor';
}

export function useAuth(requiredRole?: User['role']) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication on mount
    const token = localStorage.getItem('solarshare_token');
    const userStr = localStorage.getItem('solarshare_user');

    if (!token || !userStr) {
      if (typeof window !== 'undefined') {
        router.push('/login');
      }
      return;
    }

    try {
      const userData = JSON.parse(userStr) as User;
      setUser(userData);

      // Check if user has required role
      if (requiredRole && userData.role !== requiredRole) {
        // Redirect to appropriate dashboard
        let redirectPath = '/operator';
        switch (userData.role) {
          case 'worker':
            redirectPath = '/worker';
            break;
          case 'governance':
            redirectPath = '/governance';
            break;
          case 'dev':
            redirectPath = '/dev';
            break;
          case 'operator':
          case 'admin':
            redirectPath = '/operator';
            break;
          case 'investor':
            redirectPath = '/solar';
            break;
        }
        router.push(redirectPath);
        return;
      }
    } catch (error) {
      console.error('Invalid user data:', error);
      localStorage.removeItem('solarshare_token');
      localStorage.removeItem('solarshare_user');
      document.cookie = "solarshare_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "solarshare_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [requiredRole, router]);

  const logout = () => {
    localStorage.removeItem('solarshare_token');
    localStorage.removeItem('solarshare_user');
    document.cookie = "solarshare_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "solarshare_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUser(null);
    router.push('/login');
  };

  return { user, loading, logout };
}
