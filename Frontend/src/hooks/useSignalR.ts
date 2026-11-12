/**
 * useSignalR — connects to the GridGuard SignalR hub and listens for theft alerts and ESP32 updates.
 * Install: npm install @microsoft/signalr
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";

export interface TheftAlert {
    pole_id: string;
    status: "Red" | "Green" | "Pending";
    confidence_score: number;
    waveform_url: string;
    timestamp: string;
}

export interface EdgeDeviceUpdate {
    deviceId: string;
    poleId: string;
    signalStrength: number;
    temperature: number;
    firmwareVersion: string;
    mqttQueueDepth: number;
    status: "online" | "offline" | "warning";
    lastSeen: string;
    cpuUtilization: number;
    uptimeHours: number;
}

const HUB_URL =
    process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/hubs/gridguard`
        : "http://localhost:5000/hubs/gridguard";

export function useSignalR(
    onEdgeDeviceUpdate?: (update: EdgeDeviceUpdate) => void
) {
    const [latestAlert, setLatestAlert] = useState<TheftAlert | null>(null);
    const [latestEdgeDevice, setLatestEdgeDevice] = useState<EdgeDeviceUpdate | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
    const connectionRef = useRef<signalR.HubConnection | null>(null);
    const onEdgeDeviceUpdateRef = useRef(onEdgeDeviceUpdate);

    // Keep the callback ref up to date
    useEffect(() => {
        onEdgeDeviceUpdateRef.current = onEdgeDeviceUpdate;
    }, [onEdgeDeviceUpdate]);

    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => localStorage.getItem("gridguard_token") ?? "",
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        connectionRef.current = connection;

        connection.on("TheftAlert", (alert: TheftAlert) => {
            setLatestAlert(alert);
        });

        connection.on("EdgeDeviceUpdate", (update: EdgeDeviceUpdate) => {
            setLatestEdgeDevice(update);
            onEdgeDeviceUpdateRef.current?.(update);
        });

        connection.onreconnecting(() => setConnectionStatus("connecting"));
        connection.onreconnected(() => setConnectionStatus("connected"));
        connection.onclose(() => setConnectionStatus("disconnected"));

        connection
            .start()
            .then(() => setConnectionStatus("connected"))
            .catch(() => setConnectionStatus("disconnected"));

        return () => {
            connection.stop();
        };
    }, []);

    return { latestAlert, latestEdgeDevice, connectionStatus };
}
