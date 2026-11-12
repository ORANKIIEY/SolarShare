"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'worker' | 'governance' | 'dev';
}

export function useAuth(requiredRole?: User['role']) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication on mount
    const token = localStorage.getItem('gridguard_token');
    const userStr = localStorage.getItem('gridguard_user');

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
        let redirectPath = '/admin';
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
          case 'admin':
            redirectPath = '/admin';
            break;
        }
        router.push(redirectPath);
        return;
      }
    } catch (error) {
      console.error('Invalid user data:', error);
      localStorage.removeItem('gridguard_token');
      localStorage.removeItem('gridguard_user');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [requiredRole, router]);

  const logout = () => {
    localStorage.removeItem('gridguard_token');
    localStorage.removeItem('gridguard_user');
    setUser(null);
    router.push('/login');
  };

  return { user, loading, logout };
}
