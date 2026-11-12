"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Target,
  Calendar
} from "lucide-react";

interface WorkerPerformance {
  id: string;
  name: string;
  sector: string;
  tasksCompleted: number;
  responseTime: string;
  efficiency: number;
  safetyScore: number;
  status: "active" | "off_duty" | "on_break";
}

interface SectorMetrics {
  sector: string;
  thefRate: number;
  revenueLoss: number;
  workersDeployed: number;
  alertsResolved: number;
  customerSatisfaction: number;
  uptime: number;
}

interface FinancialSummary {
  monthlyRevenue: number;
  monthlyLosses: number;
  recoveredAmount: number;
  roi: number;
  savingsYTD: number;
}

export default function GovernanceDashboard() {
  const { showToast } = useToast();
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [selectedSector, setSelectedSector] = useState("all");

  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    monthlyRevenue: 2845000,
    monthlyLosses: 124500,
    recoveredAmount: 89000,
    roi: 312.5,
    savingsYTD: 2845000
  });

  const [workerPerformance, setWorkerPerformance] = useState<WorkerPerformance[]>([
    {
      id: "TECH-042",
      name: "Thabo Mokoena",
      sector: "Sector 4",
      tasksCompleted: 12,
      responseTime: "8 min",
      efficiency: 94,
      safetyScore: 98,
      status: "active"
    },
    {
      id: "TECH-038",
      name: "Sarah Ndlovu",
      sector: "Sector 3",
      tasksCompleted: 15,
      responseTime: "12 min",
      efficiency: 88,
      safetyScore: 96,
      status: "active"
    },
    {
      id: "TECH-041",
      name: "James Peterson",
      sector: "Sector 2",
      tasksCompleted: 8,
      responseTime: "15 min",
      efficiency: 82,
      safetyScore: 94,
      status: "on_break"
    }
  ]);

  const [sectorMetrics, setSectorMetrics] = useState<SectorMetrics[]>([
    {
      sector: "Sector 1",
      thefRate: 2.1,
      revenueLoss: 45000,
      workersDeployed: 8,
      alertsResolved: 24,
      customerSatisfaction: 94,
      uptime: 99.8
    },
    {
      sector: "Sector 2",
      thefRate: 3.8,
      revenueLoss: 89000,
      workersDeployed: 6,
      alertsResolved: 18,
      customerSatisfaction: 89,
      uptime: 98.5
    },
    {
      sector: "Sector 3",
      thefRate: 8.2,
      revenueLoss: 156000,
      workersDeployed: 10,
      alertsResolved: 31,
      customerSatisfaction: 76,
      uptime: 95.2
    },
    {
      sector: "Sector 4",
      thefRate: 0.4,
      revenueLoss: 12000,
      workersDeployed: 4,
      alertsResolved: 8,
      customerSatisfaction: 98,
      uptime: 99.9
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-acid border-acid/30 bg-acid/10";
      case "off_duty": return "text-zinc-400 border-zinc-400/30 bg-zinc-400/10";
      case "on_break": return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
      default: return "text-zinc-400 border-zinc-400/30 bg-zinc-400/10";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 md:p-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-white uppercase">
            Municipal Governance <span className="text-acid">Command</span>
          </h1>
          <p className="text-zinc-500 font-mono text-sm">
            City-wide Operations Overview | {sectorMetrics.reduce((sum, s) => sum + s.workersDeployed, 0)} Workers Deployed
          </p>
        </div>

        <div className="flex gap-4">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded text-sm font-mono text-white focus:border-acid outline-none"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter</option>
          </select>
          <select 
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded text-sm font-mono text-white focus:border-acid outline-none"
          >
            <option value="all">All Sectors</option>
            <option value="sector-1">Sector 1</option>
            <option value="sector-2">Sector 2</option>
            <option value="sector-3">Sector 3</option>
            <option value="sector-4">Sector 4</option>
          </select>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="md:col-span-2 border border-border bg-surface/50 p-4 rounded">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-acid" />
            <div className="text-[10px] font-mono text-dim uppercase">Monthly Revenue</div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{formatCurrency(financialSummary.monthlyRevenue)}</div>
          <div className="text-[9px] text-zinc-600 mt-2">+12.3% from last month</div>
        </div>
        <div className="border border-border bg-surface/50 p-4 rounded">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-danger" />
            <div className="text-[10px] font-mono text-dim uppercase">Monthly Losses</div>
          </div>
          <div className="text-2xl font-bold text-danger font-mono">{formatCurrency(financialSummary.monthlyLosses)}</div>
          <div className="text-[9px] text-zinc-600 mt-2">-8.7% from last month</div>
        </div>
        <div className="border border-border bg-surface/50 p-4 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-acid" />
            <div className="text-[10px] font-mono text-dim uppercase">Recovered</div>
          </div>
          <div className="text-2xl font-bold text-acid font-mono">{formatCurrency(financialSummary.recoveredAmount)}</div>
          <div className="text-[9px] text-zinc-600 mt-2">71.4% recovery rate</div>
        </div>
        <div className="border border-border bg-surface/50 p-4 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-acid" />
            <div className="text-[10px] font-mono text-dim uppercase">ROI</div>
          </div>
          <div className="text-2xl font-bold text-acid font-mono">{financialSummary.roi}%</div>
          <div className="text-[9px] text-zinc-600 mt-2">Year to date</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sector Performance */}
        <div className="border border-border bg-panel p-4 rounded-lg">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">
            Sector Performance Metrics
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto custom-scroll">
            {sectorMetrics.map((sector) => (
              <div key={sector.sector} className="border border-border/50 rounded-lg p-3 bg-surface/30">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm font-mono text-white">{sector.sector}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-mono text-dim">
                        {sector.workersDeployed} workers
                      </span>
                      <span className="text-[10px] font-mono text-dim">
                        {sector.alertsResolved} alerts resolved
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold font-mono ${
                      sector.thefRate > 5 ? 'text-danger' : sector.thefRate > 2 ? 'text-yellow-400' : 'text-acid'
                    }`}>
                      {sector.thefRate}%
                    </div>
                    <div className="text-[9px] font-mono text-dim">theft rate</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span className="text-dim">Losses:</span>
                    <span className="ml-1 text-white font-mono">{formatCurrency(sector.revenueLoss)}</span>
                  </div>
                  <div>
                    <span className="text-dim">Satisfaction:</span>
                    <span className="ml-1 text-acid font-mono">{sector.customerSatisfaction}%</span>
                  </div>
                  <div>
                    <span className="text-dim">Uptime:</span>
                    <span className="ml-1 text-acid font-mono">{sector.uptime}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worker Performance */}
        <div className="border border-border bg-panel p-4 rounded-lg">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">
            Field Team Performance
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto custom-scroll">
            {workerPerformance.map((worker) => (
              <div key={worker.id} className="border border-border/50 rounded-lg p-3 bg-surface/30">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-white">{worker.name}</span>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-mono uppercase border ${getStatusColor(worker.status)}`}>
                        {worker.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-dim mt-1">
                      {worker.id} • {worker.sector}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-acid font-mono">{worker.efficiency}%</div>
                    <div className="text-[9px] font-mono text-dim">efficiency</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <span className="text-dim">Tasks:</span>
                    <span className="ml-1 text-white font-mono">{worker.tasksCompleted}</span>
                  </div>
                  <div>
                    <span className="text-dim">Response:</span>
                    <span className="ml-1 text-acid font-mono">{worker.responseTime}</span>
                  </div>
                  <div>
                    <span className="text-dim">Safety:</span>
                    <span className="ml-1 text-acid font-mono">{worker.safetyScore}%</span>
                  </div>
                  <div>
                    <span className="text-dim">Score:</span>
                    <span className="ml-1 text-white font-mono">{Math.round((worker.efficiency + worker.safetyScore) / 2)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button className="p-4 border border-border bg-surface/50 rounded-lg hover:border-acid/30 transition-colors group">
          <Users className="w-5 h-5 text-acid mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-white">Deploy Workers</div>
        </button>
        <button className="p-4 border border-border bg-surface/50 rounded-lg hover:border-acid/30 transition-colors group">
          <BarChart3 className="w-5 h-5 text-acid mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-white">Generate Reports</div>
        </button>
        <button className="p-4 border border-border bg-surface/50 rounded-lg hover:border-acid/30 transition-colors group">
          <Calendar className="w-5 h-5 text-acid mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-white">Schedule Review</div>
        </button>
        <button className="p-4 border border-border bg-surface/50 rounded-lg hover:border-acid/30 transition-colors group">
          <AlertTriangle className="w-5 h-5 text-acid mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-mono text-white">Crisis Management</div>
        </button>
      </div>

      {/* YTD Summary */}
      <div className="border border-border bg-panel p-4 rounded-lg">
        <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">
          Year to Date Performance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-acid font-mono">{formatCurrency(financialSummary.savingsYTD)}</div>
            <div className="text-[10px] font-mono text-dim uppercase">Total Savings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white font-mono">1,247</div>
            <div className="text-[10px] font-mono text-dim uppercase">Thefts Prevented</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-acid font-mono">99.2%</div>
            <div className="text-[10px] font-mono text-dim uppercase">Grid Reliability</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white font-mono">94.5%</div>
            <div className="text-[10px] font-mono text-dim uppercase">Customer Satisfaction</div>
          </div>
        </div>
      </div>
    </div>
  );
}
