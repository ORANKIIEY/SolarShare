"use client";

import { useOfflineMode } from '@/hooks/useOfflineMode';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function OfflineModeIndicator() {
  const { 
    isOnline, 
    isOfflineMode, 
    offlineData, 
    syncStatus,
    syncData 
  } = useOfflineMode();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'syncing': return 'text-yellow-400';
      case 'success': return 'text-acid';
      case 'error': return 'text-danger';
      default: return 'text-zinc-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'syncing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success': return <Database className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!isOfflineMode) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-40 bg-surface border border-border rounded-lg p-4 shadow-2xl max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <WifiOff className="w-4 h-4 text-danger animate-pulse" />
          ) : (
            <Wifi className="w-4 h-4 text-acid" />
          )}
          <span className="text-sm font-bold text-white">
            {isOnline ? 'Offline Mode' : 'Reconnecting...'}
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-zinc-400 hover:text-white transition-colors"
          title="Refresh connection"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Status Message */}
      <div className="text-sm text-zinc-300 mb-4">
        {isOnline 
          ? 'Connection restored. Syncing offline data with server...'
          : 'No internet connection. Working in offline mode.'
        }
      </div>

      {/* Offline Stats */}
      <div className="space-y-3">
        <div className="text-[10px] font-mono text-dim uppercase">Offline Data</div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="text-center">
            <div className="text-zinc-400">Work Orders</div>
            <div className="text-lg font-bold text-white">
              {offlineData.workOrders.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-zinc-400">Telemetry</div>
            <div className="text-lg font-bold text-white">
              {offlineData.telemetry.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-zinc-400">Alerts</div>
            <div className="text-lg font-bold text-white">
              {offlineData.alerts.length}
            </div>
          </div>
          <div className="text-center col-span-2">
            <div className="text-zinc-400">Last Sync</div>
            <div className="text-sm font-bold text-white">
              {new Date(offlineData.lastSync).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Sync Status */}
        {isOnline && (
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(syncStatus)}
                <span className={`text-sm font-mono ${getStatusColor(syncStatus)}`}>
                  Sync {syncStatus}
                </span>
              </div>
              <button
                onClick={syncData}
                disabled={syncStatus === 'syncing'}
                className="px-3 py-1 bg-acid text-black text-[10px] font-mono hover:bg-white transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sync Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-panel/50 rounded text-[10px] font-mono text-dim">
        <div className="text-acid font-bold mb-2">Offline Mode Instructions:</div>
        <ul className="space-y-1">
          <li>• All work orders are saved locally</li>
          <li>• Telemetry data is cached for offline viewing</li>
          <li>• Emergency alerts are stored for immediate access</li>
          <li>• Data syncs automatically when connection is restored</li>
          <li>• Manual sync available with "Sync Now" button</li>
        </ul>
      </div>
    </div>
  );
}
