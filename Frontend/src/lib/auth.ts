/**
 * GridGuard AI — Auth Hook
 *
 * useRequireAuth: Reads the token from localStorage on mount.
 * If no token exists, redirects to /login immediately.
 * Returns the stored user object (or null while checking).
 *
 * Usage: call at the top of any protected page component.
 * The page renders nothing (null) until auth is confirmed,
 * preventing flash of unauthenticated content.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface StoredUser {
    id: string;
    email: string;
    name: string;
    role: string;
}

export function useRequireAuth(): StoredUser | null {
    const router = useRouter();
    const [user, setUser] = useState<StoredUser | null>(null);

    useEffect(() => {
        try {
            const token = localStorage.getItem("gridguard_token");
            if (!token) {
                router.replace("/login");
                return;
            }
            const stored = localStorage.getItem("gridguard_user");
            if (stored) {
                setUser(JSON.parse(stored) as StoredUser);
            }
        } catch {
            // Malformed storage — treat as unauthenticated
            router.replace("/login");
        }
    }, [router]);

    return user;
}

/**
 * useAuth: Non-redirecting variant.
 * Returns the stored user (or null) without redirecting.
 * Use in components that display user info but don't enforce auth (e.g. Header).
 */
export function useAuth(): StoredUser | null {
    const [user, setUser] = useState<StoredUser | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("gridguard_user");
            if (stored) setUser(JSON.parse(stored) as StoredUser);
        } catch { /* ignore */ }
    }, []);

    return user;
}
