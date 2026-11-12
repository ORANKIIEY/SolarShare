using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using System.Security.Claims;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/user")]
public class UserController : ControllerBase
{
    private readonly AppDbContext _context;

    public UserController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/user/shortcuts
    [HttpGet("shortcuts")]
    public IActionResult GetShortcuts()
    {
        var shortcuts = new List<Shortcut>
        {
            new() { Id = "1", Name = "Dashboard", Url = "/admin" },
            new() { Id = "2", Name = "Assets", Url = "/admin/assets" },
            new() { Id = "3", Name = "Alerts", Url = "/admin/alerts" },
            new() { Id = "4", Name = "Telemetry", Url = "/admin/telemetry" }
        };

        return Ok(shortcuts);
    }

    // POST: api/user/shortcuts
    [HttpPost("shortcuts")]
    public IActionResult CreateShortcut([FromBody] CreateShortcutRequest request)
    {
        var shortcut = new Shortcut
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Url = request.Url
        };

        return Ok(shortcut);
    }

    // GET: api/user/activity-log
    [HttpGet("activity-log")]
    public IActionResult GetActivityLog()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

        var logs = new List<ActivityLogEntry>
        {
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Action = "Login",
                Details = "User logged in",
                Timestamp = DateTime.UtcNow.AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss")
            },
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Action = "View Dashboard",
                Details = "Viewed dashboard",
                Timestamp = DateTime.UtcNow.AddHours(-2).ToString("yyyy-MM-ddTHH:mm:ss")
            },
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Action = "Update Settings",
                Details = "Changed sensitivity to 95%",
                Timestamp = DateTime.UtcNow.AddHours(-3).ToString("yyyy-MM-ddTHH:mm:ss")
            }
        };

        return Ok(logs);
    }

    // POST: api/user/export-data
    [HttpPost("export-data")]
    public IActionResult ExportUserData()
    {
        // In a real implementation, export all user data for GDPR compliance
        return Ok(new { message = "Data export initiated", downloadUrl = "/api/user/export/download" });
    }

    // DELETE: api/user/delete-account
    [HttpDelete("delete-account")]
    public IActionResult DeleteAccount()
    {
        // In a real implementation, schedule account deletion
        return Ok(new { message = "Account deletion scheduled" });
    }
}

[Authorize]
[ApiController]
[Route("api/notifications")]
public class NotificationPreferencesController : ControllerBase
{
    // GET: api/notifications/preferences
    [HttpGet("preferences")]
    public IActionResult GetPreferences()
    {
        return Ok(new NotificationPreferences
        {
            Email = true,
            Sms = false,
            Push = true,
            CriticalOnly = false
        });
    }

    // PUT: api/notifications/preferences
    [HttpPut("preferences")]
    public IActionResult UpdatePreferences([FromBody] NotificationPreferences prefs)
    {
        return Ok(prefs);
    }
}

[Authorize]
[ApiController]
[Route("api/auth")]
public class UserProfileController : ControllerBase
{
    private readonly AppDbContext _context;

    public UserProfileController(AppDbContext context)
    {
        _context = context;
    }

    // PUT: api/auth/profile
    [HttpPut("profile")]
    public IActionResult UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        return Ok(new { message = "Profile updated", name = request.Name, email = request.Email });
    }

    // PUT: api/auth/change-password
    [HttpPut("change-password")]
    public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
    {
        return Ok(new { message = "Password changed successfully" });
    }

    // GET: api/auth/ws-token
    [HttpGet("ws-token")]
    public IActionResult GetWebSocketToken()
    {
        var token = Guid.NewGuid().ToString();
        return Ok(new { token });
    }
}

[Authorize]
[ApiController]
[Route("api/dashboard")]
public class DashboardWidgetsController : ControllerBase
{
    // GET: api/dashboard/widgets
    [HttpGet("widgets")]
    public IActionResult GetWidgets()
    {
        var widgets = new List<WidgetConfig>
        {
            new() { Id = "1", Type = "metrics", Title = "Key Metrics", Position = new WidgetPosition { X = 0, Y = 0 } },
            new() { Id = "2", Type = "chart", Title = "Energy Usage", Position = new WidgetPosition { X = 1, Y = 0 } },
            new() { Id = "3", Type = "map", Title = "Live Map", Position = new WidgetPosition { X = 0, Y = 1 } },
            new() { Id = "4", Type = "alerts", Title = "Recent Alerts", Position = new WidgetPosition { X = 1, Y = 1 } }
        };

        return Ok(widgets);
    }

    // PUT: api/dashboard/widgets
    [HttpPut("widgets")]
    public IActionResult SaveLayout([FromBody] SaveWidgetsRequest request)
    {
        return Ok(new { message = "Layout saved" });
    }
}

[Authorize]
[ApiController]
[Route("api/onboarding")]
public class OnboardingController : ControllerBase
{
    // GET: api/onboarding
    [HttpGet]
    public IActionResult GetSteps()
    {
        var steps = new List<OnboardingStep>
        {
            new() { Id = "1", Title = "Complete Profile", Description = "Add your profile information", Completed = true, Skippable = false },
            new() { Id = "2", Title = "Configure Alerts", Description = "Set up notification preferences", Completed = false, Skippable = true },
            new() { Id = "3", Title = "Add Assets", Description = "Add your first assets to monitor", Completed = false, Skippable = false },
            new() { Id = "4", Title = "Review Dashboard", Description = "Explore your dashboard", Completed = false, Skippable = true }
        };

        return Ok(steps);
    }

    // POST: api/onboarding/{id}/complete
    [HttpPost("{id}/complete")]
    public IActionResult CompleteStep(string id)
    {
        return Ok(new { message = $"Step {id} completed" });
    }
}

[Authorize]
[ApiController]
[Route("api/tours")]
public class ToursController : ControllerBase
{
    // GET: api/tours
    [HttpGet]
    public IActionResult GetTours()
    {
        var tours = new List<Tour>
        {
            new()
            {
                Id = "1",
                Name = "Dashboard Tour",
                Steps = new List<TourStep>
                {
                    new() { Target = ".metrics", Title = "Key Metrics", Content = "View your key metrics here", Placement = "bottom" },
                    new() { Target = ".map", Title = "Live Map", Content = "Monitor your assets on the map", Placement = "right" }
                }
            }
        };

        return Ok(tours);
    }
}

[ApiController]
[Route("api/tips")]
public class TipsController : ControllerBase
{
    // GET: api/tips/random
    [HttpGet("random")]
    public IActionResult GetRandomTip()
    {
        var tips = new List<Tip>
        {
            new() { Id = "1", Content = "Use the search bar to quickly find assets and incidents" },
            new() { Id = "2", Content = "Set up alerts to get notified of potential theft in real-time" },
            new() { Id = "3", Content = "Review the ghost load chart to identify energy discrepancies" },
            new() { Id = "4", Content = "Export reports for monthly compliance reviews" }
        };

        var randomTip = tips[Random.Shared.Next(tips.Count)];
        return Ok(randomTip);
    }
}

[ApiController]
[Route("api/changelog")]
public class ChangelogController : ControllerBase
{
    // GET: api/changelog
    [HttpGet]
    public IActionResult GetChangelog()
    {
        var changelog = new List<ChangelogEntry>
        {
            new()
            {
                Version = "1.0.0",
                Date = DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd"),
                Changes = new List<Change>
                {
                    new() { Type = "added", Description = "Initial release with dashboard, assets, and alerts" },
                    new() { Type = "added", Description = "Real-time telemetry visualization" },
                    new() { Type = "added", Description = "AI-powered theft detection" }
                }
            },
            new()
            {
                Version = "0.9.0",
                Date = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd"),
                Changes = new List<Change>
                {
                    new() { Type = "added", Description = "Beta version with core functionality" },
                    new() { Type = "fixed", Description = "Various bug fixes and improvements" }
                }
            }
        };

        return Ok(changelog);
    }
}

[Authorize]
[ApiController]
[Route("api/feedback")]
public class FeedbackController : ControllerBase
{
    // POST: api/feedback
    [HttpPost]
    public IActionResult SubmitFeedback([FromBody] SubmitFeedbackRequest request)
    {
        return Ok(new { message = "Feedback submitted", id = Guid.NewGuid().ToString() });
    }

    // POST: api/feedback/bug
    [HttpPost("bug")]
    public IActionResult ReportBug([FromBody] ReportBugRequest request)
    {
        return Ok(new { message = "Bug reported", id = Guid.NewGuid().ToString() });
    }

    // POST: api/feedback/feature
    [HttpPost("feature")]
    public IActionResult RequestFeature([FromBody] RequestFeatureRequest request)
    {
        return Ok(new { message = "Feature request submitted", id = Guid.NewGuid().ToString() });
    }
}

[Authorize]
[ApiController]
[Route("api/support")]
public class SupportController : ControllerBase
{
    // GET: api/support/tickets
    [HttpGet("tickets")]
    public IActionResult GetTickets()
    {
        var tickets = new List<SupportTicket>
        {
            new()
            {
                Id = "TKT-001",
                Subject = "Need help with asset configuration",
                Status = "open",
                Priority = "medium"
            },
            new()
            {
                Id = "TKT-002",
                Subject = "Alert not triggering",
                Status = "resolved",
                Priority = "high"
            }
        };

        return Ok(tickets);
    }

    // POST: api/support/tickets
    [HttpPost("tickets")]
    public IActionResult CreateTicket([FromBody] CreateTicketRequest request)
    {
        var ticket = new SupportTicket
        {
            Id = $"TKT-{Guid.NewGuid().ToString()[..4].ToUpper()}",
            Subject = request.Subject,
            Status = "open",
            Priority = "medium"
        };

        return Ok(ticket);
    }
}

[ApiController]
[Route("api/docs")]
public class DocumentationController : ControllerBase
{
    // GET: api/docs
    [HttpGet]
    public IActionResult GetDocs()
    {
        var articles = new List<DocArticle>
        {
            new()
            {
                Id = "1",
                Title = "Getting Started",
                Category = "Basics",
                Content = "Welcome to GridGuard AI. This guide will help you get started..."
            },
            new()
            {
                Id = "2",
                Title = "Understanding Ghost Load",
                Category = "Advanced",
                Content = "Ghost load represents the difference between supply and metered current..."
            },
            new()
            {
                Id = "3",
                Title = "Configuring Alerts",
                Category = "Configuration",
                Content = "Learn how to set up and customize alerts for your assets..."
            }
        };

        return Ok(articles);
    }

    // GET: api/docs/search?q={query}
    [HttpGet("search")]
    public IActionResult SearchDocs([FromQuery] string q)
    {
        return Ok(new List<DocArticle>());
    }
}

// DTO Classes
public class Shortcut
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class CreateShortcutRequest
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class ActivityLogEntry
{
    public string Id { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
}

public class NotificationPreferences
{
    public bool Email { get; set; }
    public bool Sms { get; set; }
    public bool Push { get; set; }
    public bool CriticalOnly { get; set; }
}

public class UpdateProfileRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class WidgetConfig
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public WidgetPosition Position { get; set; } = new();
}

public class WidgetPosition
{
    public int X { get; set; }
    public int Y { get; set; }
}

public class SaveWidgetsRequest
{
    public List<WidgetConfig> Widgets { get; set; } = new();
}

public class OnboardingStep
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool Completed { get; set; }
    public bool Skippable { get; set; }
}

public class Tour
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<TourStep> Steps { get; set; } = new();
}

public class TourStep
{
    public string Target { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Placement { get; set; } = string.Empty;
}

public class Tip
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class ChangelogEntry
{
    public string Version { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public List<Change> Changes { get; set; } = new();
}

public class Change
{
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class SubmitFeedbackRequest
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? Rating { get; set; }
}

public class ReportBugRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
}

public class RequestFeatureRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class SupportTicket
{
    public string Id { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
}

public class CreateTicketRequest
{
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class DocArticle
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

// Need these attributes
