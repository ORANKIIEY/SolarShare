using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SettingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var configs = await _context.SystemConfigs.ToListAsync();
        var dict = configs.ToDictionary(c => c.Key, c => c.Value);

        return Ok(new
        {
            sensitivity = int.Parse(dict.GetValueOrDefault("sensitivity", "95")),
            autoIsolate = bool.Parse(dict.GetValueOrDefault("auto_isolate", "true"))
        });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
    {
        await UpsertConfig("sensitivity", request.Sensitivity.ToString());
        await UpsertConfig("auto_isolate", request.AutoIsolate.ToString().ToLower());
        await _context.SaveChangesAsync();

        // Log the change
        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            Time = DateTime.UtcNow.ToString("HH:mm"),
            Event = $"User updated threshold to {request.Sensitivity}%",
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        return Ok(new { message = "Settings saved", sensitivity = request.Sensitivity, autoIsolate = request.AutoIsolate });
    }

    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs()
    {
        var logs = await _context.AuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(20)
            .Select(l => new { id = l.Id, time = l.Time, @event = l.Event })
            .ToListAsync();

        return Ok(logs);
    }

    private async Task UpsertConfig(string key, string value)
    {
        var config = await _context.SystemConfigs.FindAsync(key);
        if (config != null)
        {
            config.Value = value;
            config.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.SystemConfigs.Add(new SystemConfig
            {
                Key = key,
                Value = value,
                UpdatedAt = DateTime.UtcNow
            });
        }
    }

    public class UpdateSettingsRequest
    {
        public int Sensitivity { get; set; } = 95;
        public bool AutoIsolate { get; set; } = true;
    }
}
