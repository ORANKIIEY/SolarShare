using Microsoft.AspNetCore.Mvc;
using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/telemetry")]
public class TelemetryController : ControllerBase
{
    private readonly AppDbContext _context;

    // Inject the Database Connection we configured in Program.cs
    public TelemetryController(AppDbContext context)
    {
        _context = context;
    }

    // POST: api/telemetry
    // This is what the Raspberry Pi will hit
    [HttpPost]
    public async Task<IActionResult> PostTelemetry([FromBody] Telemetry data)
    {
        // If the sensor didn't send a time, add it now
        if (data.Time == default) data.Time = DateTime.UtcNow;

        _context.Telemetry.Add(data);

        try
        {
            await _context.SaveChangesAsync();
            return Ok(new { status = "Saved", device = data.DeviceId, time = data.Time });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message });
        }
    }

    // GET: api/telemetry/recent
    // This is for you to check if data is actually there
    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent()
    {
        var data = await _context.Telemetry
            .OrderByDescending(t => t.Time)
            .Take(5)
            .ToListAsync();

        return Ok(data);
    }

    // GET: api/telemetry/ghost-load
    // Returns real-time energy balancing data for ghost load detection
    [HttpGet("ghost-load")]
    public async Task<IActionResult> GetGhostLoadData()
    {
        // Get recent telemetry data
        var telemetry = await _context.Telemetry
            .OrderByDescending(t => t.Time)
            .Take(20)
            .ToListAsync();

        var data = new List<GhostLoadDataPoint>();

        if (telemetry.Any())
        {
            // Reverse to get chronological order
            telemetry = telemetry.OrderBy(t => t.Time).ToList();

            foreach (var t in telemetry)
            {
                var supply = t.Current;  // Total supply current
                var metered = t.Current * 0.95; // Simulated metered (95% of supply is normal)

                data.Add(new GhostLoadDataPoint
                {
                    Time = t.Time.ToString("HH:mm"),
                    Supply = Math.Round(supply, 2),
                    Metered = Math.Round(metered, 2)
                });
            }
        }
        else
        {
            // Generate sample data if no real data
            var now = DateTime.UtcNow;
            for (int i = 19; i >= 0; i--)
            {
                var time = now.AddMinutes(-i);
                var baseLoad = 40 + Random.Shared.NextDouble() * 5;
                var supply = baseLoad + Random.Shared.NextDouble() * 2;
                var metered = baseLoad - Random.Shared.NextDouble() * 2;

                data.Add(new GhostLoadDataPoint
                {
                    Time = time.ToString("HH:mm"),
                    Supply = Math.Round(supply, 2),
                    Metered = Math.Round(metered, 2)
                });
            }
        }

        return Ok(data);
    }

    // GET: api/telemetry/harmonics
    // Returns harmonic distortion analysis data
    [HttpGet("harmonics")]
    public IActionResult GetHarmonicData()
    {
        var data = new List<HarmonicDataPoint>
        {
            new() { Name = "Fund", Value = 100 },   // Fundamental frequency
            new() { Name = "3rd", Value = 12 },     // 3rd harmonic
            new() { Name = "5th", Value = 28 },     // 5th harmonic - HIGH
            new() { Name = "7th", Value = 8 },      // 7th harmonic
            new() { Name = "9th", Value = 5 },      // 9th harmonic
            new() { Name = "11th", Value = 2 }      // 11th harmonic
        };

        return Ok(data);
    }
}

// DTO Classes
public class GhostLoadDataPoint
{
    public string Time { get; set; } = string.Empty;
    public double Supply { get; set; }
    public double Metered { get; set; }
}

public class HarmonicDataPoint
{
    public string Name { get; set; } = string.Empty;
    public int Value { get; set; }
}