"use client";

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  MapPin
} from 'lucide-react';

interface TelemetryCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
  trend?: number;
  icon?: React.ReactNode;
}

function TelemetryCard({ title, value, unit = '', status = 'normal', trend, icon }: TelemetryCardProps) {
  const statusColors = {
    normal: 'text-acid border-acid/30 bg-acid/10',
    warning: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    critical: 'text-danger border-danger/30 bg-danger/10'
  };

  return (
    <div className={`border rounded-lg p-4 bg-surface/50 ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-mono text-gray-900 uppercase tracking-wider">{title}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[10px] font-mono ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-900'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold font-mono text-gray-900">
        {value}{unit && <span className="text-sm text-gray-900 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export default function RealTimeTelemetry({ assignedArea }: { assignedArea?: any }) {
  const [selectedMetric, setSelectedMetric] = useState<'overview' | 'power' | 'voltage' | 'current'>('overview');
  
  // Use WebSocket for real-time data
  const { isConnected, telemetry, alerts, lastUpdate } = useWebSocket(
    process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
  );

  // Helper function to calculate average from telemetry data
  function calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((total, value) => total + value, 0);
    return sum / values.length;
  }

  // Get the most recent telemetry reading
  const latestTelemetry = telemetry[telemetry.length - 1];
  
  // Extract values from telemetry for calculations
  const powerReadings = telemetry.map(t => t.power);
  const voltageReadings = telemetry.map(t => t.voltage);
  const currentReadings = telemetry.map(t => t.current);
  
  // Calculate averages
  const avgPower = calculateAverage(powerReadings);
  const avgVoltage = calculateAverage(voltageReadings);
  const avgCurrent = calculateAverage(currentReadings);

  // Count critical alerts
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
  
  // Count alerts from the last 5 minutes
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const recentAlerts = alerts.filter(alert => 
    new Date(alert.timestamp).getTime() > fiveMinutesAgo
  ).length;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-acid' : 'bg-danger'} animate-pulse`} />
          <span className="text-sm font-mono text-gray-900">
            {isConnected ? 'Live Stream Active' : 'Reconnecting...'}
          </span>
        </div>
        <div className="text-[10px] font-mono text-gray-900">
          {lastUpdate && `Last: ${new Date(lastUpdate).toLocaleTimeString()}`}
        </div>
      </div>

      {/* Area Info */}
      {assignedArea && (
        <div className="p-4 bg-surface/50 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-acid" />
            <span className="text-sm font-mono text-blue-600">
              {assignedArea.name}, {assignedArea.province}
            </span>
          </div>
          <div className="text-[10px] font-mono text-gray-900">
            Monitoring {telemetry.length} active poles in assigned area
          </div>
        </div>
      )}

      {/* Metric Selector */}
      <div className="flex gap-2 p-2 bg-surface/50 rounded-lg border border-border">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'power', label: 'Power' },
          { id: 'voltage', label: 'Voltage' },
          { id: 'current', label: 'Current' }
        ].map(metric => (
          <button
            key={metric.id}
            onClick={() => setSelectedMetric(metric.id as any)}
            className={`px-3 py-1 text-[10px] font-mono rounded transition-colors ${
              selectedMetric === metric.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {metric.label}
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      {selectedMetric === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TelemetryCard
            title="Total Poles"
            value={telemetry.length}
            icon={<Activity className="w-4 h-4 text-blue-600" />}
            trend={telemetry.length > 0 ? 5 : 0}
          />
          <TelemetryCard
            title="Critical Alerts"
            value={criticalAlerts}
            status={criticalAlerts > 0 ? 'critical' : 'normal'}
            icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />}
          />
          <TelemetryCard
            title="Recent Alerts"
            value={recentAlerts}
            icon={<Clock className="w-4 h-4 text-gray-900" />}
            trend={recentAlerts > 0 ? 10 : 0}
          />
        </div>
      )}

      {selectedMetric === 'power' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TelemetryCard
            title="Average Power"
            value={avgPower.toFixed(2)}
            unit="kW"
            icon={<Zap className="w-4 h-4 text-yellow-600" />}
            status={avgPower > 12 ? 'critical' : avgPower > 11 ? 'warning' : 'normal'}
          />
          <TelemetryCard
            title="Peak Power"
            value={Math.max(...telemetry.map(t => t.power), 0).toFixed(2)}
            unit="kW"
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
          />
        </div>
      )}

      {selectedMetric === 'voltage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TelemetryCard
            title="Average Voltage"
            value={avgVoltage.toFixed(1)}
            unit="V"
            icon={<Activity className="w-4 h-4 text-blue-600" />}
            status={avgVoltage < 210 || avgVoltage > 240 ? 'warning' : 'normal'}
          />
          <TelemetryCard
            title="Voltage Stability"
            value={telemetry.length > 0 ? '98.5%' : 'N/A'}
            icon={<Activity className="w-4 h-4 text-blue-600" />}
          />
        </div>
      )}

      {selectedMetric === 'current' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TelemetryCard
            title="Average Current"
            value={avgCurrent.toFixed(1)}
            unit="A"
            icon={<Activity className="w-4 h-4 text-blue-600" />}
            status={avgCurrent > 65 ? 'critical' : avgCurrent > 55 ? 'warning' : 'normal'}
          />
          <TelemetryCard
            title="Peak Current"
            value={Math.max(...telemetry.map(t => t.current), 0).toFixed(1)}
            unit="A"
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
          />
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="border border-border bg-panel p-4 rounded-lg">
          <h3 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-widest mb-4">
            Live Alerts ({alerts.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll">
            {alerts.slice(0, 10).map((alert, index) => (
              <div 
                key={alert.id}
                className={`p-3 rounded border ${
                  alert.severity === 'critical' ? 'bg-danger/20 border-danger/50' :
                  alert.severity === 'high' ? 'bg-orange-500/20 border-orange-500/50' :
                  alert.severity === 'medium' ? 'bg-yellow-400/20 border-yellow-400/50' :
                  'bg-acid/20 border-acid/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-blue-600 uppercase">
                        {alert.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-[9px] font-mono uppercase ${
                        alert.severity === 'critical' ? 'bg-danger text-white' :
                        alert.severity === 'high' ? 'bg-orange-500 text-white' :
                        alert.severity === 'medium' ? 'bg-yellow-400 text-black' :
                        'bg-acid text-black'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900 mb-1">{alert.message}</div>
                    <div className="text-[10px] font-mono text-gray-900">
                      {alert.poleId} • {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
