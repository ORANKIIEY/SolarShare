"use client";

import { useState, useEffect } from "react";
import LocationAwareMap from "@/features/map/LocationAwareMap";
import RealTimeTelemetry from "@/components/telemetry/RealTimeTelemetry";
import EmergencyAlerts from "@/components/notifications/EmergencyAlerts";
import OfflineModeIndicator from "@/components/offline/OfflineModeIndicator";
import { useToast } from "@/components/ui/Toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { 
  Zap, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Wrench,
  Phone,
  Navigation,
  Thermometer,
  Activity
} from "lucide-react";

interface WorkOrder {
  id: string;
  type: "inspection" | "emergency" | "maintenance";
  priority: "low" | "medium" | "high" | "critical";
  location: string;
  poleId: string;
  description: string;
  estimatedTime: string;
  status: "pending" | "in_progress" | "completed";
  assignedAt: string;
  area: string;
}

export default function WorkerDashboard() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { location, assignedArea, loading: geoLoading, error: geoError } = useGeolocation();
  const { workOrders, loading: workOrdersLoading, updateWorkOrderStatus } = useWorkOrders(assignedArea);

  const [workerStats, setWorkerStats] = useState({
    todayCompleted: 3,
    pendingOrders: 8,
    averageResponseTime: "12 min",
    currentLocation: "Sector 4, Block 10"
  });

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
    showToast(`Location selected: Pole ${id}`, "success");
  };

  const handleStartWork = async (orderId: string) => {
    await updateWorkOrderStatus(orderId, "in_progress");
    showToast(`Work order ${orderId} started`, "success");
  };

  const handleCompleteWork = async (orderId: string) => {
    await updateWorkOrderStatus(orderId, "completed");
    setWorkerStats(prev => ({ 
      ...prev, 
      todayCompleted: prev.todayCompleted + 1 
    }));
    showToast(`Work order ${orderId} completed`, "success");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "text-danger border-danger/30 bg-danger/10";
      case "high": return "text-orange-400 border-orange-400/30 bg-orange-400/10";
      case "medium": return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
      case "low": return "text-acid border-acid/30 bg-acid/10";
      default: return "text-zinc-400 border-zinc-400/30 bg-zinc-400/10";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "emergency": return AlertTriangle;
      case "inspection": return Wrench;
      case "maintenance": return Thermometer;
      default: return CheckCircle;
    }
  };

  return (
    <div className="p-6 md:p-12">
      <OfflineModeIndicator />
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-white uppercase">
            Field Operations <span className="text-acid">Mobile</span>
          </h1>
          <p className="text-zinc-500 font-mono text-sm">
            {geoLoading ? "Detecting location..." : assignedArea ? `${assignedArea.name}, ${assignedArea.province}` : "Location Unknown"} | {workOrders.filter(o => o.status === "pending").length} Pending Tasks
          </p>
          {geoError && (
            <p className="text-danger font-mono text-xs mt-1">
              ⚠️ {geoError}
            </p>
          )}
        </div>

        <div className="hidden md:flex gap-4 items-center">
          <EmergencyAlerts />
          
          <div className="h-10 w-px bg-border"></div>
          
          <div className="text-right">
            <div className="text-[10px] font-mono text-dim uppercase">Today Completed</div>
            <div className="text-xl font-bold text-acid font-mono">{workerStats.todayCompleted}</div>
          </div>
          <div className="h-10 w-px bg-border"></div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-dim uppercase">Avg Response</div>
            <div className="text-xl font-bold text-white font-mono">{workerStats.averageResponseTime}</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-border bg-surface/50 p-4 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-acid" />
            <div className="text-[10px] font-mono text-dim uppercase">On Duty</div>
          </div>
          <div className="text-lg font-bold text-white font-mono">06:00 - 18:00</div>
        </div>
        <div className="border border-border bg-surface/50 p-4 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="w-4 h-4 text-acid" />
            <div className="text-[10px] font-mono text-dim uppercase">Distance Today</div>
          </div>
          <div className="text-lg font-bold text-white font-mono">42.5 km</div>
        </div>
        <div className="border border-border bg-surface/50 p-4 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-acid" />
            <div className="text-[10px] font-mono text-dim uppercase">Emergency Calls</div>
          </div>
          <div className="text-lg font-bold text-white font-mono">2</div>
        </div>
        <div className="border border-border bg-surface/50 p-4 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-acid" />
            <div className="text-[10px] font-mono text-dim uppercase">Safety Score</div>
          </div>
          <div className="text-lg font-bold text-acid font-mono">98%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Orders */}
        <div className="border border-border bg-panel p-4 rounded-lg">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">
            Active Work Orders
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scroll">
            {workOrders.filter(order => order.status !== "completed").map((order) => {
              const TypeIcon = getTypeIcon(order.type);
              return (
                <div key={order.id} className="border border-border/50 rounded-lg p-3 bg-surface/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-4 h-4 text-acid" />
                      <span className="text-sm font-mono text-white">{order.id}</span>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-mono uppercase border ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-dim">{order.assignedAt}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2 text-[11px] text-zinc-400">
                    <MapPin className="w-3 h-3" />
                    <span>{order.location}</span>
                    <span className="text-acid">•</span>
                    <span>Pole {order.poleId}</span>
                  </div>
                  
                  <p className="text-xs text-zinc-300 mb-3">{order.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-dim">
                      Est. {order.estimatedTime}
                    </span>
                    <div className="flex gap-2">
                      {order.status === "pending" && (
                        <button
                          onClick={() => handleStartWork(order.id)}
                          className="px-3 py-1 bg-acid text-black text-[10px] font-bold uppercase hover:bg-white transition-colors rounded"
                        >
                          Start
                        </button>
                      )}
                      {order.status === "in_progress" && (
                        <button
                          onClick={() => handleCompleteWork(order.id)}
                          className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold uppercase hover:bg-green-500 transition-colors rounded"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Real-Time Telemetry */}
      <div className="border border-border bg-panel p-4 rounded-lg mb-6">
        <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">
          Live Telemetry Stream
        </h3>
        <RealTimeTelemetry assignedArea={assignedArea} />
      </div>

      {/* Map View */}
        <div className="border border-border bg-panel p-4 rounded-lg">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">
            Location Map - {assignedArea ? `${assignedArea.name} Only` : 'Location Required'}
          </h3>
          <div className="h-96 rounded-lg overflow-hidden">
            <LocationAwareMap 
              onPoleClick={handleNodeClick} 
              assignedArea={assignedArea || undefined}
            />
          </div>
          {selectedNodeId && (
            <div className="mt-3 p-2 bg-surface/50 rounded text-[11px] font-mono text-acid">
              Selected: Pole {selectedNodeId}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="p-4 border border-border bg-surface/50 rounded-lg hover:border-acid/30 transition-colors group">
          <Zap className="w-5 h-5 text-acid mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-white">Report Emergency</div>
        </button>
        <button className="p-4 border border-border bg-surface/50 rounded-lg hover:border-acid/30 transition-colors group">
          <Wrench className="w-5 h-5 text-acid mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-white">Log Maintenance</div>
        </button>
        <button className="p-4 border border-border bg-surface/50 rounded-lg hover:border-acid/30 transition-colors group">
          <Phone className="w-5 h-5 text-acid mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-white">Contact Dispatch</div>
        </button>
        <button className="p-4 border border-border bg-surface/50 rounded-lg hover:border-acid/30 transition-colors group">
          <Navigation className="w-5 h-5 text-acid mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-white">Get Directions</div>
        </button>
      </div>
    </div>
  );
}
