"use client";

import { useState, useEffect } from 'react';

interface OfflineData {
  workOrders: any[];
  telemetry: any[];
  alerts: any[];
  lastSync: string;
}

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    workOrders: [],
    telemetry: [],
    alerts: [],
    lastSync: new Date().toISOString()
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsOfflineMode(false);
      // Trigger sync when coming back online
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsOfflineMode(true);
      // Save current data to localStorage for offline access
      saveToOfflineStorage();
    };

    const handleConnectionChange = () => {
      setIsOnline(navigator.onLine);
      setIsOfflineMode(!navigator.onLine);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('connectionchange', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('connectionchange', handleConnectionChange);
    };
  }, []);

  // Save data to localStorage for offline access
  const saveToOfflineStorage = () => {
    try {
      const data = {
        workOrders: JSON.parse(localStorage.getItem('workOrders') || '[]'),
        telemetry: JSON.parse(localStorage.getItem('telemetry') || '[]'),
        alerts: JSON.parse(localStorage.getItem('alerts') || '[]'),
        lastSync: new Date().toISOString()
      };
      localStorage.setItem('offlineData', JSON.stringify(data));
      setOfflineData(data);
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  // Load data from localStorage for offline mode
  const loadFromOfflineStorage = () => {
    try {
      const stored = localStorage.getItem('offlineData');
      if (stored) {
        const data = JSON.parse(stored);
        setOfflineData(data);
        return data;
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
      return null;
    }
  };

  // Sync data with server when online
  const syncData = async () => {
    if (!isOnline) {
      console.log('Cannot sync while offline');
      return;
    }

    setSyncStatus('syncing');

    try {
      // Sync work orders
      const workOrdersResponse = await fetch('/api/work-orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrders: offlineData.workOrders,
          lastSync: offlineData.lastSync
        })
      });

      // Sync telemetry
      const telemetryResponse = await fetch('/api/telemetry/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetry: offlineData.telemetry,
          lastSync: offlineData.lastSync
        })
      });

      // Sync alerts
      const alertsResponse = await fetch('/api/alerts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alerts: offlineData.alerts,
          lastSync: offlineData.lastSync
        })
      });

      if (workOrdersResponse.ok && telemetryResponse.ok && alertsResponse.ok) {
        setSyncStatus('success');
        setOfflineData(prev => ({
          ...prev,
          lastSync: new Date().toISOString()
        }));
        
        // Clear offline storage after successful sync
        localStorage.removeItem('offlineData');
        
        // Show success notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('GridGuard Sync Complete', {
            body: 'All offline data has been synchronized with the server',
            icon: '/favicon.ico'
          });
        }
      } else {
        throw new Error('Some sync operations failed');
      }

    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
    }
  };

  // Add data to offline storage
  const addOfflineWorkOrder = (workOrder: any) => {
    const updatedData = {
      ...offlineData,
      workOrders: [...offlineData.workOrders, workOrder]
    };
    setOfflineData(updatedData);
    localStorage.setItem('offlineData', JSON.stringify(updatedData));
  };

  const addOfflineTelemetry = (telemetry: any) => {
    const updatedData = {
      ...offlineData,
      telemetry: [...offlineData.telemetry, telemetry]
    };
    setOfflineData(updatedData);
    localStorage.setItem('offlineData', JSON.stringify(updatedData));
  };

  const addOfflineAlert = (alert: any) => {
    const updatedData = {
      ...offlineData,
      alerts: [...offlineData.alerts, alert]
    };
    setOfflineData(updatedData);
    localStorage.setItem('offlineData', JSON.stringify(updatedData));
  };

  // Initialize offline data on mount
  useEffect(() => {
    if (!navigator.onLine) {
      setIsOfflineMode(true);
      loadFromOfflineStorage();
    }
  }, []);

  // Periodic sync when online
  useEffect(() => {
    if (isOnline && !isOfflineMode) {
      const interval = setInterval(() => {
        syncData();
      }, 30000); // Sync every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isOnline, isOfflineMode]);

  return {
    isOnline,
    isOfflineMode,
    offlineData,
    syncStatus,
    syncData,
    addOfflineWorkOrder,
    addOfflineTelemetry,
    addOfflineAlert,
    saveToOfflineStorage,
    loadFromOfflineStorage
  };
}
