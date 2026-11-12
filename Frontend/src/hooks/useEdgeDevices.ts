/**
 * useEdgeDevices — fetches ESP32 edge device status from backend with real-time updates
 * Combines REST API polling for initial state + SignalR for live updates
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGetEdgeDevices, type ApiEdgeDevice } from "@/lib/api";
import { useSignalR, type EdgeDeviceUpdate } from "./useSignalR";

export interface UseEdgeDevicesResult {
    devices: ApiEdgeDevice[];
    loading: boolean;
    error: string | null;
    connectionStatus: "connecting" | "connected" | "disconnected";
}

export function useEdgeDevices(): UseEdgeDevicesResult {
    const [devices, setDevices] = useState<ApiEdgeDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initial fetch from REST API
    useEffect(() => {
        let mounted = true;

        async function fetchDevices() {
            try {
                setLoading(true);
                const data = await apiGetEdgeDevices();
                if (mounted && data) {
                    setDevices(data);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : "Failed to fetch devices");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchDevices();

        // Poll every 30 seconds as fallback when SignalR isn't connected
        const interval = setInterval(fetchDevices, 30000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    // Handle real-time updates via SignalR
    const handleEdgeDeviceUpdate = useCallback((update: EdgeDeviceUpdate) => {
        setDevices((currentDevices) => {
            const existingIndex = currentDevices.findIndex(
                (d) => d.deviceId === update.deviceId
            );

            if (existingIndex >= 0) {
                // Update existing device
                const updated = [...currentDevices];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    signalStrength: update.signalStrength,
                    temperature: update.temperature,
                    firmwareVersion: update.firmwareVersion,
                    mqttQueueDepth: update.mqttQueueDepth,
                    status: update.status,
                    lastSeen: update.lastSeen,
                    cpuUtilization: update.cpuUtilization,
                    uptimeHours: update.uptimeHours,
                };
                return updated;
            } else {
                // Add new device
                return [
                    ...currentDevices,
                    {
                        deviceId: update.deviceId,
                        poleId: update.poleId,
                        signalStrength: update.signalStrength,
                        temperature: update.temperature,
                        firmwareVersion: update.firmwareVersion,
                        mqttQueueDepth: update.mqttQueueDepth,
                        status: update.status,
                        lastSeen: update.lastSeen,
                        cpuUtilization: update.cpuUtilization,
                        uptimeHours: update.uptimeHours,
                    },
                ];
            }
        });
    }, []);

    const { connectionStatus } = useSignalR(handleEdgeDeviceUpdate);

    return { devices, loading, error, connectionStatus };
}

/**
 * useEdgeDevice — hook for a single ESP32 device with real-time updates
 */
export function useEdgeDevice(deviceId: string | null) {
    const [device, setDevice] = useState<ApiEdgeDevice | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial fetch
    useEffect(() => {
        if (!deviceId) {
            setLoading(false);
            return;
        }

        async function fetchDevice() {
            const { apiGetEdgeDevice } = await import("@/lib/api");
            const data = await apiGetEdgeDevice(deviceId!);
            if (data) setDevice(data);
            setLoading(false);
        }

        fetchDevice();
    }, [deviceId]);

    // Handle real-time updates
    const handleUpdate = useCallback((update: EdgeDeviceUpdate) => {
        if (update.deviceId === deviceId) {
            setDevice((current) => {
                if (!current) return null;
                return {
                    ...current,
                    signalStrength: update.signalStrength,
                    temperature: update.temperature,
                    firmwareVersion: update.firmwareVersion,
                    mqttQueueDepth: update.mqttQueueDepth,
                    status: update.status,
                    lastSeen: update.lastSeen,
                    cpuUtilization: update.cpuUtilization,
                    uptimeHours: update.uptimeHours,
                };
            });
        }
    }, [deviceId]);

    const { connectionStatus } = useSignalR(handleUpdate);

    return { device, loading, connectionStatus };
}
