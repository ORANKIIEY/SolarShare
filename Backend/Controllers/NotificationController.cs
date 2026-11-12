using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/notifications")]
public class NotificationController : ControllerBase
{
    private readonly AppDbContext _context;

    public NotificationController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var notifications = await _context.Notifications
            .OrderByDescending(n => n.CreatedAt)
            .Take(10)
            .ToListAsync();

        return Ok(notifications);
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var unread = await _context.Notifications
            .Where(n => !n.IsRead)
            .ToListAsync();

        foreach (var n in unread) n.IsRead = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "All notifications marked as read", count = unread.Count });
    }
}
