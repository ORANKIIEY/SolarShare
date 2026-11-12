using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("incidents")]
public class Incident
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("time")]
    public string Time { get; set; } = string.Empty;

    [Column("location")]
    public string Location { get; set; } = string.Empty;

    [Column("type")]
    public string Type { get; set; } = string.Empty; // Meter Bypass, Cable Hook, Tampering

    [Column("status")]
    public string Status { get; set; } = "active"; // active, dispatched, resolved, investigating

    [Column("confidence")]
    public int Confidence { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
