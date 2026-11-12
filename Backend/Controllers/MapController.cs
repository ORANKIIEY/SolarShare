using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/map")]
public class MapController : ControllerBase
{
    private readonly AppDbContext _context;

    public MapController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/map/assets
    [HttpGet("assets")]
    public async Task<IActionResult> GetMapAssets()
    {
        var assets = await _context.Assets
            .Select(a => new MapAssetData
            {
                Id = a.Id,
                Lat = a.Lat,
                Lng = a.Lng,
                Status = a.Status,
                Type = a.Type,
                Current = a.Load > 0 ? (float)a.Load : 0,
                Voltage = 230.0f
            })
            .ToListAsync();

        return Ok(assets);
    }

    // GET: api/map/incidents
    [HttpGet("incidents")]
    public async Task<IActionResult> GetMapIncidents()
    {
        var incidents = await _context.Incidents
            .Where(i => i.Status == "active" || i.Status == "dispatched")
            .Select(i => new MapIncidentData
            {
                Id = i.Id,
                Lat = GetIncidentLat(i.Location),
                Lng = GetIncidentLng(i.Location),
                Type = i.Type,
                Severity = i.Confidence > 90 ? "critical" : i.Confidence > 70 ? "high" : "medium",
                Status = i.Status
            })
            .ToListAsync();

        return Ok(incidents);
    }

    // GET: api/map/theft-heatmap
    [HttpGet("theft-heatmap")]
    public async Task<IActionResult> GetTheftHeatmap()
    {
        // Get incidents grouped by location for heatmap
        var heatmapPoints = await _context.Incidents
            .Where(i => i.Type == "theft" || i.Type == "Meter Bypass" || i.Type == "Cable Hook")
            .GroupBy(i => i.Location)
            .Select(g => new HeatmapPoint
            {
                Lat = GetIncidentLat(g.Key),
                Lng = GetIncidentLng(g.Key),
                Intensity = g.Count()
            })
            .ToListAsync();

        if (!heatmapPoints.Any())
        {
            // Return sample data if no real data
            heatmapPoints = new List<HeatmapPoint>
            {
                new() { Lat = -26.2041, Lng = 28.0473, Intensity = 5 },
                new() { Lat = -26.2100, Lng = 28.0500, Intensity = 3 },
                new() { Lat = -26.1980, Lng = 28.0400, Intensity = 8 },
                new() { Lat = -26.2150, Lng = 28.0550, Intensity = 2 },
                new() { Lat = -26.1900, Lng = 28.0350, Intensity = 4 }
            };
        }

        return Ok(heatmapPoints);
    }

    // Helper methods to generate coordinates from location names
    private double GetIncidentLat(string location)
    {
        // Map known locations to coordinates or generate from hash
        var coords = new Dictionary<string, double>
        {
            ["Soweto"] = -26.2678,
            ["Alexandra"] = -26.1050,
            ["Sandton"] = -26.1060,
            ["Johannesburg CBD"] = -26.2041,
            ["Randburg"] = -26.0936,
            ["Roodepoort"] = -26.1205,
            ["Diepsloot"] = -25.9321
        };

        if (coords.TryGetValue(location, out var lat))
            return lat;

        // Generate pseudo-random coordinate based on location hash
        var hash = location.GetHashCode();
        return -26.2 + (hash % 1000) / 5000.0;
    }

    private double GetIncidentLng(string location)
    {
        var coords = new Dictionary<string, double>
        {
            ["Soweto"] = 27.8586,
            ["Alexandra"] = 28.0988,
            ["Sandton"] = 28.0567,
            ["Johannesburg CBD"] = 28.0473,
            ["Randburg"] = 27.9994,
            ["Roodepoort"] = 27.8654,
            ["Diepsloot"] = 28.0122
        };

        if (coords.TryGetValue(location, out var lng))
            return lng;

        var hash = location.GetHashCode();
        return 28.0 + (hash % 1000) / 5000.0;
    }
}

// DTO Classes
public class MapAssetData
{
    public string Id { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public float Current { get; set; }
    public float Voltage { get; set; }
}

public class MapIncidentData
{
    public string Id { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class HeatmapPoint
{
    public double Lat { get; set; }
    public double Lng { get; set; }
    public int Intensity { get; set; }
}
