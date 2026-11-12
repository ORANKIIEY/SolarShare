using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/locales")]
public class LocalizationController : ControllerBase
{
    // GET: api/locales
    [HttpGet]
    public IActionResult GetAvailableLocales()
    {
        var locales = new List<Locale>
        {
            new() { Code = "en", Name = "English", NativeName = "English", Rtl = false },
            new() { Code = "af", Name = "Afrikaans", NativeName = "Afrikaans", Rtl = false },
            new() { Code = "zu", Name = "Zulu", NativeName = "isiZulu", Rtl = false },
            new() { Code = "xh", Name = "Xhosa", NativeName = "isiXhosa", Rtl = false }
        };

        return Ok(locales);
    }

    // GET: api/locales/{locale}/translations
    [HttpGet("{locale}/translations")]
    public IActionResult GetTranslations(string locale)
    {
        // Return translations for the requested locale
        var translations = new Dictionary<string, string>
        {
            ["dashboard"] = "Dashboard",
            ["assets"] = "Assets",
            ["alerts"] = "Alerts",
            ["settings"] = "Settings"
        };

        return Ok(translations);
    }

    // GET: api/locales/current
    [Authorize]
    [HttpGet("current")]
    public IActionResult GetCurrentLocale()
    {
        return Ok(new { locale = "en", translations = new Dictionary<string, string>() });
    }

    // PUT: api/locales/current
    [Authorize]
    [HttpPut("current")]
    public IActionResult SetLocale([FromBody] SetLocaleRequest request)
    {
        return Ok(new { locale = request.Locale });
    }
}

[ApiController]
[Route("api/timezones")]
public class TimezonesController : ControllerBase
{
    // GET: api/timezones
    [HttpGet]
    public IActionResult GetAvailableTimezones()
    {
        var timezones = new List<string>
        {
            "UTC",
            "Africa/Johannesburg",
            "Europe/London",
            "America/New_York",
            "Asia/Dubai",
            "Australia/Sydney"
        };

        return Ok(timezones);
    }

    // GET: api/timezones/current
    [Authorize]
    [HttpGet("current")]
    public IActionResult GetCurrentTimezone()
    {
        return Ok(new { timezone = "Africa/Johannesburg" });
    }

    // PUT: api/timezones/current
    [Authorize]
    [HttpPut("current")]
    public IActionResult SetTimezone([FromBody] SetTimezoneRequest request)
    {
        return Ok(new { timezone = request.Timezone });
    }
}

[Authorize]
[ApiController]
[Route("api/date-format")]
public class DateFormatController : ControllerBase
{
    // GET: api/date-format
    [HttpGet]
    public IActionResult GetDateFormat()
    {
        return Ok(new { format = "yyyy-MM-dd" });
    }

    // PUT: api/date-format
    [HttpPut]
    public IActionResult SetDateFormat([FromBody] SetDateFormatRequest request)
    {
        return Ok(new { format = request.Format });
    }
}

[Authorize]
[ApiController]
[Route("api/number-format")]
public class NumberFormatController : ControllerBase
{
    // GET: api/number-format
    [HttpGet]
    public IActionResult GetNumberFormat()
    {
        return Ok(new NumberFormat
        {
            DecimalSeparator = ".",
            ThousandSeparator = ",",
            DecimalPlaces = 2
        });
    }

    // PUT: api/number-format
    [HttpPut]
    public IActionResult SetNumberFormat([FromBody] NumberFormat request)
    {
        return Ok(request);
    }
}

[Authorize]
[ApiController]
[Route("api/currency")]
public class CurrencyController : ControllerBase
{
    // GET: api/currency
    [HttpGet]
    public IActionResult GetCurrencyConfig()
    {
        return Ok(new CurrencyConfig
        {
            Code = "ZAR",
            Symbol = "R",
            Position = "before",
            DecimalPlaces = 2
        });
    }

    // PUT: api/currency
    [HttpPut]
    public IActionResult SetCurrencyConfig([FromBody] CurrencyConfig request)
    {
        return Ok(request);
    }
}

[Authorize]
[ApiController]
[Route("api/units")]
public class UnitsController : ControllerBase
{
    // GET: api/units
    [HttpGet]
    public IActionResult GetUnitConfig()
    {
        return Ok(new UnitConfig
        {
            Temperature = "celsius",
            Distance = "metric",
            Weight = "metric",
            Pressure = "pa"
        });
    }

    // PUT: api/units
    [HttpPut]
    public IActionResult SetUnitConfig([FromBody] UnitConfig request)
    {
        return Ok(request);
    }
}

// DTO Classes
public class Locale
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string NativeName { get; set; } = string.Empty;
    public bool Rtl { get; set; }
}

public class SetLocaleRequest
{
    public string Locale { get; set; } = string.Empty;
}

public class SetTimezoneRequest
{
    public string Timezone { get; set; } = string.Empty;
}

public class SetDateFormatRequest
{
    public string Format { get; set; } = string.Empty;
}

public class NumberFormat
{
    public string DecimalSeparator { get; set; } = string.Empty;
    public string ThousandSeparator { get; set; } = string.Empty;
    public int DecimalPlaces { get; set; }
}

public class CurrencyConfig
{
    public string Code { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public int DecimalPlaces { get; set; }
}

public class UnitConfig
{
    public string Temperature { get; set; } = string.Empty;
    public string Distance { get; set; } = string.Empty;
    public string Weight { get; set; } = string.Empty;
    public string Pressure { get; set; } = string.Empty;
}

// Need this
