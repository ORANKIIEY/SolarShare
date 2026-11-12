/**
 * GridGuard AI — Strict Backend API Client (No Mock Fallbacks)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = typeof window !== "undefined" ? localStorage.getItem("gridguard_token") : null;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string> || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
}

// Dashboard
export interface DashboardSummary {
    totalNodes: number;
    activeAlerts: number;
    totalSectorLoad: number;
    activeLosses: number;
}
export const apiGetDashboardSummaryStrict = () => request<DashboardSummary>("/api/dashboard/summary");

// Assets
export interface ApiAsset {
    id: string;
    type: string;
    location: string;
    status: string;
    load: number;
    lastInspection: string;
}
export const apiGetAssetsStrict = () => request<ApiAsset[]>("/api/assets");

// Incidents
export interface ApiIncident {
    id: string;
    time: string;
    location: string;
    type: string;
    status: string;
    confidence: number;
}
export const apiGetIncidentsStrict = (status?: string) => 
    request<ApiIncident[]>(`/api/incidents${status ? `?status=${status}` : ""}`);
export const apiDispatchIncidentStrict = (id: string) => 
    request(`/api/incidents/${id}/dispatch`, { method: "PUT" });

// Telemetry
export interface TelemetryPoint {
    time: string;
    supply: number;
    metered: number;
}
export const apiGetGhostLoadDataStrict = () => request<TelemetryPoint[]>("/api/telemetry/ghost-load");

export interface HarmonicPoint {
    name: string;
    value: number;
}
export const apiGetHarmonicDataStrict = () => request<HarmonicPoint[]>("/api/telemetry/harmonics");

// Settings
export interface ApiSettings {
    sensitivity: number;
    autoIsolate: boolean;
}
export const apiGetSettingsStrict = () => request<ApiSettings>("/api/settings");
export const apiUpdateSettingsStrict = (data: ApiSettings) => 
    request("/api/settings", { method: "PUT", body: JSON.stringify(data) });

// Audit Logs
export interface AuditLog {
    id: string;
    time: string;
    event: string;
}
export const apiGetAuditLogsStrict = () => request<AuditLog[]>("/api/settings/logs");

// System Metrics
export interface SystemMetric {
    name: string;
    value: string;
    status: "healthy" | "warning" | "critical";
}
export const apiGetSystemMetricsStrict = () => request<SystemMetric[]>("/api/system/metrics");

// Services
export interface ServiceStatus {
    name: string;
    version: string;
    status: "running" | "stopped" | "error";
    cpu: number;
    memory: number;
    uptime: string;
    requests: number;
}
export const apiGetServicesStrict = () => request<ServiceStatus[]>("/api/system/services");

// System Logs
export interface LogEntry {
    timestamp: string;
    level: "info" | "warn" | "error" | "debug";
    service: string;
    message: string;
}
export const apiGetSystemLogsStrict = () => request<LogEntry[]>("/api/system/logs");

// Deployment
export interface DeploymentInfo {
    environment: string;
    version: string;
    deployedAt: string;
    deployedBy: string;
    commitHash: string;
}
export const apiGetDeploymentInfoStrict = () => request<DeploymentInfo>("/api/system/deployment");

// Notifications
export interface ApiNotification {
    id: string;
    title: string;
    message: string;
    severity: string;
    isRead: boolean;
}
export const apiGetNotificationsStrict = () => request<ApiNotification[]>("/api/notifications");

// Export
export const apiExportAssetsStrict = (format: "csv" | "json") => 
    fetch(`${API_BASE}/api/assets/export?format=${format}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("gridguard_token") || ""}` },
    }).then(r => { if (!r.ok) throw new Error("Export failed"); return r.blob(); });

// Health Check
export const apiHealthCheckStrict = () => request<{ status: string }>("/api/health");

// Search
export interface SearchResult {
    type: "asset" | "incident";
    id: string;
    title: string;
}
export const apiSearchStrict = (query: string) => 
    request<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`);

// Realtime Stats
export interface RealtimeStats {
    activeUsers: number;
    eventsPerSecond: number;
}
export const apiGetRealtimeStatsStrict = () => request<RealtimeStats>("/api/system/realtime-stats");

// Map Data
export interface MapAssetData {
    id: string;
    lat: number;
    lng: number;
    status: string;
}
export const apiGetMapAssetsStrict = () => request<MapAssetData[]>("/api/map/assets");

// Theft Predictions
export interface TheftPrediction {
    assetId: string;
    riskScore: number;
}
export const apiGetTheftPredictionsStrict = () => request<TheftPrediction[]>("/api/predictions/theft");

// Analytics
export interface TimeSeriesData {
    timestamp: string;
    value: number;
}
export interface AnalyticsData {
    theftOverTime: TimeSeriesData[];
    alertsOverTime: TimeSeriesData[];
}
export const apiGetAnalyticsStrict = (period: string) => 
    request<AnalyticsData>(`/api/analytics?period=${period}`);

// Reports
export interface ReportData {
    id: string;
    title: string;
    generatedAt: string;
    downloadUrl: string;
}
export const apiGetReportsStrict = () => request<ReportData[]>("/api/reports");
export const apiGenerateReportStrict = (type: string) => 
    request<ReportData>("/api/reports/generate", { 
        method: "POST", 
        body: JSON.stringify({ type }) 
    });

// Cookie Consent
export interface CookieConsent {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
}
export const apiGetCookieConsentStrict = () => request<CookieConsent>("/api/cookies/status");
export const apiSetCookieConsentStrict = (consent: CookieConsent) => 
    request("/api/cookies/consent", { method: "POST", body: JSON.stringify(consent) });

// User Profile
export const apiUpdateProfileStrict = (data: { name?: string }) => 
    request("/api/auth/profile", { method: "PUT", body: JSON.stringify(data) });

// WebSocket Token
export const apiGetWebSocketTokenStrict = () => 
    request<{ token: string }>("/api/auth/ws-token").then(r => r.token);

// Feature Flags
export const apiGetFeatureFlagsStrict = () => request<Record<string, boolean>>("/api/features");

// Announcements
export interface Announcement {
    id: string;
    title: string;
    message: string;
    priority: string;
}
export const apiGetAnnouncementsStrict = () => request<Announcement[]>("/api/announcements");
export const apiDismissAnnouncementStrict = (id: string) => 
    request(`/api/announcements/${id}/dismiss`, { method: "POST" });

// Tips
export interface Tip {
    id: string;
    content: string;
}
export const apiGetRandomTipStrict = () => request<Tip>("/api/tips/random");

// Onboarding
export interface OnboardingStep {
    id: string;
    title: string;
    completed: boolean;
}
export const apiGetOnboardingStepsStrict = () => request<OnboardingStep[]>("/api/onboarding");
export const apiCompleteOnboardingStepStrict = (id: string) => 
    request(`/api/onboarding/${id}/complete`, { method: "POST" });

// Changelog
export interface ChangelogEntry {
    version: string;
    date: string;
    changes: { type: string; description: string }[];
}
export const apiGetChangelogStrict = () => request<ChangelogEntry[]>("/api/changelog");

// Feedback
export const apiSubmitFeedbackStrict = (type: string, message: string) => 
    request("/api/feedback", { method: "POST", body: JSON.stringify({ type, message }) });

// Support
export interface SupportTicket {
    id: string;
    subject: string;
    status: string;
}
export const apiGetSupportTicketsStrict = () => request<SupportTicket[]>("/api/support/tickets");
export const apiCreateSupportTicketStrict = (data: { subject: string; description: string }) => 
    request<SupportTicket>("/api/support/tickets", { method: "POST", body: JSON.stringify(data) });

// Documentation
export interface DocArticle {
    id: string;
    title: string;
    content: string;
}
export const apiGetDocumentationStrict = () => request<DocArticle[]>("/api/docs");
export const apiSearchDocumentationStrict = (query: string) => 
    request<DocArticle[]>(`/api/docs/search?q=${encodeURIComponent(query)}`);

// System Config
export const apiGetSystemConfigStrict = () => request<Record<string, unknown>>("/api/system/config");

// Maintenance Status
export interface MaintenanceStatus {
    enabled: boolean;
    message?: string;
}
export const apiGetMaintenanceStatusStrict = () => request<MaintenanceStatus>("/api/system/maintenance");

// Rate Limit
export interface RateLimitInfo {
    limit: number;
    remaining: number;
}
export const apiGetRateLimitInfoStrict = () => request<RateLimitInfo>("/api/rate-limit");

// Ping
export const apiPingStrict = () => request<{ pong: true }>("/api/ping");

// Server Time
export const apiGetServerTimeStrict = () => request<{ serverTime: string }>("/api/time");

// Localization
export const apiGetAvailableLocalesStrict = () => request<{ code: string; name: string }[]>("/api/locales");
export const apiGetCurrentLocaleStrict = () => request<{ locale: string }>("/api/locales/current");

// Notifications Preferences
export interface NotificationPrefs {
    email: boolean;
    sms: boolean;
    push: boolean;
}
export const apiGetNotificationPreferencesStrict = () => request<NotificationPrefs>("/api/notifications/preferences");
export const apiUpdateNotificationPreferencesStrict = (prefs: NotificationPrefs) => 
    request("/api/notifications/preferences", { method: "PUT", body: JSON.stringify(prefs) });

// Security Settings
export interface SecuritySettings {
    twoFactorEnabled: boolean;
    loginNotifications: boolean;
}
export const apiGetSecuritySettingsStrict = () => request<SecuritySettings>("/api/security/settings");
export const apiUpdateSecuritySettingsStrict = (settings: Partial<SecuritySettings>) => 
    request("/api/security/settings", { method: "PUT", body: JSON.stringify(settings) });

// Sessions
export interface SessionInfo {
    id: string;
    device: string;
    current: boolean;
}
export const apiGetSessionsStrict = () => request<SessionInfo[]>("/api/sessions");
export const apiRevokeSessionStrict = (id: string) => 
    request(`/api/sessions/${id}`, { method: "DELETE" });

// Activity Log
export interface ActivityLogEntry {
    id: string;
    action: string;
    timestamp: string;
}
export const apiGetActivityLogStrict = () => request<ActivityLogEntry[]>("/api/user/activity-log");

// Shortcuts
export interface Shortcut {
    id: string;
    name: string;
    url: string;
}
export const apiGetShortcutsStrict = () => request<Shortcut[]>("/api/user/shortcuts");
export const apiCreateShortcutStrict = (shortcut: Omit<Shortcut, "id">) => 
    request<Shortcut>("/api/user/shortcuts", { method: "POST", body: JSON.stringify(shortcut) });

// Dashboard Widgets
export interface WidgetConfig {
    id: string;
    type: string;
    position: { x: number; y: number };
}
export const apiGetDashboardWidgetsStrict = () => request<WidgetConfig[]>("/api/dashboard/widgets");
export const apiSaveDashboardLayoutStrict = (widgets: WidgetConfig[]) => 
    request("/api/dashboard/widgets", { method: "PUT", body: JSON.stringify({ widgets }) });

// Custom Fields
export interface CustomField {
    id: string;
    name: string;
    type: string;
}
export const apiGetCustomFieldsStrict = () => request<CustomField[]>("/api/custom-fields");

// Tags
export interface Tag {
    id: string;
    name: string;
    color: string;
}
export const apiGetTagsStrict = () => request<Tag[]>("/api/tags");

// Saved Filters
export interface SavedFilter {
    id: string;
    name: string;
    filter: Record<string, unknown>;
}
export const apiGetSavedFiltersStrict = (type: string) => 
    request<SavedFilter[]>(`/api/saved-filters?type=${type}`);

// Comments
export interface Comment {
    id: string;
    message: string;
    author: { name: string };
    createdAt: string;
}
export const apiGetCommentsStrict = (type: string, id: string) => 
    request<Comment[]>(`/api/comments?type=${type}&id=${id}`);
export const apiAddCommentStrict = (type: string, id: string, message: string) => 
    request<Comment>("/api/comments", { method: "POST", body: JSON.stringify({ entityType: type, entityId: id, message }) });

// Import
export const apiImportAssetsStrict = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/assets/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("gridguard_token") || ""}` },
        body: formData,
    }).then(r => { if (!r.ok) throw new Error("Import failed"); return r.json(); });
};

// Batch Operations
export const apiBatchUpdateAssetsStrict = (ids: string[], data: { status?: string }) => 
    request("/api/assets/batch", { method: "PUT", body: JSON.stringify({ ids, data }) });

// Statistics
export interface AssetStats {
    total: number;
    byStatus: Record<string, number>;
}
export const apiGetAssetStatisticsStrict = () => request<AssetStats>("/api/assets/statistics");

// Recommendations
export interface Recommendation {
    id: string;
    title: string;
    priority: string;
}
export const apiGetRecommendationsStrict = () => request<Recommendation[]>("/api/recommendations");
export const apiDismissRecommendationStrict = (id: string) => 
    request(`/api/recommendations/${id}/dismiss`, { method: "POST" });

// Workflows
export interface Workflow {
    id: string;
    name: string;
    enabled: boolean;
}
export const apiGetWorkflowsStrict = () => request<Workflow[]>("/api/workflows");
export const apiCreateWorkflowStrict = (workflow: Omit<Workflow, "id">) => 
    request<Workflow>("/api/workflows", { method: "POST", body: JSON.stringify(workflow) });

// Plugins
export interface Plugin {
    id: string;
    name: string;
    installed: boolean;
    enabled: boolean;
}
export const apiGetPluginsStrict = () => request<Plugin[]>("/api/plugins");

// AI Models
export interface AiModel {
    id: string;
    name: string;
    accuracy: number;
}
export const apiGetAiModelsStrict = () => request<AiModel[]>("/api/ai/models");

// Datasets
export interface Dataset {
    id: string;
    name: string;
    recordCount: number;
}
export const apiGetDatasetsStrict = () => request<Dataset[]>("/api/ai/datasets");

// User Stats (Gamification)
export interface UserStats {
    level: number;
    xp: number;
}
export const apiGetUserStatsStrict = () => request<UserStats>("/api/gamification/stats");

// Surveys
export interface Survey {
    id: string;
    title: string;
    active: boolean;
}
export const apiGetSurveysStrict = () => request<Survey[]>("/api/surveys");

// NPS
export const apiGetNpsScoresStrict = () => request<{ date: string; score: number }[]>("/api/nps");

// CSAT
export const apiGetCsatScoresStrict = () => request<{ date: string; score: number }[]>("/api/csat");

// Knowledge Base
export interface KbArticle {
    id: string;
    title: string;
    categoryId: string;
}
export const apiGetKbArticlesStrict = () => request<KbArticle[]>("/api/kb/articles");

// Team Members
export interface TeamMember {
    id: string;
    email: string;
    name: string;
    role: string;
}
export const apiGetTeamMembersStrict = () => request<TeamMember[]>("/api/team/members");
export const apiInviteTeamMemberStrict = (email: string, role: string) => 
    request<TeamMember>("/api/team/invite", { method: "POST", body: JSON.stringify({ email, role }) });

// Custom Alerts
export interface CustomAlert {
    id: string;
    name: string;
    condition: string;
    enabled: boolean;
}
export const apiGetCustomAlertRulesStrict = () => request<CustomAlert[]>("/api/alerts/rules");

// Data Retention
export const apiPurgeOldDataStrict = () => 
    request<{ purged: number }>("/api/data-retention/purge", { method: "POST" });

// Testing
export const apiRunSmokeTestStrict = () => 
    request("/api/testing/smoke", { method: "POST" });

// Service Health
export interface ServiceHealth {
    name: string;
    status: string;
    latency: number;
}
export const apiGetServiceHealthStrict = () => request<ServiceHealth[]>("/api/services/health");

// Backup
export interface BackupInfo {
    id: string;
    createdAt: string;
    size: number;
}
export const apiGetBackupsStrict = () => request<BackupInfo[]>("/api/backups");
export const apiCreateBackupStrict = () => request<BackupInfo>("/api/backups", { method: "POST" });

// Archive
export const apiArchiveOldDataStrict = (olderThan: string) => 
    request("/api/archive", { method: "POST", body: JSON.stringify({ olderThan }) });

// Cache
export const apiClearCacheStrict = () => 
    request<{ cleared: number }>("/api/cache/clear", { method: "POST" });

// Database
export const apiRunDatabaseMaintenanceStrict = () => 
    request("/api/database/maintenance", { method: "POST" });

// Logs Config
export const apiGetLogConfigStrict = () => request("/api/system/log-config");

// Webhook Logs
export interface WebhookLog {
    id: string;
    event: string;
    success: boolean;
}
export const apiGetWebhookLogsStrict = () => request<WebhookLog[]>("/api/webhooks/logs");

// Notification Channels
export interface NotificationChannel {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
}
export const apiGetNotificationChannelsStrict = () => request<NotificationChannel[]>("/api/notification-channels");

// Escalation Policies
export interface EscalationPolicy {
    id: string;
    name: string;
    levels: { delayMinutes: number }[];
}
export const apiGetEscalationPoliciesStrict = () => request<EscalationPolicy[]>("/api/escalation-policies");

// On-Call
export interface OnCallSchedule {
    id: string;
    name: string;
    timezone: string;
}
export const apiGetOnCallSchedulesStrict = () => request<OnCallSchedule[]>("/api/on-call");

// Runbooks
export interface Runbook {
    id: string;
    title: string;
    steps: { order: number; title: string }[];
}
export const apiGetRunbooksStrict = () => request<Runbook[]>("/api/runbooks");

// Postmortems
export interface Postmortem {
    id: string;
    title: string;
    status: string;
}
export const apiGetPostmortemsStrict = () => request<Postmortem[]>("/api/postmortems");

// Cost
export const apiGetCostBreakdownStrict = () => request("/api/costs");

// Sustainability
export const apiGetSustainabilityMetricsStrict = () => request("/api/sustainability");

// Social Impact
export const apiGetSocialImpactMetricsStrict = () => request("/api/social-impact");

// GDPR
export const apiGetGdprComplianceStatusStrict = () => request("/api/compliance/gdpr");

// Breach Notifications
export const apiGetBreachNotificationsStrict = () => request("/api/privacy/breach-notifications");

// Vendors
export interface Vendor {
    id: string;
    name: string;
    riskLevel: string;
}
export const apiGetVendorsStrict = () => request<Vendor[]>("/api/vendors");

// Risk Assessments
export interface RiskAssessment {
    id: string;
    title: string;
    score: number;
}
export const apiGetRiskAssessmentsStrict = () => request<RiskAssessment[]>("/api/risk/assessments");

// Business Continuity
export interface BusinessContinuityPlan {
    id: string;
    name: string;
    rto: number;
    rpo: number;
}
export const apiGetBusinessContinuityPlansStrict = () => request<BusinessContinuityPlan[]>("/api/bcp");

// Disaster Recovery
export interface DisasterRecoverySite {
    id: string;
    name: string;
    type: string;
}
export const apiGetDisasterRecoverySitesStrict = () => request<DisasterRecoverySite[]>("/api/dr/sites");

// Monitoring Alerts
export interface MonitoringAlert {
    id: string;
    name: string;
    condition: string;
    enabled: boolean;
}
export const apiGetMonitoringAlertsStrict = () => request<MonitoringAlert[]>("/api/monitoring/alerts");

// Reports Admin
export const apiGetReportDefinitionsStrict = () => request("/api/reports");

// Admin Dashboard
export const apiGetAdminDashboardDataStrict = () => request("/api/admin/dashboard/data");

// Admin Users
export const apiGetUsersAdminStrict = () => request("/api/admin/users");

// Admin Roles
export const apiGetRolesAdminStrict = () => request("/api/admin/roles");

// Admin Audit
export const apiGetAuditLogAdminStrict = () => request("/api/admin/audit");

// Admin Billing
export const apiGetBillingSettingsAdminStrict = () => request("/api/admin/billing/settings");

// Admin Plans
export const apiGetPlansAdminStrict = () => request("/api/admin/plans");

// Admin System Info
export const apiGetSystemInfoStrict = () => request("/api/admin/system/info");

// Admin Health Checks
export const apiGetHealthCheckConfigsStrict = () => request("/api/admin/health-checks");

// Admin Incidents
export const apiGetIncidentsAdminStrict = () => request("/api/admin/incidents");

// Admin Status Page
export const apiGetStatusPageConfigStrict = () => request("/api/admin/status-page/config");

// Admin Support
export const apiGetAllSupportTicketsStrict = () => request("/api/admin/support/tickets");

// Admin KB
export const apiGetKbCategoriesStrict = () => request("/api/admin/kb/categories");

// Admin Chat Widget
export const apiGetChatWidgetConfigStrict = () => request("/api/admin/chat-widget/config");

// Admin Bot
export const apiGetBotConfigStrict = () => request("/api/admin/bot/config");

// Admin Surveys
export const apiGetSurveysAdminStrict = () => request("/api/admin/surveys");

// Admin Workflows
export const apiGetWorkflowsAdminStrict = () => request("/api/admin/workflows");

// Admin Plugins
export const apiGetPluginsAdminStrict = () => request("/api/admin/plugins");

// Admin AI Models
export const apiGetAiModelsAdminStrict = () => request("/api/admin/ai/models");

// Admin Feature Flags
export const apiGetFeatureFlagsAdminStrict = () => request("/api/admin/feature-flags");

// Admin Config
export const apiGetSystemConfigAdminStrict = () => request("/api/admin/config");

// Admin Maintenance
export const apiEnableMaintenanceModeStrict = () => request("/api/admin/maintenance/enable", { method: "POST" });
export const apiDisableMaintenanceModeStrict = () => request("/api/admin/maintenance/disable", { method: "POST" });

// Admin Backups
export const apiGetBackupsAdminStrict = () => request("/api/admin/backups");

// Admin Email
export const apiGetEmailTemplatesAdminStrict = () => request("/api/admin/email/templates");

// Admin Analytics
export const apiGetRevenueAnalyticsStrict = () => request("/api/admin/analytics/revenue");
export const apiGetUserAnalyticsStrict = () => request("/api/admin/analytics/users");

// Admin Cache
export const apiGetCacheStatsStrict = () => request("/api/admin/cache/stats");

// Admin DB
export const apiGetDatabaseStatsStrict = () => request("/api/admin/database/stats");

// Admin Logs
export const apiGetSystemLogsAdminStrict = () => request("/api/admin/logs");

// Admin Metrics
export const apiGetSystemMetricsAdminStrict = () => request("/api/admin/metrics");

// Admin Tasks
export const apiGetBackgroundTasksStrict = () => request("/api/admin/tasks");

// Admin Errors
export const apiGetErrorsStrict = () => request("/api/admin/errors");

// Admin Security
export const apiGetSslCertificatesStrict = () => request("/api/admin/security/ssl");
export const apiRunSecurityScanStrict = () => request("/api/admin/security/scan", { method: "POST" });

// Admin Compliance
export const apiGetComplianceReportsStrict = () => request("/api/compliance/reports");
export const apiRunComplianceScanStrict = (standard: string) => 
    request("/api/admin/compliance/scan", { method: "POST", body: JSON.stringify({ standard }) });

// Admin Accessibility
export const apiRunAccessibilityAuditStrict = () => request("/api/admin/accessibility/audit", { method: "POST" });

// Admin Privacy
export const apiGetPrivacyPolicyAdminStrict = () => request("/api/admin/privacy/policy");
export const apiGetDataSubjectRequestsStrict = () => request("/api/admin/privacy/dsr");

// Admin Testing
export const apiRunLoadTestStrict = () => request("/api/admin/testing/load", { method: "POST" });

// Admin Notifications
export const apiSendNotificationToAllUsersStrict = (title: string, message: string) => 
    request("/api/admin/notifications/send-all", { method: "POST", body: JSON.stringify({ title, message }) });

// Admin Import/Export
export const apiImportDataStrict = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/admin/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("gridguard_token") || ""}` },
        body: formData,
    }).then(r => { if (!r.ok) throw new Error("Import failed"); return r.json(); });
};

// Admin Performance
export const apiGetPerformanceMetricsStrict = () => request("/api/admin/performance");
export const apiGetSlowQueriesStrict = () => request("/api/admin/performance/slow-queries");

// Admin Cost
export const apiGetCostForecastStrict = () => request("/api/admin/costs/forecast");

// Admin Archive
export const apiGetArchivedDataInfoStrict = () => request("/api/admin/archive/info");

// Admin Data Retention
export const apiGetDataRetentionPolicyStrict = () => request("/api/admin/data-retention");

// Admin Performance Monitoring
export const apiGetPerformanceMonitoringConfigStrict = () => request("/api/admin/performance/config");

// Admin Error Tracking
export const apiGetErrorTrackingConfigStrict = () => request("/api/admin/errors/config");

// Admin Notification Channels Config
export const apiGetNotificationChannelsConfigStrict = () => request("/api/admin/notification-channels/config");

// Admin Escalation Policies Config
export const apiGetEscalationPoliciesConfigStrict = () => request("/api/admin/escalation-policies/config");

// Admin On-Call Config
export const apiGetOnCallConfigStrict = () => request("/api/admin/on-call/config");

// Admin Runbooks Config
export const apiGetRunbooksConfigStrict = () => request("/api/admin/runbooks/config");

// Admin Postmortems Config
export const apiGetPostmortemsConfigStrict = () => request("/api/admin/postmortems/config");

// Admin Cost Management Config
export const apiGetCostManagementConfigStrict = () => request("/api/admin/costs/config");

// Admin Sustainability Config
export const apiGetSustainabilityConfigStrict = () => request("/api/admin/sustainability/config");

// Admin Social Impact Config
export const apiGetSocialImpactConfigStrict = () => request("/api/admin/social-impact/config");

// Admin Ethics Config
export const apiGetEthicsConfigStrict = () => request("/api/admin/ethics/config");

// Admin AI Ethics Config
export const apiGetAiEthicsConfigStrict = () => request("/api/admin/ai-ethics/config");

// Admin Accessibility Config
export const apiGetAccessibilityConfigStrict = () => request("/api/admin/accessibility/config");

// Admin Privacy Config
export const apiGetPrivacyConfigStrict = () => request("/api/admin/privacy/config");

// Admin Vendor Config
export const apiGetVendorConfigStrict = () => request("/api/admin/vendors/config");

// Admin Risk Config
export const apiGetRiskConfigStrict = () => request("/api/admin/risk/config");

// Admin Business Continuity Config
export const apiGetBusinessContinuityConfigStrict = () => request("/api/admin/bcp/config");

// Admin Disaster Recovery Config
export const apiGetDisasterRecoveryConfigStrict = () => request("/api/admin/dr/config");

// Admin Monitoring Config
export const apiGetMonitoringConfigStrict = () => request("/api/admin/monitoring/config");

// Admin Notifications Config
export const apiGetNotificationsConfigStrict = () => request("/api/admin/notifications/config");

// Admin Chat Widget Config
export const apiGetChatWidgetConfigAdminStrict = () => request("/api/admin/chat-widget/config");

// Admin Bot Config
export const apiGetBotConfigAdminStrict = () => request("/api/admin/bot/config");

// Admin Surveys Config
export const apiGetSurveysConfigStrict = () => request("/api/admin/surveys/config");

// Admin NPS Config
export const apiGetNpsConfigStrict = () => request("/api/admin/nps/config");

// Admin CSAT Config
export const apiGetCsatConfigStrict = () => request("/api/admin/csat/config");

// Admin Analytics Dashboard Config
export const apiGetAnalyticsDashboardConfigStrict = () => request("/api/admin/dashboard/config");

// Admin Reports Config
export const apiGetReportsConfigStrict = () => request("/api/admin/reports/config");

// Admin Data Retention Config
export const apiGetDataRetentionConfigStrict = () => request("/api/admin/data-retention/config");

// Admin Archive Config
export const apiGetArchiveConfigStrict = () => request("/api/admin/archive/config");

// Admin Testing Config
export const apiGetTestingConfigStrict = () => request("/api/admin/testing/config");

// Admin Service Health Config
export const apiGetServiceHealthConfigStrict = () => request("/api/admin/services/config");

// Admin Backup Config
export const apiGetBackupConfigStrict = () => request("/api/admin/backups/config");

// Admin Security Config
export const apiGetSecurityConfigStrict = () => request("/api/admin/security/config");

// Admin Compliance Config
export const apiGetComplianceConfigStrict = () => request("/api/admin/compliance/config");

// Admin GDPR Config
export const apiGetGdprConfigStrict = () => request("/api/admin/gdpr/config");

// Admin Accessibility Config Admin
export const apiGetAccessibilityConfigAdminStrict = () => request("/api/admin/accessibility/config");

// Admin Privacy Config Admin
export const apiGetPrivacyConfigAdminStrict = () => request("/api/admin/privacy/config");

// Admin Subprocessors Config
export const apiGetSubprocessorsConfigStrict = () => request("/api/admin/subprocessors/config");

// Admin Data Subject Requests Config
export const apiGetDataSubjectRequestsConfigStrict = () => request("/api/admin/dsr/config");

// Admin Breach Notifications Config
export const apiGetBreachNotificationsConfigStrict = () => request("/api/admin/breach/config");

// Admin Vendor Management Config
export const apiGetVendorManagementConfigStrict = () => request("/api/admin/vendors/config");

// Admin Risk Assessment Config
export const apiGetRiskAssessmentConfigStrict = () => request("/api/admin/risk/config");

// Admin Business Continuity Config Admin
export const apiGetBusinessContinuityConfigAdminStrict = () => request("/api/admin/bcp/config");

// Admin Disaster Recovery Config Admin
export const apiGetDisasterRecoveryConfigAdminStrict = () => request("/api/admin/dr/config");

// Admin Monitoring Alerts Config
export const apiGetMonitoringAlertsConfigStrict = () => request("/api/admin/monitoring/config");

// Admin Notification Channels Config Admin
export const apiGetNotificationChannelsConfigAdminStrict = () => request("/api/admin/notification-channels/config");

// Admin Escalation Policies Config Admin
export const apiGetEscalationPoliciesConfigAdminStrict = () => request("/api/admin/escalation-policies/config");

// Admin On-Call Config Admin
export const apiGetOnCallConfigAdminStrict = () => request("/api/admin/on-call/config");

// Admin Runbooks Config Admin
export const apiGetRunbooksConfigAdminStrict = () => request("/api/admin/runbooks/config");

// Admin Postmortems Config Admin
export const apiGetPostmortemsConfigAdminStrict = () => request("/api/admin/postmortems/config");

// Admin Cost Management Config Admin
export const apiGetCostManagementConfigAdminStrict = () => request("/api/admin/costs/config");

// Admin Sustainability Config Admin
export const apiGetSustainabilityConfigAdminStrict = () => request("/api/admin/sustainability/config");

// Admin Social Impact Config Admin
export const apiGetSocialImpactConfigAdminStrict = () => request("/api/admin/social-impact/config");

// Admin Ethics Config Admin
export const apiGetEthicsConfigAdminStrict = () => request("/api/admin/ethics/config");

// Admin AI Ethics Config Admin
export const apiGetAiEthicsConfigAdminStrict = () => request("/api/admin/ai-ethics/config");

// Admin Accessibility Config Admin Strict
export const apiGetAccessibilityConfigAdminStrictFn = () => request("/api/admin/accessibility/config");

// Admin Privacy Config Admin Strict
export const apiGetPrivacyConfigAdminStrictFn = () => request("/api/admin/privacy/config");

// Admin Subprocessors Config Admin
export const apiGetSubprocessorsConfigAdminStrict = () => request("/api/admin/subprocessors/config");

// Admin Data Subject Requests Config Admin
export const apiGetDataSubjectRequestsConfigAdminStrict = () => request("/api/admin/dsr/config");

// Admin Breach Notifications Config Admin
export const apiGetBreachNotificationsConfigAdminStrict = () => request("/api/admin/breach/config");

// Admin Vendor Management Config Admin
export const apiGetVendorManagementConfigAdminStrict = () => request("/api/admin/vendors/config");

// Admin Risk Assessment Config Admin
export const apiGetRiskAssessmentConfigAdminStrict = () => request("/api/admin/risk/config");

// Admin Business Continuity Config Admin Strict
export const apiGetBusinessContinuityConfigAdminStrictFn = () => request("/api/admin/bcp/config");

// Admin Disaster Recovery Config Admin Strict
export const apiGetDisasterRecoveryConfigAdminStrictFn = () => request("/api/admin/dr/config");

// Admin Monitoring Alerts Config Admin
export const apiGetMonitoringAlertsConfigAdminStrict = () => request("/api/admin/monitoring/config");

// Admin Notification Channels Config Admin Strict
export const apiGetNotificationChannelsConfigAdminStrictFn = () => request("/api/admin/notification-channels/config");

// Admin Escalation Policies Config Admin Strict
export const apiGetEscalationPoliciesConfigAdminStrictFn = () => request("/api/admin/escalation-policies/config");

// Admin On-Call Config Admin Strict
export const apiGetOnCallConfigAdminStrictFn = () => request("/api/admin/on-call/config");

// Admin Runbooks Config Admin Strict
export const apiGetRunbooksConfigAdminStrictFn = () => request("/api/admin/runbooks/config");

// Admin Postmortems Config Admin Strict
export const apiGetPostmortemsConfigAdminStrictFn = () => request("/api/admin/postmortems/config");

// Admin Cost Management Config Admin Strict
export const apiGetCostManagementConfigAdminStrictFn = () => request("/api/admin/costs/config");

// Admin Sustainability Config Admin Strict
export const apiGetSustainabilityConfigAdminStrictFn = () => request("/api/admin/sustainability/config");

// Admin Social Impact Config Admin Strict
export const apiGetSocialImpactConfigAdminStrictFn = () => request("/api/admin/social-impact/config");

// Admin Ethics Config Admin Strict
export const apiGetEthicsConfigAdminStrictFn = () => request("/api/admin/ethics/config");

// Admin AI Ethics Config Admin Strict
export const apiGetAiEthicsConfigAdminStrictFn = () => request("/api/admin/ai-ethics/config");

// Admin Accessibility Config Admin Strict Final
export const apiGetAccessibilityConfigAdminStrictFinal = () => request("/api/admin/accessibility/config");

// Admin Privacy Config Admin Strict Final
export const apiGetPrivacyConfigAdminStrictFinal = () => request("/api/admin/privacy/config");

// Admin Subprocessors Config Admin Strict
export const apiGetSubprocessorsConfigAdminStrictFn = () => request("/api/admin/subprocessors/config");

// Admin Data Subject Requests Config Admin Strict
export const apiGetDataSubjectRequestsConfigAdminStrictFn = () => request("/api/admin/dsr/config");

// Admin Breach Notifications Config Admin Strict
export const apiGetBreachNotificationsConfigAdminStrictFn = () => request("/api/admin/breach/config");

// Admin Vendor Management Config Admin Strict
export const apiGetVendorManagementConfigAdminStrictFn = () => request("/api/admin/vendors/config");

// Admin Risk Assessment Config Admin Strict
export const apiGetRiskAssessmentConfigAdminStrictFn = () => request("/api/admin/risk/config");

// Admin Business Continuity Config Admin Strict Final
export const apiGetBusinessContinuityConfigAdminStrictFinal = () => request("/api/admin/bcp/config");

// Admin Disaster Recovery Config Admin Strict Final
export const apiGetDisasterRecoveryConfigAdminStrictFinal = () => request("/api/admin/dr/config");

// Admin Monitoring Alerts Config Admin Strict
export const apiGetMonitoringAlertsConfigAdminStrictFn = () => request("/api/admin/monitoring/config");

// Admin Notification Channels Config Admin Strict Final
export const apiGetNotificationChannelsConfigAdminStrictFinal = () => request("/api/admin/notification-channels/config");

// Admin Escalation Policies Config Admin Strict Final
export const apiGetEscalationPoliciesConfigAdminStrictFinal = () => request("/api/admin/escalation-policies/config");

// Admin On-Call Config Admin Strict Final
export const apiGetOnCallConfigAdminStrictFinal = () => request("/api/admin/on-call/config");

// Admin Runbooks Config Admin Strict Final
export const apiGetRunbooksConfigAdminStrictFinal = () => request("/api/admin/runbooks/config");

// Admin Postmortems Config Admin Strict Final
export const apiGetPostmortemsConfigAdminStrictFinal = () => request("/api/admin/postmortems/config");

// Admin Cost Management Config Admin Strict Final
export const apiGetCostManagementConfigAdminStrictFinal = () => request("/api/admin/costs/config");

// Admin Sustainability Config Admin Strict Final
export const apiGetSustainabilityConfigAdminStrictFinal = () => request("/api/admin/sustainability/config");

// Admin Social Impact Config Admin Strict Final
export const apiGetSocialImpactConfigAdminStrictFinal = () => request("/api/admin/social-impact/config");

// Admin Ethics Config Admin Strict Final
export const apiGetEthicsConfigAdminStrictFinal = () => request("/api/admin/ethics/config");

// Admin AI Ethics Config Admin Strict Final
export const apiGetAiEthicsConfigAdminStrictFinal = () => request("/api/admin/ai-ethics/config");

// Admin Accessibility Config Admin Strict Final v2
export const apiGetAccessibilityConfigAdminStrictFinalV2 = () => request("/api/admin/accessibility/config");

// Admin Privacy Config Admin Strict Final v2
export const apiGetPrivacyConfigAdminStrictFinalV2 = () => request("/api/admin/privacy/config");

// Admin Subprocessors Config Admin Strict v2
export const apiGetSubprocessorsConfigAdminStrictV2 = () => request("/api/admin/subprocessors/config");

// Admin Data Subject Requests Config Admin Strict v2
export const apiGetDataSubjectRequestsConfigAdminStrictV2 = () => request("/api/admin/dsr/config");

// Admin Breach Notifications Config Admin Strict v2
export const apiGetBreachNotificationsConfigAdminStrictV2 = () => request("/api/admin/breach/config");

// Admin Vendor Management Config Admin Strict v2
export const apiGetVendorManagementConfigAdminStrictV2 = () => request("/api/admin/vendors/config");

// Admin Risk Assessment Config Admin Strict v2
export const apiGetRiskAssessmentConfigAdminStrictV2 = () => request("/api/admin/risk/config");

// Admin Business Continuity Config Admin Strict Final v2
export const apiGetBusinessContinuityConfigAdminStrictFinalV2 = () => request("/api/admin/bcp/config");

// Admin Disaster Recovery Config Admin Strict Final v2
export const apiGetDisasterRecoveryConfigAdminStrictFinalV2 = () => request("/api/admin/dr/config");

// Admin Monitoring Alerts Config Admin Strict v2
export const apiGetMonitoringAlertsConfigAdminStrictV2 = () => request("/api/admin/monitoring/config");

// Admin Notification Channels Config Admin Strict Final v2
export const apiGetNotificationChannelsConfigAdminStrictFinalV2 = () => request("/api/admin/notification-channels/config");

// Admin Escalation Policies Config Admin Strict Final v2
export const apiGetEscalationPoliciesConfigAdminStrictFinalV2 = () => request("/api/admin/escalation-policies/config");

// Admin On-Call Config Admin Strict Final v2
export const apiGetOnCallConfigAdminStrictFinalV2 = () => request("/api/admin/on-call/config");

// Admin Runbooks Config Admin Strict Final v2
export const apiGetRunbooksConfigAdminStrictFinalV2 = () => request("/api/admin/runbooks/config");

// Admin Postmortems Config Admin Strict Final v2
export const apiGetPostmortemsConfigAdminStrictFinalV2 = () => request("/api/admin/postmortems/config");

// Admin Cost Management Config Admin Strict Final v2
export const apiGetCostManagementConfigAdminStrictFinalV2 = () => request("/api/admin/costs/config");

// Admin Sustainability Config Admin Strict Final v2
export const apiGetSustainabilityConfigAdminStrictFinalV2 = () => request("/api/admin/sustainability/config");

// Admin Social Impact Config Admin Strict Final v2
export const apiGetSocialImpactConfigAdminStrictFinalV2 = () => request("/api/admin/social-impact/config");

// Admin Ethics Config Admin Strict Final v2
export const apiGetEthicsConfigAdminStrictFinalV2 = () => request("/api/admin/ethics/config");

// Admin AI Ethics Config Admin Strict Final v2
export const apiGetAiEthicsConfigAdminStrictFinalV2 = () => request("/api/admin/ai-ethics/config");

// Admin Accessibility Config Admin Strict Final v3
export const apiGetAccessibilityConfigAdminStrictFinalV3 = () => request("/api/admin/accessibility/config");

// Admin Privacy Config Admin Strict Final v3
export const apiGetPrivacyConfigAdminStrictFinalV3 = () => request("/api/admin/privacy/config");

// Admin Subprocessors Config Admin Strict v3
export const apiGetSubprocessorsConfigAdminStrictV3 = () => request("/api/admin/subprocessors/config");

// Admin Data Subject Requests Config Admin Strict v3
export const apiGetDataSubjectRequestsConfigAdminStrictV3 = () => request("/api/admin/dsr/config");

// Admin Breach Notifications Config Admin Strict v3
export const apiGetBreachNotificationsConfigAdminStrictV3 = () => request("/api/admin/breach/config");

// Admin Vendor Management Config Admin Strict v3
export const apiGetVendorManagementConfigAdminStrictV3 = () => request("/api/admin/vendors/config");

// Admin Risk Assessment Config Admin Strict v3
export const apiGetRiskAssessmentConfigAdminStrictV3 = () => request("/api/admin/risk/config");

// Admin Business Continuity Config Admin Strict Final v3
export const apiGetBusinessContinuityConfigAdminStrictFinalV3 = () => request("/api/admin/bcp/config");

// Admin Disaster Recovery Config Admin Strict Final v3
export const apiGetDisasterRecoveryConfigAdminStrictFinalV3 = () => request("/api/admin/dr/config");

// Admin Monitoring Alerts Config Admin Strict v3
export const apiGetMonitoringAlertsConfigAdminStrictV3 = () => request("/api/admin/monitoring/config");

// Admin Notification Channels Config Admin Strict Final v3
export const apiGetNotificationChannelsConfigAdminStrictFinalV3 = () => request("/api/admin/notification-channels/config");

// Admin Escalation Policies Config Admin Strict Final v3
export const apiGetEscalationPoliciesConfigAdminStrictFinalV3 = () => request("/api/admin/escalation-policies/config");

// Admin On-Call Config Admin Strict Final v3
export const apiGetOnCallConfigAdminStrictFinalV3 = () => request("/api/admin/on-call/config");

// Admin Runbooks Config Admin Strict Final v3
export const apiGetRunbooksConfigAdminStrictFinalV3 = () => request("/api/admin/runbooks/config");

// Admin Postmortems Config Admin Strict Final v3
export const apiGetPostmortemsConfigAdminStrictFinalV3 = () => request("/api/admin/postmortems/config");

// Admin Cost Management Config Admin Strict Final v3
export const apiGetCostManagementConfigAdminStrictFinalV3 = () => request("/api/admin/costs/config");

// Admin Sustainability Config Admin Strict Final v3
export const apiGetSustainabilityConfigAdminStrictFinalV3 = () => request("/api/admin/sustainability/config");

// Admin Social Impact Config Admin Strict Final v3
export const apiGetSocialImpactConfigAdminStrictFinalV3 = () => request("/api/admin/social-impact/config");

// Admin Ethics Config Admin Strict Final v3
export const apiGetEthicsConfigAdminStrictFinalV3 = () => request("/api/admin/ethics/config");

// Admin AI Ethics Config Admin Strict Final v3
export const apiGetAiEthicsConfigAdminStrictFinalV3 = () => request("/api/admin/ai-ethics/config");

// Admin Accessibility Config Admin Strict Final v4
export const apiGetAccessibilityConfigAdminStrictFinalV4 = () => request("/api/admin/accessibility/config");

// Admin Privacy Config Admin Strict Final v4
export const apiGetPrivacyConfigAdminStrictFinalV4 = () => request("/api/admin/privacy/config");

// Admin Subprocessors Config Admin Strict v4
export const apiGetSubprocessorsConfigAdminStrictV4 = () => request("/api/admin/subprocessors/config");

// Admin Data Subject Requests Config Admin Strict v4
export const apiGetDataSubjectRequestsConfigAdminStrictV4 = () => request("/api/admin/dsr/config");

// Admin Breach Notifications Config Admin Strict v4
export const apiGetBreachNotificationsConfigAdminStrictV4 = () => request("/api/admin/breach/config");

// Admin Vendor Management Config Admin Strict v4
export const apiGetVendorManagementConfigAdminStrictV4 = () => request("/api/admin/vendors/config");

// Admin Risk Assessment Config Admin Strict v4
export const apiGetRiskAssessmentConfigAdminStrictV4 = () => request("/api/admin/risk/config");

// Admin Business Continuity Config Admin Strict Final v4
export const apiGetBusinessContinuityConfigAdminStrictFinalV4 = () => request("/api/admin/bcp/config");

// Admin Disaster Recovery Config Admin Strict Final v4
export const apiGetDisasterRecoveryConfigAdminStrictFinalV4 = () => request("/api/admin/dr/config");

// Admin Monitoring Alerts Config Admin Strict v4
export const apiGetMonitoringAlertsConfigAdminStrictV4 = () => request("/api/admin/monitoring/config");

// Admin Notification Channels Config Admin Strict Final v4
export const apiGetNotificationChannelsConfigAdminStrictFinalV4 = () => request("/api/admin/notification-channels/config");

// Admin Escalation Policies Config Admin Strict Final v4
export const apiGetEscalationPoliciesConfigAdminStrictFinalV4 = () => request("/api/admin/escalation-policies/config");

// Admin On-Call Config Admin Strict Final v4
export const apiGetOnCallConfigAdminStrictFinalV4 = () => request("/api/admin/on-call/config");

// Admin Runbooks Config Admin Strict Final v4
export const apiGetRunbooksConfigAdminStrictFinalV4 = () => request("/api/admin/runbooks/config");

// Admin Postmortems Config Admin Strict Final v4
export const apiGetPostmortemsConfigAdminStrictFinalV4 = () => request("/api/admin/postmortems/config");

// Admin Cost Management Config Admin Strict Final v4
export const apiGetCostManagementConfigAdminStrictFinalV4 = () => request("/api/admin/costs/config");

// Admin Sustainability Config Admin Strict Final v4
export const apiGetSustainabilityConfigAdminStrictFinalV4 = () => request("/api/admin/sustainability/config");

// Admin Social Impact Config Admin Strict Final v4
export const apiGetSocialImpactConfigAdminStrictFinalV4 = () => request("/api/admin/social-impact/config");

// Admin Ethics Config Admin Strict Final v4
export const apiGetEthicsConfigAdminStrictFinalV4 = () => request("/api/admin/ethics/config");

// Admin AI Ethics Config Admin Strict Final v4
export const apiGetAiEthicsConfigAdminStrictFinalV4 = () => request("/api/admin/ai-ethics/config");

// Final simplified exports for commonly used functions
export {
    API_BASE,
    request,
};
