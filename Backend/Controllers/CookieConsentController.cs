using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/cookies")]
public class CookieConsentController : ControllerBase
{
    private const string ConsentCookieName = "gridguard_cookie_consent";
    private const string EssentialCookieName = "gridguard_essential";
    private const string AnalyticsCookieName = "gridguard_analytics";

    public class ConsentRequest
    {
        public bool Essential { get; set; } = true;
        public bool Analytics { get; set; } = false;
        public bool Marketing { get; set; } = false;
    }

    public class ConsentStatus
    {
        public bool HasConsent { get; set; }
        public bool Essential { get; set; }
        public bool Analytics { get; set; }
        public bool Marketing { get; set; }
        public DateTime? ConsentDate { get; set; }
    }

    [HttpGet("status")]
    public IActionResult GetConsentStatus()
    {
        var consentCookie = Request.Cookies[ConsentCookieName];
        
        if (string.IsNullOrEmpty(consentCookie))
        {
            return Ok(new ConsentStatus
            {
                HasConsent = false,
                Essential = false,
                Analytics = false,
                Marketing = false
            });
        }

        try
        {
            var consent = System.Text.Json.JsonSerializer.Deserialize<ConsentRequest>(consentCookie);
            return Ok(new ConsentStatus
            {
                HasConsent = true,
                Essential = consent?.Essential ?? true,
                Analytics = consent?.Analytics ?? false,
                Marketing = consent?.Marketing ?? false,
                ConsentDate = GetConsentDate()
            });
        }
        catch
        {
            return Ok(new ConsentStatus
            {
                HasConsent = false,
                Essential = false,
                Analytics = false,
                Marketing = false
            });
        }
    }

    [HttpPost("consent")]
    public IActionResult SetConsent([FromBody] ConsentRequest request)
    {
        var consentData = System.Text.Json.JsonSerializer.Serialize(request);
        
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddYears(1)
        };

        Response.Cookies.Append(ConsentCookieName, consentData, cookieOptions);
        
        // Set essential cookie if essential is accepted
        if (request.Essential)
        {
            Response.Cookies.Append(EssentialCookieName, "true", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddYears(1)
            });
        }

        // Set analytics cookie if analytics is accepted
        if (request.Analytics)
        {
            Response.Cookies.Append(AnalyticsCookieName, "true", new CookieOptions
            {
                HttpOnly = false,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddYears(1)
            });
        }

        return Ok(new 
        { 
            message = "Consent saved successfully",
            consent = request
        });
    }

    [HttpPost("reject")]
    public IActionResult RejectAll()
    {
        var minimalConsent = new ConsentRequest
        {
            Essential = true,  // Essential cookies are always required
            Analytics = false,
            Marketing = false
        };

        var consentData = System.Text.Json.JsonSerializer.Serialize(minimalConsent);
        
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddYears(1)
        };

        Response.Cookies.Append(ConsentCookieName, consentData, cookieOptions);

        return Ok(new 
        { 
            message = "Minimal consent saved (essential only)",
            consent = minimalConsent
        });
    }

    [HttpPost("reset")]
    public IActionResult ResetConsent()
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(-1)
        };

        Response.Cookies.Append(ConsentCookieName, "", cookieOptions);
        Response.Cookies.Append(EssentialCookieName, "", cookieOptions);
        Response.Cookies.Append(AnalyticsCookieName, "", cookieOptions);

        return Ok(new { message = "Consent reset successfully" });
    }

    private DateTime? GetConsentDate()
    {
        var essentialCookie = Request.Cookies[EssentialCookieName];
        if (!string.IsNullOrEmpty(essentialCookie))
        {
            // Return a placeholder date - in production you'd store the actual consent date
            return DateTime.UtcNow.AddDays(-1);
        }
        return null;
    }
}
