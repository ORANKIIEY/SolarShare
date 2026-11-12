using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using System.Diagnostics;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/system")]
public class SystemController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<SystemController> _logger;

    public SystemController(AppDbContext context, ILogger<SystemController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/system/metrics
    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var metrics = new List<MetricData>
        {
            new()
            {
                Name = "CPU Usage",
                Value = $"{GetCpuUsage():F1}%",
                Status = GetCpuUsage() > 80 ? "critical" : GetCpuUsage() > 60 ? "warning" : "healthy",
                LastUpdated = DateTime.UtcNow.ToString("HH:mm:ss")
            },
            new()
            {
                Name = "Memory",
                Value = $"{GetMemoryUsage():F1}%",
                Status = GetMemoryUsage() > 85 ? "critical" : GetMemoryUsage() > 70 ? "warning" : "healthy",
                LastUpdated = DateTime.UtcNow.ToString("HH:mm:ss")
            },
            new()
            {
                Name = "Disk Space",
                Value = $"{GetDiskUsage():F1}%",
                Status = GetDiskUsage() > 90 ? "critical" : GetDiskUsage() > 75 ? "warning" : "healthy",
                LastUpdated = DateTime.UtcNow.ToString("HH:mm:ss")
            },
            new()
            {
                Name = "Network",
                Value = "Active",
                Status = "healthy",
                LastUpdated = DateTime.UtcNow.ToString("HH:mm:ss")
            },
            new()
            {
                Name = "Database",
                Value = await CheckDatabaseConnection() ? "Connected" : "Error",
                Status = await CheckDatabaseConnection() ? "healthy" : "critical",
                LastUpdated = DateTime.UtcNow.ToString("HH:mm:ss")
            }
        };

        return Ok(metrics);
    }

    // GET: api/system/services
    [HttpGet("services")]
    public async Task<IActionResult> GetServices()
    {
        var services = new List<ServiceStatus>
        {
            new()
            {
                Name = "API Gateway",
                Version = "1.0.0",
                Status = "running",
                Cpu = 12.5,
                Memory = 256,
                Uptime = "3d 12h 45m",
                Requests = 45230
            },
            new()
            {
                Name = "AI Analysis",
                Version = "2.1.0",
                Status = "running",
                Cpu = 35.2,
                Memory = 512,
                Uptime = "3d 12h 45m",
                Requests = 12890
            },
            new()
            {
                Name = "Telemetry Ingestion",
                Version = "1.2.0",
                Status = "running",
                Cpu = 8.7,
                Memory = 128,
                Uptime = "3d 12h 45m",
                Requests = 256000
            },
            new()
            {
                Name = "WebSocket Hub",
                Version = "1.0.0",
                Status = "running",
                Cpu = 5.3,
                Memory = 64,
                Uptime = "3d 12h 45m",
                Requests = 8900
            }
        };

        return Ok(services);
    }

    // GET: api/system/logs
    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs([FromQuery] string? level = null)
    {
        var logs = new List<LogEntry>
        {
            new()
            {
                Timestamp = DateTime.UtcNow.AddMinutes(-5).ToString("yyyy-MM-ddTHH:mm:ss"),
                Level = "info",
                Service = "API Gateway",
                Message = "Request processed successfully"
            },
            new()
            {
                Timestamp = DateTime.UtcNow.AddMinutes(-10).ToString("yyyy-MM-ddTHH:mm:ss"),
                Level = "info",
                Service = "Telemetry Ingestion",
                Message = "Batch of 1000 records ingested"
            },
            new()
            {
                Timestamp = DateTime.UtcNow.AddMinutes(-15).ToString("yyyy-MM-ddTHH:mm:ss"),
                Level = "warn",
                Service = "AI Analysis",
                Message = "High load detected, scaling up"
            },
            new()
            {
                Timestamp = DateTime.UtcNow.AddMinutes(-20).ToString("yyyy-MM-ddTHH:mm:ss"),
                Level = "error",
                Service = "Database",
                Message = "Connection timeout, retrying..."
            },
            new()
            {
                Timestamp = DateTime.UtcNow.AddMinutes(-25).ToString("yyyy-MM-ddTHH:mm:ss"),
                Level = "info",
                Service = "API Gateway",
                Message = "User authentication successful"
            },
            new()
            {
                Timestamp = DateTime.UtcNow.AddMinutes(-30).ToString("yyyy-MM-ddTHH:mm:ss"),
                Level = "debug",
                Service = "WebSocket Hub",
                Message = "Client connected: abc123"
            }
        };

        if (!string.IsNullOrEmpty(level))
        {
            logs = logs.Where(l => l.Level == level.ToLower()).ToList();
        }

        return Ok(logs);
    }

    // GET: api/system/deployment
    [HttpGet("deployment")]
    public IActionResult GetDeploymentInfo()
    {
        var info = new DeploymentInfo
        {
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
            Version = "1.0.0",
            DeployedAt = DateTime.UtcNow.AddDays(-3).ToString("yyyy-MM-ddTHH:mm:ss"),
            DeployedBy = "shawn",
            CommitHash = "a1b2c3d4"
        };

        return Ok(info);
    }

    // GET: api/system/realtime-stats
    [HttpGet("realtime-stats")]
    public IActionResult GetRealtimeStats()
    {
        var stats = new RealtimeStats
        {
            ActiveUsers = 12,
            EventsPerSecond = 45,
            DataPointsProcessed = 1284500,
            AlertsGenerated = 23
        };

        return Ok(stats);
    }

    // GET: api/system/maintenance
    [HttpGet("maintenance")]
    public IActionResult GetMaintenanceStatus()
    {
        return Ok(new MaintenanceStatus
        {
            Enabled = false,
            Message = "System is operational"
        });
    }

    // GET: api/system/config
    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var configs = await _context.SystemConfigs.ToListAsync();
        var result = configs.ToDictionary(c => c.Key, c => c.Value);
        return Ok(result);
    }

    // Helper methods
    private double GetCpuUsage()
    {
        // Simulated CPU usage
        return Random.Shared.NextDouble() * 40 + 10;
    }

    private double GetMemoryUsage()
    {
        // Simulated memory usage
        return Random.Shared.NextDouble() * 30 + 40;
    }

    private double GetDiskUsage()
    {
        // Simulated disk usage
        return 45.0;
    }

    private async Task<bool> CheckDatabaseConnection()
    {
        try
        {
            await _context.Database.CanConnectAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }
}

// DTO Classes
public class MetricData
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Status { get; set; } = "healthy";
    public string LastUpdated { get; set; } = string.Empty;
}

public class ServiceStatus
{
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Status { get; set; } = "running";
    public double Cpu { get; set; }
    public double Memory { get; set; }
    public string Uptime { get; set; } = string.Empty;
    public int Requests { get; set; }
}

public class LogEntry
{
    public string Timestamp { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Service { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class DeploymentInfo
{
    public string Environment { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string DeployedAt { get; set; } = string.Empty;
    public string DeployedBy { get; set; } = string.Empty;
    public string CommitHash { get; set; } = string.Empty;
}

public class RealtimeStats
{
    public int ActiveUsers { get; set; }
    public int EventsPerSecond { get; set; }
    public int DataPointsProcessed { get; set; }
    public int AlertsGenerated { get; set; }
}

public class MaintenanceStatus
{
    public bool Enabled { get; set; }
    public string Message { get; set; } = string.Empty;
}
