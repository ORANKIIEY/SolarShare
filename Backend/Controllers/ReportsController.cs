using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/reports
    [HttpGet]
    public async Task<IActionResult> GetReports()
    {
        var reports = new List<ReportData>
        {
            new()
            {
                Id = "RPT-001",
                Title = "Daily Theft Summary",
                GeneratedAt = DateTime.UtcNow.AddHours(-2).ToString("yyyy-MM-ddTHH:mm:ss"),
                DownloadUrl = "/api/reports/RPT-001/download"
            },
            new()
            {
                Id = "RPT-002",
                Title = "Weekly Energy Loss Report",
                GeneratedAt = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss"),
                DownloadUrl = "/api/reports/RPT-002/download"
            },
            new()
            {
                Id = "RPT-003",
                Title = "Monthly Performance Analysis",
                GeneratedAt = DateTime.UtcNow.AddDays(-3).ToString("yyyy-MM-ddTHH:mm:ss"),
                DownloadUrl = "/api/reports/RPT-003/download"
            },
            new()
            {
                Id = "RPT-004",
                Title = "Asset Health Report",
                GeneratedAt = DateTime.UtcNow.AddDays(-5).ToString("yyyy-MM-ddTHH:mm:ss"),
                DownloadUrl = "/api/reports/RPT-004/download"
            }
        };

        return Ok(reports);
    }

    // POST: api/reports/generate
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateReport([FromBody] GenerateReportRequest request)
    {
        var report = new ReportData
        {
            Id = $"RPT-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            Title = $"{request.Type} Report - {DateTime.UtcNow:yyyy-MM-dd}",
            GeneratedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
            DownloadUrl = $"/api/reports/{Guid.NewGuid()}/download"
        };

        // In a real implementation, you would generate the report asynchronously
        // and store it for download

        return Ok(report);
    }

    // GET: api/reports/{id}/download
    [HttpGet("{id}/download")]
    public IActionResult DownloadReport(string id)
    {
        // In a real implementation, you would retrieve the generated report
        // and return it as a file download
        var content = $"Report {id} content...";
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        return File(bytes, "text/plain", $"report-{id}.txt");
    }
}

// GET: api/reports/theft-history
[Authorize]
[ApiController]
[Route("api/reports")]
public class TheftHistoryReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TheftHistoryReportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("theft-history")]
    public async Task<IActionResult> GetTheftHistory()
    {
        var events = await _context.TheftEvents
            .OrderByDescending(t => t.Timestamp)
            .Take(50)
            .Select(t => new TheftEventDto
            {
                EventId = t.Id.ToString(),
                Timestamp = t.Timestamp.ToString("yyyy-MM-ddTHH:mm:ss"),
                HouseId = t.PoleId,
                Reason = t.AiLabel ?? "Unknown",
                Status = t.Status
            })
            .ToListAsync();

        if (!events.Any())
        {
            // Return sample data
            events = new List<TheftEventDto>
            {
                new()
                {
                    EventId = "THEFT-001",
                    Timestamp = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss"),
                    HouseId = "HSE-1234",
                    Reason = "Meter Bypass Detected",
                    Status = "Confirmed"
                },
                new()
                {
                    EventId = "THEFT-002",
                    Timestamp = DateTime.UtcNow.AddDays(-2).ToString("yyyy-MM-ddTHH:mm:ss"),
                    HouseId = "HSE-5678",
                    Reason = "Cable Hook Detected",
                    Status = "Investigating"
                },
                new()
                {
                    EventId = "THEFT-003",
                    Timestamp = DateTime.UtcNow.AddDays(-3).ToString("yyyy-MM-ddTHH:mm:ss"),
                    HouseId = "HSE-9012",
                    Reason = "High Differential Current",
                    Status = "Confirmed"
                }
            };
        }

        return Ok(events);
    }
}

// DTO Classes
public class ReportData
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string GeneratedAt { get; set; } = string.Empty;
    public string DownloadUrl { get; set; } = string.Empty;
}

public class GenerateReportRequest
{
    public string Type { get; set; } = "summary";
    public DateTimeRange DateRange { get; set; } = new();
}

public class DateTimeRange
{
    public string Start { get; set; } = DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd");
    public string End { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
}

public class TheftEventDto
{
    public string EventId { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string HouseId { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
