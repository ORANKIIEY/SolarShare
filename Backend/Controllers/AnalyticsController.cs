using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AnalyticsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/analytics?period=day|week|month|year
    [HttpGet]
    public async Task<IActionResult> GetAnalytics([FromQuery] string period = "day")
    {
        var data = new AnalyticsData
        {
            TheftOverTime = await GetTheftOverTime(period),
            EnergyLossOverTime = await GetEnergyLossOverTime(period),
            AlertsOverTime = await GetAlertsOverTime(period),
            TopRiskyAssets = await GetTopRiskyAssets()
        };

        return Ok(data);
    }

    // GET: api/analytics/energy-loss
    [HttpGet("energy-loss")]
    public async Task<IActionResult> GetEnergyLoss([FromQuery] string period = "day")
    {
        var data = await GetEnergyLossOverTime(period);
        return Ok(data);
    }

    // GET: api/analytics/alerts
    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts([FromQuery] string period = "day")
    {
        var data = await GetAlertsOverTime(period);
        return Ok(data);
    }

    private async Task<List<TimeSeriesData>> GetTheftOverTime(string period)
    {
        var points = new List<TimeSeriesData>();
        var now = DateTime.UtcNow;

        int points_count = period switch
        {
            "day" => 24,
            "week" => 7,
            "month" => 30,
            "year" => 12,
            _ => 24
        };

        for (int i = points_count - 1; i >= 0; i--)
        {
            var time = period switch
            {
                "day" => now.AddHours(-i),
                "week" => now.AddDays(-i),
                "month" => now.AddDays(-i),
                "year" => now.AddMonths(-i),
                _ => now.AddHours(-i)
            };

            points.Add(new TimeSeriesData
            {
                Timestamp = time.ToString("yyyy-MM-ddTHH:mm:ss"),
                Value = Random.Shared.Next(0, 10)
            });
        }

        return points;
    }

    private async Task<List<TimeSeriesData>> GetEnergyLossOverTime(string period)
    {
        var points = new List<TimeSeriesData>();
        var now = DateTime.UtcNow;

        int points_count = period switch
        {
            "day" => 24,
            "week" => 7,
            "month" => 30,
            "year" => 12,
            _ => 24
        };

        for (int i = points_count - 1; i >= 0; i--)
        {
            var time = period switch
            {
                "day" => now.AddHours(-i),
                "week" => now.AddDays(-i),
                "month" => now.AddDays(-i),
                "year" => now.AddMonths(-i),
                _ => now.AddHours(-i)
            };

            points.Add(new TimeSeriesData
            {
                Timestamp = time.ToString("yyyy-MM-ddTHH:mm:ss"),
                Value = Random.Shared.Next(100, 1000)
            });
        }

        return points;
    }

    private async Task<List<TimeSeriesData>> GetAlertsOverTime(string period)
    {
        var points = new List<TimeSeriesData>();
        var now = DateTime.UtcNow;

        int points_count = period switch
        {
            "day" => 24,
            "week" => 7,
            "month" => 30,
            "year" => 12,
            _ => 24
        };

        for (int i = points_count - 1; i >= 0; i--)
        {
            var time = period switch
            {
                "day" => now.AddHours(-i),
                "week" => now.AddDays(-i),
                "month" => now.AddDays(-i),
                "year" => now.AddMonths(-i),
                _ => now.AddHours(-i)
            };

            points.Add(new TimeSeriesData
            {
                Timestamp = time.ToString("yyyy-MM-ddTHH:mm:ss"),
                Value = Random.Shared.Next(0, 20)
            });
        }

        return points;
    }

    private async Task<List<RiskyAsset>> GetTopRiskyAssets()
    {
        // Get assets with incidents
        var riskyAssets = await _context.Assets
            .Select(a => new RiskyAsset
            {
                AssetId = a.Id,
                RiskScore = Random.Shared.Next(0, 100)
            })
            .OrderByDescending(a => a.RiskScore)
            .Take(10)
            .ToListAsync();

        if (!riskyAssets.Any())
        {
            // Return sample data
            riskyAssets = new List<RiskyAsset>
            {
                new() { AssetId = "TR-001", RiskScore = 95 },
                new() { AssetId = "PO-042", RiskScore = 87 },
                new() { AssetId = "TR-015", RiskScore = 76 },
                new() { AssetId = "PO-089", RiskScore = 68 },
                new() { AssetId = "TR-032", RiskScore = 54 }
            };
        }

        return riskyAssets;
    }
}

[Authorize]
[ApiController]
[Route("api/predictions")]
public class PredictionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PredictionsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/predictions/theft
    [HttpGet("theft")]
    public async Task<IActionResult> GetTheftPredictions()
    {
        var predictions = await _context.Assets
            .Select(a => new TheftPrediction
            {
                AssetId = a.Id,
                RiskScore = CalculateRiskScore(a),
                PredictedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                Factors = new List<string>
                {
                    "High load variance",
                    "Previous incidents nearby",
                    "Age of infrastructure"
                }
            })
            .OrderByDescending(p => p.RiskScore)
            .Take(20)
            .ToListAsync();

        if (!predictions.Any())
        {
            // Return sample data
            predictions = new List<TheftPrediction>
            {
                new()
                {
                    AssetId = "TR-001",
                    RiskScore = 87,
                    PredictedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                    Factors = new List<string> { "High anomaly score", "Night activity pattern" }
                },
                new()
                {
                    AssetId = "PO-042",
                    RiskScore = 76,
                    PredictedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                    Factors = new List<string> { "Previous theft incident", "Unusual load pattern" }
                },
                new()
                {
                    AssetId = "TR-015",
                    RiskScore = 65,
                    PredictedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                    Factors = new List<string> { "Voltage fluctuations", "High differential" }
                }
            };
        }

        return Ok(predictions);
    }

    private int CalculateRiskScore(Asset asset)
    {
        // Simple risk calculation based on load and random factors
        var baseScore = asset.Load > 0 ? (int)(asset.Load / 10) : 30;
        var randomFactor = Random.Shared.Next(-10, 20);
        return Math.Clamp(baseScore + randomFactor, 0, 100);
    }
}

// DTO Classes
public class AnalyticsData
{
    public List<TimeSeriesData> TheftOverTime { get; set; } = new();
    public List<TimeSeriesData> EnergyLossOverTime { get; set; } = new();
    public List<TimeSeriesData> AlertsOverTime { get; set; } = new();
    public List<RiskyAsset> TopRiskyAssets { get; set; } = new();
}

public class TimeSeriesData
{
    public string Timestamp { get; set; } = string.Empty;
    public int Value { get; set; }
}

public class RiskyAsset
{
    public string AssetId { get; set; } = string.Empty;
    public int RiskScore { get; set; }
}

public class TheftPrediction
{
    public string AssetId { get; set; } = string.Empty;
    public int RiskScore { get; set; }
    public string PredictedAt { get; set; } = string.Empty;
    public List<string> Factors { get; set; } = new();
}

