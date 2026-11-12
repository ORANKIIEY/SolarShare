using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("assets")]
public class Asset
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("type")]
    public string Type { get; set; } = string.Empty; // Transformer, Pole, Substation

    [Column("location")]
    public string Location { get; set; } = string.Empty;

    [Column("status")]
    public string Status { get; set; } = "healthy"; // healthy, warning, critical, offline

    [Column("load")]
    public double Load { get; set; }

    [Column("lat")]
    public double Lat { get; set; }

    [Column("lng")]
    public double Lng { get; set; }

    [Column("last_inspection")]
    public DateTime LastInspection { get; set; }
}
