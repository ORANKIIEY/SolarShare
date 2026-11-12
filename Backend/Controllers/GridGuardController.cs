using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/gridguard")]
    public class GridGuardController : ControllerBase
    {
        private readonly ILogger<GridGuardController> _logger;
        private readonly GridGuardOrchestrator _orchestrator;

        public GridGuardController(
            ILogger<GridGuardController> logger,
            GridGuardOrchestrator orchestrator)
        {
            _logger = logger;
            _orchestrator = orchestrator;
        }

        // receive telemetry from anywhere (mqtt bridge or direct)
        [HttpPost("telemetry")]
        public async Task<ActionResult<TheftVerdict>> ReceiveTelemetry([FromBody] TelemetryPayload telemetry)
        {
            _logger.LogInformation("Received telemetry from pole {PoleId}", telemetry.pole_id);
            
            var verdict = await _orchestrator.ProcessTelemetryAsync(telemetry);
            
            var result = new OrchestratedResult
            {
                telemetry = telemetry,
                ai_verdict = verdict,
                received_at = DateTime.UtcNow.ToString("O"),
                processed_at = DateTime.UtcNow.ToString("O")
            };

            // flag theft detections
            if (verdict.is_theft)
            {
                _logger.LogWarning("Theft detected at pole {PoleId}", telemetry.pole_id);
                return Ok(new { alert = true, result });
            }

            return Ok(result);
        }

        // generates fake theft data for testing
        [HttpPost("simulate")]
        public async Task<ActionResult<TheftVerdict>> SimulateTheft()
        {
            var simulatedTelemetry = new TelemetryPayload
            {
                pole_id = "simulated-pole-001",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                supply_current = 15.5f,
                meter_sum = 12.0f,
                voltage = 230.0f,
                differential = 3.5f,
                potential_theft = true,
                anomaly_score = 0.9f
            };

            _logger.LogInformation("Simulating theft scenario");
            await _orchestrator.SimulateTelemetryAsync(simulatedTelemetry);
            
            var verdict = await _orchestrator.ProcessTelemetryAsync(simulatedTelemetry);
            
            return Ok(new 
            { 
                message = "Theft simulation triggered",
                simulated_data = simulatedTelemetry,
                ai_verdict = verdict
            });
        }

        // health check endpoint
        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new 
            { 
                status = "healthy", 
                service = "GridGuard Orchestrator",
                timestamp = DateTime.UtcNow.ToString("O")
            });
        }
    }
}
