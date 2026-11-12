using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>
/// API Controller for accessing ESP32/Edge Device status information
/// Dashboard clients can poll this endpoint for current device diagnostics
/// </summary>
[ApiController]
[Route("api/edgedevice")]
public class EdgeDeviceController : ControllerBase
{
    private readonly ILogger<EdgeDeviceController> _logger;

    public EdgeDeviceController(ILogger<EdgeDeviceController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Gets all currently tracked ESP32 edge devices
    /// </summary>
    [HttpGet]
    public IActionResult GetAllDevices()
    {
        var devices = GridGuardOrchestrator.GetEdgeDevices();
        
        if (devices.Count == 0)
        {
            // Return default demo device if no real devices are connected
            return Ok(new[]
            {
                new EdgeDeviceStatus
                {
                    DeviceId = "esp32-pole-001",
                    PoleId = "P-001",
                    SignalStrength = -64,
                    Temperature = 42.0f,
                    FirmwareVersion = "GG-WIFI-AX-1.4.2",
                    MqttQueueDepth = 0,
                    Status = "online",
                    LastSeen = DateTime.UtcNow,
                    CpuUtilization = 15.0f,
                    UptimeHours = 48.5f
                }
            });
        }

        return Ok(devices.Values);
    }

    /// <summary>
    /// Gets a specific edge device by its ID
    /// </summary>
    [HttpGet("{deviceId}")]
    public IActionResult GetDevice(string deviceId)
    {
        var device = GridGuardOrchestrator.GetEdgeDevice(deviceId);
        
        if (device == null)
        {
            // Return default demo device if not found
            if (deviceId == "esp32-pole-001" || deviceId == "demo")
            {
                return Ok(new EdgeDeviceStatus
                {
                    DeviceId = deviceId,
                    PoleId = "P-001",
                    SignalStrength = -64,
                    Temperature = 42.0f,
                    FirmwareVersion = "GG-WIFI-AX-1.4.2",
                    MqttQueueDepth = 0,
                    Status = "online",
                    LastSeen = DateTime.UtcNow,
                    CpuUtilization = 15.0f,
                    UptimeHours = 48.5f
                });
            }
            
            return NotFound(new { error = $"Device {deviceId} not found" });
        }

        return Ok(device);
    }

    /// <summary>
    /// Gets device status summary for dashboard widgets
    /// </summary>
    [HttpGet("summary")]
    public IActionResult GetDeviceSummary()
    {
        var devices = GridGuardOrchestrator.GetEdgeDevices();
        
        if (devices.Count == 0)
        {
            // Return demo summary if no real devices
            return Ok(new
            {
                totalDevices = 1,
                onlineDevices = 1,
                offlineDevices = 0,
                warningDevices = 0,
                avgSignalStrength = -64,
                avgTemperature = 42.0f,
                firmwareVersions = new[] { "GG-WIFI-AX-1.4.2" }
            });
        }

        var deviceList = devices.Values.ToList();
        var onlineCount = deviceList.Count(d => d.Status == "online");
        var offlineCount = deviceList.Count(d => d.Status == "offline");
        var warningCount = deviceList.Count(d => d.Status == "warning");
        var avgSignal = deviceList.Any() ? deviceList.Average(d => d.SignalStrength) : 0;
        var avgTemp = deviceList.Any() ? deviceList.Average(d => d.Temperature) : 0;

        return Ok(new
        {
            totalDevices = devices.Count,
            onlineDevices = onlineCount,
            offlineDevices = offlineCount,
            warningDevices = warningCount,
            avgSignalStrength = Math.Round(avgSignal, 1),
            avgTemperature = Math.Round(avgTemp, 1),
            firmwareVersions = deviceList.Select(d => d.FirmwareVersion).Distinct().ToList()
        });
    }
}
