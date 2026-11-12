using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/incidents")]
public class IncidentController : ControllerBase
{
    private readonly AppDbContext _context;

    public IncidentController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status = null)
    {
        var query = _context.Incidents.AsQueryable();

        if (!string.IsNullOrEmpty(status) && status != "all")
        {
            query = query.Where(i => i.Status == status);
        }

        var incidents = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
        return Ok(incidents);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var incident = await _context.Incidents.FindAsync(id);
        if (incident == null) return NotFound(new { error = "Incident not found" });
        return Ok(incident);
    }

    [HttpPut("{id}/dispatch")]
    public async Task<IActionResult> Dispatch(string id)
    {
        var incident = await _context.Incidents.FindAsync(id);
        if (incident == null) return NotFound(new { error = "Incident not found" });

        incident.Status = "dispatched";
        await _context.SaveChangesAsync();

        return Ok(incident);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateIncidentRequest request)
    {
        var incident = new Incident
        {
            Id = $"INC-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid().ToString()[..4].ToUpper()}",
            Time = DateTime.UtcNow.ToString("HH:mm"),
            Location = request.Location,
            Type = request.Type,
            Status = "active",
            Confidence = request.Confidence,
            CreatedAt = DateTime.UtcNow
        };

        _context.Incidents.Add(incident);
        await _context.SaveChangesAsync();
        return Created($"/api/incidents/{incident.Id}", incident);
    }

    // GET: api/incidents/statistics
    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        var total = await _context.Incidents.CountAsync();
        var byStatus = await _context.Incidents
            .GroupBy(i => i.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count);

        var byType = await _context.Incidents
            .GroupBy(i => i.Type)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Type, x => x.Count);

        return Ok(new IncidentStatistics
        {
            Total = total,
            ByStatus = byStatus,
            ByType = byType,
            BySeverity = new Dictionary<string, int>
            {
                ["critical"] = 5,
                ["high"] = 12,
                ["medium"] = 20,
                ["low"] = 8
            },
            AverageResolutionTime = 4.5
        });
    }

    // GET: api/incidents/trending
    [HttpGet("trending")]
    public IActionResult GetTrending()
    {
        var trending = new List<TrendingIncident>
        {
            new() { Id = "1", Name = "Soweto Area", Score = 95, Change = 15 },
            new() { Id = "2", Name = "Alexandra Zone", Score = 87, Change = 12 },
            new() { Id = "3", Name = "Sandton North", Score = 76, Change = 8 }
        };

        return Ok(trending);
    }

    // GET: api/incidents/export
    [HttpGet("export")]
    public IActionResult ExportIncidents([FromQuery] string format = "csv")
    {
        var content = "id,time,location,type,status,confidence\n";
        content += "INC-001,10:30,Soweto,Meter Bypass,active,95\n";

        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        return File(bytes, "text/csv", "incidents.csv");
    }
}

// DTO Classes
public class IncidentStatistics
{
    public int Total { get; set; }
    public Dictionary<string, int> ByStatus { get; set; } = new();
    public Dictionary<string, int> ByType { get; set; } = new();
    public Dictionary<string, int> BySeverity { get; set; } = new();
    public double AverageResolutionTime { get; set; }
}

public class TrendingIncident
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Score { get; set; }
    public int Change { get; set; }
}

public class CreateIncidentRequest
{
    public string Location { get; set; } = string.Empty;
    public string Type { get; set; } = "theft";
    public int Confidence { get; set; } = 0;
}
