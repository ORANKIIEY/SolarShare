"use client";

import { useState, useEffect, useCallback } from 'react';

interface Notification {
  id: string;
  type: 'emergency' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: {
    label: string;
    action: () => void;
  }[];
  metadata?: {
    poleId?: string;
    coordinates?: { lat: number; lng: number };
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface NotificationAction {
  action: string;
  label: string;
  icon?: string;
}

interface NotificationPermissionState {
  granted: boolean;
  permission: NotificationPermission;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Check notification support and request permission
  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Request permission if not granted
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          setPermission(perm);
        });
      }
    } else {
      console.warn('This browser does not support notifications');
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      return perm;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  // Show browser notification
  const showBrowserNotification = useCallback((
    title: string,
    message: string,
    options?: NotificationOptions & {
      data?: any;
      actions?: NotificationAction[];
    }
  ) => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'gridguard-alert',
      requireInteraction: false,
      silent: false,
      ...options
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Handle custom actions
      if (options?.data?.action) {
        options.data.action();
      }
    };

    // Auto-close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);

    return notification;
  }, [isSupported, permission]);

  // Add notification to state
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show browser notification for emergency/warning
    if (notification.type === 'emergency' || notification.type === 'warning') {
      showBrowserNotification(
        notification.title,
        notification.message,
        {
          data: {
            poleId: notification.metadata?.poleId,
            actions: {
              label: 'View on Map',
              action: 'view-on-map'
            }
          } as any,
          actions: notification.metadata?.severity === 'critical' ? [
            {
              action: 'view-details',
              label: 'View Details'
            }
          ] : undefined
        }
      );
    }

    return newNotification;
  }, [showBrowserNotification]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Listen for emergency alerts from WebSocket or other sources
  useEffect(() => {
    const handleEmergencyAlert = (event: any) => {
      const alert = event.detail;
      
      addNotification({
        type: alert.severity === 'critical' ? 'emergency' : 'warning',
        title: `🚨 ${alert.type.toUpperCase()} - ${alert.poleId}`,
        message: alert.message,
        metadata: {
          poleId: alert.poleId,
          coordinates: alert.coordinates,
          severity: alert.severity
        },
        actions: [
          {
            label: 'View on Map',
            action: () => {
              // Navigate to the pole on Map
              window.location.hash = `#pole-${alert.poleId}`;
              // Trigger map focus
              const mapEvent = new CustomEvent('focusPole', { detail: alert.poleId });
              window.dispatchEvent(mapEvent);
            }
          },
          {
            label: 'Acknowledge',
            action: () => {
              markAsRead(alert.id);
              // Send acknowledgment to server
              fetch('/api/alerts/acknowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertId: alert.id })
              });
            }
          }
        ]
      });
    };

    window.addEventListener('emergency-alert', handleEmergencyAlert);
    
    return () => {
      window.removeEventListener('emergency-alert', handleEmergencyAlert);
    };
  }, [addNotification, markAsRead]);

  // Simulate emergency alerts for demo
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) { // 5% chance every 10 seconds
        const mockAlert = {
          id: `alert-${Date.now()}`,
          type: ['theft', 'overload', 'outage'][Math.floor(Math.random() * 3)] as any,
          severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
          poleId: `P-${Math.floor(Math.random() * 500) + 100}`,
          message: `AI detected ${Math.random() > 0.5 ? 'unusual power consumption pattern' : 'potential theft attempt'} at pole`,
          coordinates: {
            lat: -26.2041 + (Math.random() - 0.5) * 0.1,
            lng: 28.0473 + (Math.random() - 0.5) * 0.1
          }
        };

        const event = new CustomEvent('emergency-alert', { detail: mockAlert });
        window.dispatchEvent(event);
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    permission,
    isSupported,
    requestPermission,
    addNotification,
    markAsRead,
    removeNotification,
    clearNotifications,
    showBrowserNotification
  };
}
