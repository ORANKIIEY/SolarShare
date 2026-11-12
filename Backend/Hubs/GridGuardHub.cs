using Backend.Models;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

/// <summary>
/// SignalR Hub — the real-time WebSocket bridge between the .NET backend and the Next.js dashboard.
/// 
/// Connection endpoint: /hubs/gridguard
/// 
/// The Next.js frontend connects to this hub and subscribes to the "TheftAlert" event.
/// Whenever a theft verdict arrives from ModelArts, the <see cref="TheftService"/> calls
/// <see cref="BroadcastTheftAlertAsync"/> and every connected browser instantly receives
/// the update — turning the house Red on the 3D map.
/// </summary>
public class GridGuardHub : Hub
{
    private readonly ILogger<GridGuardHub> _logger;

    public GridGuardHub(ILogger<GridGuardHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Called once the Next.js client establishes a WebSocket connection.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Dashboard client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a dashboard client disconnects (tab closed, network drop, etc.).
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Dashboard client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // ─── Server → Client events ────────────────────────────────────────────

    /// <summary>
    /// Broadcasts a theft alert to ALL connected dashboard clients.
    /// Called by <see cref="Services.TheftService"/> after the full pipeline completes.
    /// </summary>
    /// <param name="hubContext">Injected hub context (used from outside the hub class).</param>
    /// <param name="alert">The alert payload sent to the frontend.</param>
    public static async Task BroadcastTheftAlertAsync(
        IHubContext<GridGuardHub> hubContext,
        GridGuardAlertPayload alert)
    {
        await hubContext.Clients.All.SendAsync("TheftAlert", alert);
    }

    /// <summary>
    /// Broadcasts ESP32 edge device status updates to ALL connected dashboard clients.
    /// Called by <see cref="Services.GridGuardOrchestrator"/> when telemetry with device diagnostics is received.
    /// </summary>
    public static async Task BroadcastEdgeDeviceUpdateAsync(
        IHubContext<GridGuardHub> hubContext,
        EdgeDevicePayload payload)
    {
        await hubContext.Clients.All.SendAsync("EdgeDeviceUpdate", payload);
    }
}

/// <summary>
/// The payload sent to the Next.js dashboard via SignalR after a full theft detection pipeline run.
/// 
/// Frontend usage (Next.js / TypeScript):
/// <code>
/// connection.on("TheftAlert", (alert: GridGuardAlertPayload) => {
///   setHouseStatus(alert.pole_id, alert.status);   // "Red" | "Green"
/// });
/// </code>
/// </summary>
public class GridGuardAlertPayload
{
    /// <summary>The pole / house identifier — maps to a 3D mesh on the dashboard map.</summary>
    public string pole_id { get; set; } = string.Empty;

    /// <summary>"Red" if theft confirmed, "Green" if normal.</summary>
    public string status { get; set; } = "Green";

    /// <summary>ModelArts confidence score (0.0 – 1.0).</summary>
    public float confidence_score { get; set; }

    /// <summary>OBS URL to the raw waveform JSON file — rendered as a chart on the dashboard.</summary>
    public string waveform_url { get; set; } = string.Empty;

    /// <summary>ISO 8601 UTC timestamp of the event.</summary>
    public string timestamp { get; set; } = DateTime.UtcNow.ToString("O");
}
