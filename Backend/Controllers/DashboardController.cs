using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var totalAssets = await _context.Assets.CountAsync();
        var activeAlerts = await _context.Incidents.CountAsync(i => i.Status == "active");
        var investigatingCount = await _context.Incidents.CountAsync(i => i.Status == "investigating" || i.Status == "dispatched");

        // Calculate average load across all assets
        var avgLoad = totalAssets > 0 
            ? await _context.Assets.AverageAsync(a => a.Load) 
            : 0;

        // Get the latest high-confidence incident
        var latestConfidence = await _context.Incidents
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => i.Confidence)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            totalNodes = totalAssets,
            activeAlerts,
            investigatingCount,
            avgLoad = Math.Round(avgLoad, 1),
            latestConfidence,
            totalSectorLoad = Math.Round(avgLoad * totalAssets / 100.0 * 2.37, 1), // approximate MW
            activeLosses = activeAlerts * 4150 // approximate R/hr per active theft
        });
    }
}
