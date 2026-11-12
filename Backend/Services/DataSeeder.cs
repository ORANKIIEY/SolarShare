using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class DataSeeder
    {
        private readonly IDbContextFactory<AppDbContext> _dbFactory;
        private readonly ILogger<DataSeeder> _logger;

        public DataSeeder(IDbContextFactory<AppDbContext> dbFactory, ILogger<DataSeeder> logger)
        {
            _dbFactory = dbFactory;
            _logger = logger;
        }

        public async Task SeedAsync()
        {
            using var context = await _dbFactory.CreateDbContextAsync();
            _logger.LogInformation("Checking if database seeding is required...");

            // 1. Seed Assets (Poles and Transformers)
            if (!await context.Assets.AnyAsync())
            {
                _logger.LogInformation("Seeding Assets...");
                var assets = new List<Asset>();
                var random = new Random();

                // Generate poles around Johannesburg / Pretoria area
                for (int i = 1; i <= 100; i++)
                {
                    var isTransformer = i % 15 == 0;
                    assets.Add(new Asset
                    {
                        Id = $"POLE-{1000 + i}",
                        Name = isTransformer ? $"Transformer Hub {1000 + i}" : $"Utility Pole {1000 + i}",
                        Type = isTransformer ? "Transformer" : "Pole",
                        Location = i % 3 == 0 ? "Sandton, GP" : (i % 3 == 1 ? "Pretoria, GP" : "Midrand, GP"),
                        Status = random.NextDouble() > 0.92 ? "warning" : "healthy",
                        Load = random.Next(15, 90),
                        Lat = -26.12 + (random.NextDouble() * 0.3), // Distributed around Joburg/Pretoria
                        Lng = 28.05 + (random.NextDouble() * 0.3),
                        LastInspection = DateTime.UtcNow.AddDays(-random.Next(1, 45))
                    });
                }
                context.Assets.AddRange(assets);
                await context.SaveChangesAsync();
            }

            // 2. Seed some initial incidents
            if (!await context.Incidents.AnyAsync())
            {
                _logger.LogInformation("Seeding Incidents...");
                var random = new Random();
                for (int i = 1; i <= 30; i++)
                {
                    var status = i % 4 == 0 ? "Resolved" : (i % 4 == 1 ? "Active" : "Dispatched");
                    context.Incidents.Add(new Incident
                    {
                        Id = $"INC-{500 + i}",
                        Time = DateTime.UtcNow.AddHours(-i * 3).ToString("HH:mm"),
                        Location = $"Asset POLE-{1000 + random.Next(1, 100)}",
                        Type = i % 5 == 0 ? "Voltage Sag" : "Suspicious Waveform",
                        Status = status,
                        Confidence = random.Next(65, 99),
                        CreatedAt = DateTime.UtcNow.AddHours(-i * 3)
                    });
                }
                await context.SaveChangesAsync();
            }

            // 3. Seed some historical telemetry for multiple devices
            if (!await context.Telemetry.AnyAsync())
            {
                _logger.LogInformation("Seeding Historical Telemetry...");
                var random = new Random();
                var now = DateTime.UtcNow;
                var targetPoles = new[] { "POLE-1001", "POLE-1015", "POLE-1030", "POLE-1045" };

                foreach (var poleId in targetPoles)
                {
                    for (int i = 0; i < 48; i++) // Last 48 hours
                    {
                        context.Telemetry.Add(new Telemetry
                        {
                            Time = now.AddHours(-i),
                            DeviceId = poleId,
                            Voltage = 230 + (random.NextDouble() * 12 - 6),
                            SupplyCurrent = 12 + (random.NextDouble() * 8 - 4),
                            Current = 12 + (random.NextDouble() * 8 - 4),
                            MeterSum = 3000 + (random.NextDouble() * 800 - 400),
                            Differential = random.NextDouble() * 0.5
                        });
                    }
                }
                await context.SaveChangesAsync();
            }

            // 4. Seed initial Theft Events (The "Story of a Signal" evidence)
            if (!await context.TheftEvents.AnyAsync())
            {
                _logger.LogInformation("Seeding Theft Events...");
                var random = new Random();
                for (int i = 1; i <= 10; i++)
                {
                    var isVerified = random.NextDouble() > 0.3;
                    context.TheftEvents.Add(new TheftEvent
                    {
                        Id = Guid.NewGuid(),
                        PoleId = $"POLE-{1000 + random.Next(1, 50)}",
                        Timestamp = DateTime.UtcNow.AddDays(-i),
                        DeltaAmps = 5.5f + (float)random.NextDouble() * 10f,
                        IsTheftVerified = isVerified,
                        ConfidenceScore = 0.85f + (float)random.NextDouble() * 0.14f,
                        WaveformUrl = $"https://obs.ap-southeast-3.myhuaweicloud.com/gridguard-evidence-za/mock_waveform_{i}.json",
                        AiLabel = isVerified ? "theft" : "normal",
                        Status = isVerified ? "Red" : "Green"
                    });
                }
                await context.SaveChangesAsync();
            }

            _logger.LogInformation("Database seeding completed.");
        }
    }
}
