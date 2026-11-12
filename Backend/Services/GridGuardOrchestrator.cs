using System.Net.Http.Json;
using System.Text.Json;
using Backend.Hubs;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using MQTTnet;

namespace Backend.Services
{
    // Background service — connects to MQTT and orchestrates the detection pipeline.
    // Normal telemetry goes to the Python AI microservice.
    // When an anomaly is flagged, the full cloud integration pipeline fires via TheftService.
    public class GridGuardOrchestrator : BackgroundService
    {
        private readonly ILogger<GridGuardOrchestrator> _logger;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly TheftService _theftService;
        private readonly IHubContext<GridGuardHub> _hubContext;
        private readonly IDbContextFactory<AppDbContext> _dbFactory;
        private IMqttClient? _mqttClient;

        private const string MQTT_TOPIC = "grid/pole/telemetry";
        private const string AI_SERVICE_URL = "http://localhost:8000/analyze";

        // Anomaly threshold — if anomaly_score is above this we treat it as a potential theft
        // even if the hardware didn't assert the flag (belt-and-suspenders safety net).
        private const float ANOMALY_THRESHOLD = 0.75f;

        // In-memory store of edge device statuses for dashboard access
        private static readonly Dictionary<string, EdgeDeviceStatus> _edgeDevices = new();
        private static readonly object _deviceLock = new();
        public GridGuardOrchestrator(
            ILogger<GridGuardOrchestrator> logger,
            IConfiguration configuration,
            HttpClient httpClient,
            TheftService theftService,
            IHubContext<GridGuardHub> hubContext,
            IDbContextFactory<AppDbContext> dbFactory)
        {
            _logger = logger;
            _configuration = configuration;
            _httpClient = httpClient;
            _theftService = theftService;
            _hubContext = hubContext;
            _dbFactory = dbFactory;
        }

        /// <summary>
        /// Gets all currently tracked edge devices (ESP32 nodes)
        /// </summary>
        public static IReadOnlyDictionary<string, EdgeDeviceStatus> GetEdgeDevices()
        {
            lock (_deviceLock)
            {
                return new Dictionary<string, EdgeDeviceStatus>(_edgeDevices);
            }
        }

        /// <summary>
        /// Gets a specific edge device by ID
        /// </summary>
        public static EdgeDeviceStatus? GetEdgeDevice(string deviceId)
        {
            lock (_deviceLock)
            {
                return _edgeDevices.TryGetValue(deviceId, out var device) ? device : null;
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("GridGuard Orchestrator starting...");

            var mqttFactory = new MqttClientFactory();
            _mqttClient = mqttFactory.CreateMqttClient();

            var mqttServer = _configuration["Mqtt:Server"] ?? "localhost";
            var mqttPort = int.Parse(_configuration["Mqtt:Port"] ?? "1883");

            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(mqttServer, mqttPort)
                .WithClientId("gridguard-orchestrator")
                .Build();

            // Handle incoming MQTT messages
            _mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                var payload = e.ApplicationMessage.ConvertPayloadToString();
                _logger.LogInformation("Received MQTT message: {Payload}", payload);

                try
                {
                    var telemetry = JsonSerializer.Deserialize<TelemetryPayload>(payload, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (telemetry != null)
                    {
                        await ProcessTelemetryAsync(telemetry, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process MQTT message");
                }
            };

            try
            {
                await _mqttClient.ConnectAsync(options, stoppingToken);
                _logger.LogInformation("Connected to MQTT broker at {Server}:{Port}", mqttServer, mqttPort);

                await _mqttClient.SubscribeAsync(new MqttTopicFilterBuilder()
                    .WithTopic(MQTT_TOPIC)
                    .Build(), stoppingToken);

                _logger.LogInformation("Subscribed to topic: {Topic}", MQTT_TOPIC);

                // Start the ghost simulation loop in parallel
                _ = StartSimulationLoopAsync(stoppingToken);

                // Keep running until the host shuts down
                while (!stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(1000, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MQTT connection failed");
            }
            finally
            {
                if (_mqttClient?.IsConnected == true)
                {
                    await _mqttClient.DisconnectAsync();
                }
            }
        }

        /// <summary>
        /// Dual-path processing:
        ///  • Fast path  → Python AI microservice (all telemetry, for logging / ML training)
        ///  • Alert path → TheftService cloud pipeline (only when anomaly detected)
        /// </summary>
        public async Task<TheftVerdict> ProcessTelemetryAsync(TelemetryPayload telemetry, CancellationToken ct = default)
        {
            var request = new AnalysisRequest { telemetry = telemetry };

            TheftVerdict verdict;

            try
            {
                _logger.LogInformation("Forwarding telemetry to AI service for pole {PoleId}", telemetry.pole_id);

                var response = await _httpClient.PostAsJsonAsync(AI_SERVICE_URL, request, ct);
                response.EnsureSuccessStatusCode();

                verdict = await response.Content.ReadFromJsonAsync<TheftVerdict>(ct)
                    ?? new TheftVerdict { is_theft = false, confidence = 0, category = "parse_error" };

                _logger.LogInformation(
                    "AI Verdict for {PoleId}: is_theft={IsTheft}, confidence={Confidence:F2}, category={Category}",
                    telemetry.pole_id, verdict.is_theft, verdict.confidence, verdict.category);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to call AI service");
                verdict = new TheftVerdict
                {
                    is_theft = false,
                    confidence = 0,
                    category = "error",
                    timestamp = DateTime.UtcNow.ToString("O")
                };
            }

            // ── Edge Device Tracking (ESP32 diagnostics) ──────────────────────────
            // Track and broadcast device status when diagnostics are present
            await UpdateEdgeDeviceStatusAsync(telemetry);

            // ── Cloud Integration Alert Path ──────────────────────────────────────
            // Trigger the full OBS → TaurusDB → ModelArts → SignalR pipeline
            // whenever the hardware, anomaly score, or Python microservice raise an alert.
            bool isAnomaly = telemetry.potential_theft
                || telemetry.anomaly_score >= ANOMALY_THRESHOLD
                || verdict.is_theft;

            if (isAnomaly)
            {
                _logger.LogWarning("THEFT ALERT for pole {PoleId} — firing cloud integration pipeline", telemetry.pole_id);

                // Fire-and-forget: the MQTT handler must not block, but we still
                // want structured error logging if the cloud pipeline fails.
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _theftService.ProcessAlertAsync(telemetry, CancellationToken.None);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "TheftService pipeline failed for pole {PoleId}", telemetry.pole_id);
                    }
                }, CancellationToken.None);
            }

            return verdict;
        }

        // For integration testing without a live MQTT broker
        public async Task SimulateTelemetryAsync(TelemetryPayload telemetry)
        {
            await ProcessTelemetryAsync(telemetry);
        }

        /// <summary>
        /// Updates edge device status from telemetry and broadcasts to dashboard clients
        /// </summary>
        private async Task UpdateEdgeDeviceStatusAsync(TelemetryPayload telemetry)
        {
            // Only update if we have device identification or device-specific diagnostics
            if (string.IsNullOrEmpty(telemetry.device_id) && 
                telemetry.wifi_rssi == null && 
                telemetry.device_temp == null)
            {
                return; // No device diagnostics in this telemetry
            }

            var deviceId = telemetry.device_id ?? telemetry.pole_id;
            
            lock (_deviceLock)
            {
                if (!_edgeDevices.TryGetValue(deviceId, out var device))
                {
                    device = new EdgeDeviceStatus
                    {
                        DeviceId = deviceId,
                        PoleId = telemetry.pole_id
                    };
                    _edgeDevices[deviceId] = device;
                }

                // Update device properties from telemetry
                if (telemetry.wifi_rssi.HasValue)
                    device.SignalStrength = telemetry.wifi_rssi.Value;
                if (telemetry.device_temp.HasValue)
                    device.Temperature = telemetry.device_temp.Value;
                if (!string.IsNullOrEmpty(telemetry.firmware_version))
                    device.FirmwareVersion = telemetry.firmware_version;
                if (telemetry.mqtt_queue_depth.HasValue)
                    device.MqttQueueDepth = telemetry.mqtt_queue_depth.Value;
                if (telemetry.cpu_utilization.HasValue)
                    device.CpuUtilization = telemetry.cpu_utilization.Value;
                if (telemetry.uptime_hours.HasValue)
                    device.UptimeHours = telemetry.uptime_hours.Value;

                device.LastSeen = DateTime.UtcNow;
                device.Status = "online";
            }

            // Broadcast update to all connected dashboard clients
            var payload = new EdgeDevicePayload
            {
                deviceId = deviceId,
                poleId = telemetry.pole_id,
                signalStrength = _edgeDevices[deviceId].SignalStrength,
                temperature = _edgeDevices[deviceId].Temperature,
                firmwareVersion = _edgeDevices[deviceId].FirmwareVersion,
                mqttQueueDepth = _edgeDevices[deviceId].MqttQueueDepth,
                status = _edgeDevices[deviceId].Status,
                lastSeen = _edgeDevices[deviceId].LastSeen,
                cpuUtilization = _edgeDevices[deviceId].CpuUtilization,
                uptimeHours = _edgeDevices[deviceId].UptimeHours
            };

            try
            {
                await GridGuardHub.BroadcastEdgeDeviceUpdateAsync(_hubContext, payload);
                _logger.LogDebug("Broadcasted edge device update for {DeviceId}", deviceId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to broadcast edge device update for {DeviceId}", deviceId);
            }
        }

        /// <summary>
        /// Generates "ghost" data for demo purposes when no real MQTT traffic is coming in.
        /// </summary>
        private async Task StartSimulationLoopAsync(CancellationToken ct)
        {
            _logger.LogInformation("Starting Ghost Data Simulation Loop (Aesthetics: LIVE DATA MODE)");
            var random = new Random();

            while (!ct.IsCancellationRequested)
            {
                try
                {
                    using var context = await _dbFactory.CreateDbContextAsync(ct);

                    // 1. Generate Telemetry for a varied set of poles
                    var basePoles = new[] { "POLE-1001", "POLE-1002", "POLE-1003", "POLE-1004", "POLE-1015", "POLE-1030" };
                    
                    // Pick 4 random poles each tick to keep the dashboard "alive"
                    var activePoles = basePoles.OrderBy(x => random.Next()).Take(4);

                    foreach (var poleId in activePoles)
                    {
                        var isAnomalyTick = random.NextDouble() > 0.97; // 3% chance of a "suspicious" waveform

                        var payload = new TelemetryPayload
                        {
                            pole_id = poleId,
                            device_id = $"ESP32-{poleId}",
                            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                            voltage = 230 + (float)(random.NextDouble() * 8 - 4),
                            supply_current = 8 + (float)(random.NextDouble() * 6),
                            meter_sum = (float)random.Next(2500, 3200),
                            differential = isAnomalyTick ? 4.5f + (float)random.NextDouble() * 5f : (float)random.NextDouble() * 0.5f,
                            potential_theft = isAnomalyTick,
                            anomaly_score = isAnomalyTick ? 0.8f + (float)random.NextDouble() * 0.15f : (float)random.NextDouble() * 0.2f,
                            wifi_rssi = -55 - random.Next(0, 25),
                            device_temp = 32 + (float)random.Next(0, 12),
                            firmware_version = "v1.2.4-stable",
                            cpu_utilization = 15 + random.Next(0, 20),
                            uptime_hours = 124 + (int)(DateTime.UtcNow.Hour)
                        };

                        _logger.LogDebug("[SIM] Generating live telemetry for {PoleId} (Anomaly: {IsAnomaly})", poleId, isAnomalyTick);

                        // Process it (broadcasting via SignalR and potentially triggering the cloud pipeline)
                        await ProcessTelemetryAsync(payload, ct);

                        // Save to history table for the charts
                        context.Telemetry.Add(new Telemetry
                        {
                            Time = DateTime.UtcNow,
                            DeviceId = poleId,
                            Voltage = (double)payload.voltage,
                            SupplyCurrent = (double)payload.supply_current,
                            Current = (double)payload.supply_current, // Mirroring for now
                            MeterSum = (double)payload.meter_sum,
                            Differential = (double)payload.differential
                        });
                    }

                    // 2. Occasionally update an asset status to simulate "maintenance" or "healing"
                    if (random.NextDouble() > 0.92)
                    {
                        var assets = await context.Assets.Take(20).ToListAsync(ct);
                        if (assets.Any())
                        {
                            var asset = assets[random.Next(assets.Count)];
                            var oldStatus = asset.Status;
                            asset.Status = random.NextDouble() > 0.8 ? "warning" : "healthy";
                            asset.Load = random.Next(20, 95);
                            _logger.LogInformation("[SIM] Asset {AssetId} status changed: {Old} -> {New}", asset.Id, oldStatus, asset.Status);
                        }
                    }

                    await context.SaveChangesAsync(ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Simulation loop error");
                }

                // Wait 4 seconds for a snappy feel on the dashboard
                await Task.Delay(4000, ct);
            }
        }
    }
}
