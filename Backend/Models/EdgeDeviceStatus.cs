namespace Backend.Models;

/// <summary>
/// Represents the real-time status of an ESP32 edge device (GridGuard Node)
/// This data is received via MQTT and broadcast to dashboard clients via SignalR
/// </summary>
public class EdgeDeviceStatus
{
    /// <summary>Unique identifier for the edge device (e.g., "esp32-pole-001")</summary>
    public string DeviceId { get; set; } = string.Empty;
    
    /// <summary>Associated pole/asset ID</summary>
    public string PoleId { get; set; } = string.Empty;
    
    /// <summary>WiFi signal strength in dBm (e.g., -64)</summary>
    public int SignalStrength { get; set; }
    
    /// <summary>Device temperature in Celsius</summary>
    public float Temperature { get; set; }
    
    /// <summary>Firmware version running on the device</summary>
    public string FirmwareVersion { get; set; } = "GG-WIFI-AX-1.4.2";
    
    /// <summary>Number of messages in MQTT queue waiting to be sent</summary>
    public int MqttQueueDepth { get; set; }
    
    /// <summary>Current device status: online, offline, error</summary>
    public string Status { get; set; } = "online";
    
    /// <summary>Last time a heartbeat was received from the device</summary>
    public DateTime LastSeen { get; set; } = DateTime.UtcNow;
    
    /// <summary>CPU/Memory utilization percentage if available</summary>
    public float CpuUtilization { get; set; }
    
    /// <summary>Uptime in hours</summary>
    public float UptimeHours { get; set; }
}

/// <summary>
/// Payload for broadcasting edge device updates via SignalR
/// </summary>
public class EdgeDevicePayload
{
    public string deviceId { get; set; } = string.Empty;
    public string poleId { get; set; } = string.Empty;
    public int signalStrength { get; set; }
    public float temperature { get; set; }
    public string firmwareVersion { get; set; } = string.Empty;
    public int mqttQueueDepth { get; set; }
    public string status { get; set; } = "online";
    public DateTime lastSeen { get; set; }
    public float cpuUtilization { get; set; }
    public float uptimeHours { get; set; }
}
