"use client";

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  Bell, 
  AlertTriangle, 
  X, 
  CheckCircle,
  Eye,
  Clock,
  MapPin
} from 'lucide-react';

export default function EmergencyAlerts() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    removeNotification,
    clearNotifications,
    requestPermission 
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <Bell className="w-4 h-4" />;
      case 'info': return <Bell className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'emergency': return 'text-danger border-danger/30 bg-danger/10';
      case 'warning': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'info': return 'text-acid border-acid/30 bg-acid/10';
      default: return 'text-zinc-400 border-zinc-400/30 bg-zinc-400/10';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-acid transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </span>
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-surface border border-border rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-acid" />
              <span className="text-sm font-bold text-white">Emergency Alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearNotifications}
                className="text-[10px] font-mono text-dim hover:text-acid transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Permission Request */}
          {notifications.length === 0 && (
            <div className="p-4 text-center">
              <Bell className="w-8 h-8 text-dim mx-auto mb-3" />
              <p className="text-sm text-dim mb-4">No emergency alerts at this time</p>
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 bg-acid text-black text-sm font-bold rounded hover:bg-white transition-colors"
              >
                Enable Push Notifications
              </button>
              <p className="text-[10px] font-mono text-dim mt-2">
                Get instant alerts for critical grid events
              </p>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto custom-scroll">
            {notifications.slice(0, 20).map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-border hover:bg-white/5 transition-colors ${
                  !notification.read ? 'bg-panel/50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-bold text-white">
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-dim">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </span>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-acid hover:text-acid/80 transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="text-zinc-400 hover:text-danger transition-colors"
                          title="Remove notification"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-300 mb-3">
                      {notification.message}
                    </p>

                    {/* Metadata */}
                    {notification.metadata && (
                      <div className="flex items-center gap-4 text-[10px] font-mono text-dim">
                        {notification.metadata.poleId && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{notification.metadata.poleId}</span>
                          </div>
                        )}
                        {notification.metadata.severity && (
                          <span className={`px-2 py-1 rounded text-[8px] uppercase ${
                            notification.metadata.severity === 'critical' ? 'bg-danger text-white' :
                            notification.metadata.severity === 'high' ? 'bg-orange-500 text-white' :
                            notification.metadata.severity === 'medium' ? 'bg-yellow-400 text-black' :
                            'bg-acid text-black'
                          }`}>
                            {notification.metadata.severity}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {notification.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={action.action}
                            className="px-3 py-1 bg-acid text-black text-[10px] font-mono hover:bg-white transition-colors rounded"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 20 && (
            <div className="p-3 text-center border-t border-border">
              <p className="text-[10px] font-mono text-dim">
                Showing 20 of {notifications.length} alerts
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
