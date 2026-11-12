using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

[Table("telemetry")] // Links to your SQL table
public class Telemetry
{
    // Composite key (Time + DeviceId) is defined in AppDbContext.OnModelCreating
    [Column("time")]
    public DateTime Time { get; set; }

    [Column("device_id")]
    public string DeviceId { get; set; } = string.Empty;

    [Column("current")]
    public double Current { get; set; }

    [Column("voltage")]
    public double Voltage { get; set; }

    [Column("supply_current")]
    public double SupplyCurrent { get; set; }

    [Column("meter_sum")]
    public double MeterSum { get; set; }

    [Column("differential")]
    public double Differential { get; set; }
}
