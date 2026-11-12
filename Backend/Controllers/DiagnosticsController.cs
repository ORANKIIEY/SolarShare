using Microsoft.AspNetCore.Mvc;
using OBS;
using OBS.Model;

namespace Backend.Controllers;

[ApiController]
[Route("api/diagnostics")]
public class DiagnosticsController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<DiagnosticsController> _logger;

    public DiagnosticsController(IConfiguration configuration, ILogger<DiagnosticsController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("obs-test")]
    public IActionResult ObsTest([FromBody] string? content = null)
    {
        var obsSection = _configuration.GetSection("HuaweiCloud:OBS");
        var accessKey = obsSection["AccessKey"] ?? string.Empty;
        var secretKey = obsSection["SecretKey"] ?? string.Empty;
        var endpoint = obsSection["Endpoint"] ?? string.Empty;
        var bucket = obsSection["BucketName"] ?? string.Empty;

        if (string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey) ||
            string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(bucket))
        {
            return BadRequest(new { ok = false, error = "Missing OBS configuration" });
        }

        try
        {
            var obsConfig = new ObsConfig { Endpoint = endpoint };
            var client = new ObsClient(accessKey, secretKey, obsConfig);

            var fileName = $"obs_test_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.txt";
            var bytes = System.Text.Encoding.UTF8.GetBytes(content ?? "gridguard obs connectivity test");
            using var stream = new MemoryStream(bytes);

            var putReq = new PutObjectRequest
            {
                BucketName = bucket,
                ObjectKey = fileName,
                InputStream = stream,
                ContentType = "text/plain"
            };

            var resp = client.PutObject(putReq);
            if ((int)resp.StatusCode is >= 200 and < 300)
            {
                var host = endpoint.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? endpoint : $"https://{endpoint}";
                var url = $"{host}/{bucket}/{Uri.EscapeDataString(fileName)}";
                return Ok(new { ok = true, url });
            }

            return StatusCode((int)resp.StatusCode, new { ok = false, status = resp.StatusCode.ToString() });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OBS test failed");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}
