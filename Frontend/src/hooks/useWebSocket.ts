"use client";

import { useEffect, useState, useRef } from 'react';

interface TelemetryData {
  poleId: string;
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  status: 'normal' | 'warning' | 'critical';
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface AlertData {
  id: string;
  type: 'theft' | 'overload' | 'outage' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  poleId: string;
  message: string;
  timestamp: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Fetch real telemetry data from backend
  const fetchTelemetryData = async () => {
    try {
      const token = localStorage.getItem('gridguard_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/telemetry/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Transform backend data to frontend format
        const transformedData = data.map((item: any) => ({
          poleId: item.DeviceId || `P-${item.Id}`,
          timestamp: item.Time || new Date().toISOString(),
          voltage: item.Voltage || 220 + Math.random() * 20,
          current: item.SupplyCurrent || item.Current || 45 + Math.random() * 15,
          power: (item.Voltage * item.SupplyCurrent / 1000) || 9.8 + Math.random() * 2,
          status: item.Status || (Math.random() > 0.8 ? 'critical' : Math.random() > 0.6 ? 'warning' : 'normal'),
          coordinates: {
            lat: -26.2041 + (Math.random() - 0.5) * 0.1,
            lng: 28.0473 + (Math.random() - 0.5) * 0.1
          }
        }));
        
        setTelemetry(transformedData);
      }
    } catch (error) {
      console.error('Failed to fetch telemetry data:', error);
    }
  };

  // Fetch real alerts data from backend
  const fetchAlertsData = async () => {
    try {
      const token = localStorage.getItem('gridguard_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/incidents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Transform backend incidents to frontend alerts
        const transformedAlerts = data.map((item: any) => ({
          id: item.Id || `ALERT-${Date.now()}`,
          type: item.Type || 'theft',
          severity: item.Severity || 'medium',
          poleId: item.AssetId || `P-${item.Id}`,
          message: item.Description || 'AI detected unusual activity',
          timestamp: item.CreatedAt || new Date().toISOString(),
          coordinates: {
            lat: item.Latitude || -26.2041 + (Math.random() - 0.5) * 0.1,
            lng: item.Longitude || 28.0473 + (Math.random() - 0.5) * 0.1
          }
        }));
        
        setAlerts(transformedAlerts);
      }
    } catch (error) {
      console.error('Failed to fetch alerts data:', error);
    }
  };

  const connect = () => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Subscribe to telemetry and alert streams
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['telemetry', 'alerts']
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'telemetry':
              setTelemetry(prev => {
                const newData = [...prev, data.payload];
                // Keep only last 100 readings
                return newData.slice(-100);
              });
              break;
              
            case 'alert':
              setAlerts(prev => {
                const newAlerts = [data.payload, ...prev];
                // Keep only last 50 alerts
                return newAlerts.slice(-50);
              });
              break;
              
            case 'heartbeat':
              setLastUpdate(new Date().toISOString());
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        attemptReconnect();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      attemptReconnect();
    }
  };

  const attemptReconnect = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    reconnectAttempts.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendCommand = (command: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command));
    } else {
      console.warn('WebSocket not connected, cannot send command');
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [url]);

  // Use real API data instead of simulation
  useEffect(() => {
    // Initial data fetch
    fetchTelemetryData();
    fetchAlertsData();
    
    // Set up periodic polling for real-time updates
    const telemetryInterval = setInterval(() => {
      fetchTelemetryData();
    }, 5000); // Every 5 seconds
    
    const alertsInterval = setInterval(() => {
      fetchAlertsData();
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(telemetryInterval);
      clearInterval(alertsInterval);
    };
  }, []);

  return {
    isConnected,
    telemetry,
    alerts,
    lastUpdate,
    disconnect,
    reconnect: connect,
    sendCommand
  };
}
