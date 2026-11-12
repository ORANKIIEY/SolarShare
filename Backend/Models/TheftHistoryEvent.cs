using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

/// <summary>
/// Represents a single grid isolation event for the theft history audit trail.
/// </summary>
[Table("theft_history_events")]
public class TheftHistoryEvent
{
    [Key]
    [Column("event_id")]
    public Guid EventId { get; set; }

    [Column("timestamp")]
    public DateTime Timestamp { get; set; }

    [Column("house_id")]
    public string HouseId { get; set; } = string.Empty;

    [Column("reason")]
    public string Reason { get; set; } = string.Empty;

    [Column("status")]
    public string Status { get; set; } = string.Empty;
}
