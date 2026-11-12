using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;

    public HealthController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/health
    [HttpGet]
    public async Task<IActionResult> GetHealth()
    {
        bool isHealthy = false;
        try 
        {
            isHealthy = await _context.Database.CanConnectAsync();
        }
        catch 
        {
            isHealthy = false;
        }

        return Ok(new
        {
            status = isHealthy ? "healthy" : "unhealthy",
            version = "1.0.0",
            timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
            checks = new
            {
                database = isHealthy ? "connected" : "disconnected",
                api = "running"
            }
        });
    }
}

// Additional utility endpoints
[ApiController]
[Route("api")]
public class UtilityController : ControllerBase
{
    // GET: api/ping
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok(new { pong = true, timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss") });
    }

    // GET: api/time
    [HttpGet("time")]
    public IActionResult GetServerTime()
    {
        return Ok(new
        {
            serverTime = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
            timezone = TimeZoneInfo.Local.StandardName
        });
    }

    // GET: api/rate-limit
    [HttpGet("rate-limit")]
    public IActionResult GetRateLimitInfo()
    {
        // In a real implementation, get this from your rate limiting service
        return Ok(new
        {
            limit = 1000,
            remaining = 950,
            resetAt = DateTime.UtcNow.AddHours(1).ToString("yyyy-MM-ddTHH:mm:ss")
        });
    }

    // GET: api/features
    [HttpGet("features")]
    public IActionResult GetFeatureFlags()
    {
        return Ok(new
        {
            darkMode = false,
            realTimeAlerts = true,
            aiPredictions = true,
            advancedAnalytics = true,
            multiTenant = false,
            webhooks = true
        });
    }
}

[Authorize]
[ApiController]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _context;

    public SearchController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/search?q={query}
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return Ok(new List<SearchResult>());
        }

        var results = new List<SearchResult>();

        // Search assets
        var assets = await _context.Assets
            .Where(a => a.Name.Contains(q) || a.Id.Contains(q) || a.Location.Contains(q))
            .Take(5)
            .Select(a => new SearchResult
            {
                Type = "asset",
                Id = a.Id,
                Title = a.Name,
                Description = $"{a.Type} in {a.Location}"
            })
            .ToListAsync();

        results.AddRange(assets);

        // Search incidents
        var incidents = await _context.Incidents
            .Where(i => i.Id.Contains(q) || i.Location.Contains(q) || i.Type.Contains(q))
            .Take(5)
            .Select(i => new SearchResult
            {
                Type = "incident",
                Id = i.Id,
                Title = $"Incident: {i.Type}",
                Description = $"At {i.Location} - {i.Status}"
            })
            .ToListAsync();

        results.AddRange(incidents);

        return Ok(results);
    }
}

// DTO Classes
public class SearchResult
{
    public string Type { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

// Need this attribute
