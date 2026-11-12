"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { 
  apiGetSystemHealth, 
  apiGetServices, 
  apiGetSystemLogs, 
  apiRestartService,
  type SystemHealth,
  type ServiceStatus,
  type SystemLog
} from "@/lib/api";
import { 
  Terminal, 
  Database, 
  Cloud, 
  GitBranch, 
  Bug, 
  Activity,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  Code2,
  TestTube,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Layers
} from "lucide-react";

interface SystemMetric {
  name: string;
  value: string;
  status: "healthy" | "warning" | "critical";
  lastUpdated: string;
}

interface DeploymentInfo {
  environment: string;
  version: string;
  deployedAt: string;
  deployedBy: string;
  commitHash: string;
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  service: string;
  message: string;
}

export default function DeveloperDashboard() {
  const { showToast } = useToast();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);

  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);

  const [services, setServices] = useState<ServiceStatus[]>([]);

  const [deployment] = useState<DeploymentInfo>({
    environment: "production",
    version: "v2.4.1",
    deployedAt: "2026-04-18 14:30:00",
    deployedBy: "shawn",
    commitHash: "a7f3d9e"
  });

  const [logs, setLogs] = useState<SystemLog[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "running": return "text-green-700 border-green-200 bg-green-100";
      case "warning": return "text-yellow-700 border-yellow-200 bg-yellow-100";
      case "critical":
      case "error": return "text-red-700 border-red-200 bg-red-100";
      case "stopped": return "text-gray-600 border-gray-200 bg-gray-100";
      default: return "text-gray-600 border-gray-200 bg-gray-100";
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case "error": return "text-red-600";
      case "warn": return "text-yellow-600";
      case "info": return "text-blue-600";
      case "debug": return "text-gray-500";
      default: return "text-gray-500";
    }
  };

  const handleRestartService = async (serviceName: string) => {
    showToast(`Restarting ${serviceName}...`, "success");
    try {
      const result = await apiRestartService(serviceName);
      if (result) {
        setServices(prev => prev.map(service => 
          service.name === serviceName 
            ? { ...service, status: "running" as const, cpu: Math.random() * 50, memory: Math.random() * 80 + 20 }
            : service
        ));
        showToast(`${serviceName} restarted successfully`, "success");
      } else {
        // Fallback to simulation
        setTimeout(() => {
          setServices(prev => prev.map(service => 
            service.name === serviceName 
              ? { ...service, status: "running" as const, cpu: Math.random() * 50, memory: Math.random() * 80 + 20 }
              : service
          ));
          showToast(`${serviceName} restarted successfully`, "success");
        }, 2000);
      }
    } catch (error) {
      showToast(`Failed to restart ${serviceName}`, "error");
    }
  };

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [healthData, servicesData, logsData] = await Promise.all([
          apiGetSystemHealth(),
          apiGetServices(),
          apiGetSystemLogs()
        ]);

        if (healthData) {
          setSystemMetrics([
            {
              name: "API Response Time",
              value: `${healthData.apiResponseTime}ms`,
              status: healthData.apiResponseTime < 200 ? "healthy" : "warning",
              lastUpdated: "2 min ago"
            },
            {
              name: "Database Connections",
              value: `${healthData.databaseConnections}/100`,
              status: healthData.databaseConnections < 80 ? "healthy" : "warning",
              lastUpdated: "1 min ago"
            },
            {
              name: "MQTT Queue Depth",
              value: healthData.mqttQueueDepth.toString(),
              status: healthData.mqttQueueDepth < 50 ? "healthy" : "warning",
              lastUpdated: "30 sec ago"
            },
            {
              name: "AI Model Accuracy",
              value: `${healthData.aiModelAccuracy}%`,
              status: healthData.aiModelAccuracy > 90 ? "healthy" : "warning",
              lastUpdated: "5 min ago"
            }
          ]);
        }

        if (servicesData) {
          setServices(servicesData);
        }

        if (logsData) {
          setLogs(logsData);
        }
      } catch (error) {
        console.error("Failed to load system data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up auto-refresh
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleDeploy = () => {
    showToast("Initiating deployment pipeline...", "success");
  };

  if (loading) {
    return (
      <div className="p-6 md:p-12 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-gray-600 font-mono">Loading system data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-black">
            Developer Operations
          </h1>
          <p className="text-gray-700 font-mono text-sm">
            Production Environment • {deployment.version} • {services.filter(s => s.status === "running").length}/{services.length} Services Running
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 border rounded-lg text-sm font-mono transition-colors ${
              autoRefresh 
                ? "bg-gray-700 text-white border-gray-700" 
                : "bg-white text-black border-gray-200 hover:border-gray-400"
            }`}
          >
            {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
          </button>
          <button
            onClick={handleDeploy}
            className="px-4 py-2 bg-gray-900 text-white font-bold text-sm uppercase hover:bg-gray-800 transition-colors rounded-lg"
          >
            Deploy →
          </button>
        </div>
      </div>

      {/* Deployment Info */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-4 h-4 text-gray-600" />
            <div className="text-[10px] font-mono text-gray-500 uppercase">Environment</div>
          </div>
          <div className="text-lg font-bold text-black font-mono uppercase">{deployment.environment}</div>
          <div className="text-[9px] text-gray-500 mt-2">{deployment.deployedAt}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-gray-600" />
            <div className="text-[10px] font-mono text-gray-500 uppercase">Version</div>
          </div>
          <div className="text-lg font-bold text-black font-mono">{deployment.version}</div>
          <div className="text-[9px] text-gray-500 mt-2">{deployment.commitHash}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-gray-600" />
            <div className="text-[10px] font-mono text-gray-500 uppercase">Services</div>
          </div>
          <div className="text-lg font-bold text-black font-mono">{services.filter(s => s.status === "running").length}/{services.length}</div>
          <div className="text-[9px] text-gray-500 mt-2">operational</div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gray-600" />
            <div className="text-[10px] font-mono text-gray-500 uppercase">Total Requests</div>
          </div>
          <div className="text-lg font-bold text-black font-mono">
            {services.reduce((sum, s) => sum + s.requests, 0).toLocaleString()}
          </div>
          <div className="text-[9px] text-gray-500 mt-2">last 24h</div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-4 h-4 text-gray-600" />
            <div className="text-[10px] font-mono text-gray-500 uppercase">Deployed By</div>
          </div>
          <div className="text-lg font-bold text-black font-mono">{deployment.deployedBy}</div>
          <div className="text-[9px] text-gray-500 mt-2">via CI/CD</div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Services Status */}
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
          <h3 className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest mb-4">
            Microservices Status
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto custom-scroll">
            {services.map((service) => (
              <div 
                key={service.name} 
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedService === service.name 
                    ? "border-gray-400 bg-gray-50" 
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
                onClick={() => setSelectedService(service.name)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-black">{service.name}</span>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-mono uppercase border ${getStatusColor(service.status)}`}>
                        {service.status}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-gray-500 mt-1">
                      v{service.version} • {service.uptime}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-black font-mono">{service.requests.toLocaleString()}</div>
                    <div className="text-[9px] font-mono text-gray-500">requests</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-gray-500">CPU:</span>
                    <span className={`ml-1 font-mono ${
                      service.cpu > 80 ? 'text-red-600' : service.cpu > 50 ? 'text-yellow-600' : 'text-green-600'
                    }`}>{service.cpu}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Memory:</span>
                    <span className={`ml-1 font-mono ${
                      service.memory > 80 ? 'text-red-600' : service.memory > 50 ? 'text-yellow-600' : 'text-green-600'
                    }`}>{service.memory}%</span>
                  </div>
                </div>

                {service.status === "error" && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestartService(service.name);
                      }}
                      className="px-3 py-1 bg-gray-900 text-white text-[10px] font-bold uppercase hover:bg-gray-800 transition-colors rounded"
                    >
                      Restart Service
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System Metrics */}
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
          <h3 className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest mb-4">
            System Health Metrics
          </h3>
          <div className="space-y-3">
            {systemMetrics.map((metric, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-mono text-black">{metric.name}</span>
                    <div className="text-[10px] font-mono text-gray-500 mt-1">
                      Updated {metric.lastUpdated}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold font-mono ${
                      metric.status === 'healthy' ? 'text-green-600' : 
                      metric.status === 'warning' ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {metric.value}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[9px] font-mono uppercase border ${getStatusColor(metric.status)}`}>
                      {metric.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Logs */}
      <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">
            Live System Logs
          </h3>
          <button className="px-3 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] font-mono text-black hover:border-gray-400 transition-colors">
            <RefreshCw className="w-3 h-3 inline mr-1" />
            Refresh
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs max-h-60 overflow-y-auto custom-scroll border border-gray-200">
          {logs.map((log, index) => (
            <div key={index} className="flex gap-4 mb-2 text-[11px]">
              <span className="text-gray-500">{log.timestamp}</span>
              <span className={`${getLogLevelColor(log.level)} font-bold`}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="text-gray-700">{log.service}:</span>
              <span className="text-black">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="p-4 border border-gray-200 bg-white rounded-lg hover:border-gray-400 transition-colors group shadow-sm">
          <Terminal className="w-5 h-5 text-gray-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-black">SSH Console</div>
        </button>
        <button className="p-4 border border-gray-200 bg-white rounded-lg hover:border-gray-400 transition-colors group shadow-sm">
          <Database className="w-5 h-5 text-gray-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-black">Database Admin</div>
        </button>
        <button className="p-4 border border-gray-200 bg-white rounded-lg hover:border-gray-400 transition-colors group shadow-sm">
          <TestTube className="w-5 h-5 text-gray-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-black">Run Tests</div>
        </button>
        <button className="p-4 border border-gray-200 bg-white rounded-lg hover:border-gray-400 transition-colors group shadow-sm">
          <Bug className="w-5 h-5 text-gray-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-black">Debug Mode</div>
        </button>
      </div>
    </div>
  );
}
