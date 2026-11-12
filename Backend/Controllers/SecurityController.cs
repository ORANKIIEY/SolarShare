using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/sessions")]
public class SessionsController : ControllerBase
{
    // GET: api/sessions
    [HttpGet]
    public IActionResult GetSessions()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

        var sessions = new List<SessionInfo>
        {
            new()
            {
                Id = "sess-001",
                Device = "Chrome on Windows",
                Browser = "Chrome 120",
                Ip = "192.168.1.100",
                Location = "Johannesburg, ZA",
                StartedAt = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss"),
                LastActiveAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                Current = true
            },
            new()
            {
                Id = "sess-002",
                Device = "Safari on iPhone",
                Browser = "Safari 17",
                Ip = "192.168.1.101",
                Location = "Johannesburg, ZA",
                StartedAt = DateTime.UtcNow.AddDays(-3).ToString("yyyy-MM-ddTHH:mm:ss"),
                LastActiveAt = DateTime.UtcNow.AddHours(-2).ToString("yyyy-MM-ddTHH:mm:ss"),
                Current = false
            }
        };

        return Ok(sessions);
    }

    // DELETE: api/sessions/{id}
    [HttpDelete("{id}")]
    public IActionResult RevokeSession(string id)
    {
        return Ok(new { message = $"Session {id} revoked" });
    }

    // POST: api/sessions/revoke-others
    [HttpPost("revoke-others")]
    public IActionResult RevokeAllOtherSessions()
    {
        return Ok(new { message = "All other sessions revoked" });
    }
}

[Authorize]
[ApiController]
[Route("api/security")]
public class SecuritySettingsController : ControllerBase
{
    // GET: api/security/settings
    [HttpGet("settings")]
    public IActionResult GetSettings()
    {
        return Ok(new SecuritySettings
        {
            TwoFactorEnabled = false,
            TwoFactorMethod = null,
            LoginNotifications = true,
            TrustedDevices = true,
            PasswordExpiryDays = 90,
            MinPasswordLength = 8,
            RequireSpecialChars = true
        });
    }

    // PUT: api/security/settings
    [HttpPut("settings")]
    public IActionResult UpdateSettings([FromBody] SecuritySettings settings)
    {
        return Ok(settings);
    }

    // POST: api/security/2fa/enable
    [HttpPost("2fa/enable")]
    public IActionResult Enable2FA([FromBody] Enable2FARequest request)
    {
        return Ok(new
        {
            qrCode = "data:image/png;base64,placeholder",
            secret = "JBSWY3DPEHPK3PXP"
        });
    }

    // POST: api/security/2fa/disable
    [HttpPost("2fa/disable")]
    public IActionResult Disable2FA()
    {
        return Ok(new { message = "2FA disabled" });
    }

    // POST: api/security/2fa/verify
    [HttpPost("2fa/verify")]
    public IActionResult Verify2FA([FromBody] Verify2FARequest request)
    {
        return Ok(new { valid = request.Code == "123456" });
    }

    // GET: api/security/trusted-devices
    [HttpGet("trusted-devices")]
    public IActionResult GetTrustedDevices()
    {
        var devices = new List<TrustedDevice>
        {
            new()
            {
                Id = "dev-001",
                Name = "MacBook Pro",
                LastUsedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
            },
            new()
            {
                Id = "dev-002",
                Name = "iPhone 15",
                LastUsedAt = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss")
            }
        };

        return Ok(devices);
    }

    // DELETE: api/security/trusted-devices/{id}
    [HttpDelete("trusted-devices/{id}")]
    public IActionResult RevokeTrustedDevice(string id)
    {
        return Ok(new { message = $"Device {id} revoked" });
    }

    // GET: api/security/login-history
    [HttpGet("login-history")]
    public IActionResult GetLoginHistory()
    {
        var history = new List<LoginHistoryEntry>
        {
            new()
            {
                Timestamp = DateTime.UtcNow.AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss"),
                Ip = "192.168.1.100",
                Location = "Johannesburg, ZA",
                Device = "Chrome on Windows",
                Success = true
            },
            new()
            {
                Timestamp = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss"),
                Ip = "192.168.1.101",
                Location = "Johannesburg, ZA",
                Device = "Safari on iPhone",
                Success = true
            }
        };

        return Ok(history);
    }
}

[Authorize]
[ApiController]
[Route("api/audit")]
public class AuditController : ControllerBase
{
    // GET: api/audit
    [HttpGet]
    public IActionResult GetAuditLog([FromQuery] AuditFilters? filters)
    {
        var entries = new List<AuditEntry>
        {
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Action = "settings_update",
                EntityType = "settings",
                EntityId = "sensitivity",
                UserId = "user-001",
                UserName = "admin",
                Changes = new Dictionary<string, ChangeValue>
                {
                    ["sensitivity"] = new() { Old = "90", New = "95" }
                },
                Timestamp = DateTime.UtcNow.AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss")
            },
            new()
            {
                Id = Guid.NewGuid().ToString(),
                Action = "incident_resolve",
                EntityType = "incident",
                EntityId = "INC-001",
                UserId = "user-001",
                UserName = "admin",
                Changes = new Dictionary<string, ChangeValue>
                {
                    ["status"] = new() { Old = "active", New = "resolved" }
                },
                Timestamp = DateTime.UtcNow.AddHours(-2).ToString("yyyy-MM-ddTHH:mm:ss")
            }
        };

        return Ok(entries);
    }

    // GET: api/audit/export
    [HttpGet("export")]
    public IActionResult ExportAuditLog([FromQuery] string format = "csv")
    {
        var content = "timestamp,action,user,entity\n";
        content += "2024-01-01,settings_update,admin,settings\n";

        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        return File(bytes, "text/csv", "audit-log.csv");
    }
}

// DTO Classes
public class SessionInfo
{
    public string Id { get; set; } = string.Empty;
    public string Device { get; set; } = string.Empty;
    public string Browser { get; set; } = string.Empty;
    public string Ip { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string StartedAt { get; set; } = string.Empty;
    public string LastActiveAt { get; set; } = string.Empty;
    public bool Current { get; set; }
}

public class SecuritySettings
{
    public bool TwoFactorEnabled { get; set; }
    public string? TwoFactorMethod { get; set; }
    public bool LoginNotifications { get; set; }
    public bool TrustedDevices { get; set; }
    public int PasswordExpiryDays { get; set; }
    public int MinPasswordLength { get; set; }
    public bool RequireSpecialChars { get; set; }
}

public class Enable2FARequest
{
    public string Method { get; set; } = "app";
}

public class Verify2FARequest
{
    public string Code { get; set; } = string.Empty;
}

public class TrustedDevice
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LastUsedAt { get; set; } = string.Empty;
}

public class LoginHistoryEntry
{
    public string Timestamp { get; set; } = string.Empty;
    public string Ip { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Device { get; set; } = string.Empty;
    public bool Success { get; set; }
}

public class AuditEntry
{
    public string Id { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public Dictionary<string, ChangeValue>? Changes { get; set; }
    public string Timestamp { get; set; } = string.Empty;
}

public class ChangeValue
{
    public string Old { get; set; } = string.Empty;
    public string New { get; set; } = string.Empty;
}

public class AuditFilters
{
    public string? Action { get; set; }
    public string? EntityType { get; set; }
    public string? UserId { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
}
