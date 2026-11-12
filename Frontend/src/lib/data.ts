// lib/data.ts

export type AssetStatus = "healthy" | "warning" | "critical" | "offline";

export interface Asset {
  id: string;
  type: "Transformer" | "Pole" | "Substation";
  location: string;
  status: AssetStatus;
  load: number; // Percentage
  lastInspection: string;
}

export const MOCK_ASSETS: Asset[] = [
  { id: "TR-01", type: "Transformer", location: "Sector 4 - North", status: "healthy", load: 45, lastInspection: "2026-01-10" },
  { id: "TR-02", type: "Transformer", location: "Sector 4 - East", status: "warning", load: 88, lastInspection: "2026-02-01" },
  { id: "TR-03", type: "Pole", location: "Sector 4 - West", status: "critical", load: 120, lastInspection: "2026-02-11" },
  { id: "TR-04", type: "Pole", location: "Sector 4 - South", status: "healthy", load: 30, lastInspection: "2026-01-15" },
  { id: "SUB-01", type: "Substation", location: "Sector 4 - Main", status: "healthy", load: 65, lastInspection: "2025-12-20" },
  { id: "TR-05", type: "Transformer", location: "Sector 3 - Border", status: "offline", load: 0, lastInspection: "2026-02-09" },
];

export const SYSTEM_LOGS = [
  { id: 1, time: "10:42", event: "User 'Admin' updated threshold to 95%" },
  { id: 2, time: "10:30", event: "Automated isolation triggered on TR-03" },
  { id: 3, time: "09:15", event: "System backup completed" },
];

export const MOCK_DASHBOARD_SUMMARY = {
  totalNodes: 1240,
  activeAlerts: 2,
  investigatingCount: 1,
  avgLoad: 68.5,
  latestConfidence: 94.01,
  totalSectorLoad: 14.2,
  activeLosses: 12450
};

export const MOCK_INCIDENTS = [
  { id: "INC-001", time: "10:30", location: "Sector 4 - West", type: "Ghost Load", status: "active", confidence: 94, createdAt: "2026-03-15T10:30:00Z" },
  { id: "INC-002", time: "09:15", location: "Sector 3 - Border", type: "Line Bypass", status: "investigating", confidence: 88, createdAt: "2026-03-15T09:15:00Z" }
];

export const MOCK_NOTIFICATIONS = [
  { id: "NT-1", title: "Theft Detected", message: "Ghost load detected at Pole TR-03", severity: "high", isRead: false, createdAt: new Date().toISOString() },
  { id: "NT-2", title: "System Update", message: "GridGuard AI core updated to v2.4", severity: "info", isRead: true, createdAt: new Date().toISOString() }
];

export const MOCK_TELEMETRY = [
  { time: "10:00", deviceId: "TR-01", current: 45 },
  { time: "10:05", deviceId: "TR-01", current: 47 },
  { time: "10:10", deviceId: "TR-01", current: 44 }
];
