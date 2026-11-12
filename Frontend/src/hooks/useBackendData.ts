"use client";

import { useState, useEffect, useCallback } from "react";

interface UseBackendDataOptions<T> {
    fetchFn: () => Promise<T>;
    initialData?: T;
    refreshInterval?: number;
}

export function useBackendData<T>({ fetchFn, initialData, refreshInterval }: UseBackendDataOptions<T>) {
    const [data, setData] = useState<T | undefined>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchFn();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [fetchFn]);

    useEffect(() => {
        fetchData();
        if (refreshInterval) {
            const interval = setInterval(fetchData, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [fetchData, refreshInterval]);

    return { data, loading, error, refetch: fetchData };
}
