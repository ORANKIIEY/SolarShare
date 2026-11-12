using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

/// <summary>
/// Represents a single theft detection event written to TaurusDB (MySQL-compatible).
/// Hot-path metadata only — the raw waveform is stored separately in Huawei OBS.
/// </summary>
[Table("theft_events")]
public class TheftEvent
{
    /// <summary>Primary key — unique event identifier.</summary>
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The pole / house that triggered the alert.</summary>
    [Required]
    [MaxLength(128)]
    [Column("pole_id")]
    public string PoleId { get; set; } = string.Empty;

    /// <summary>UTC timestamp when the alert was captured by the hardware.</summary>
    [Column("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Delta between supply current and metered sum (Amps).
    /// A positive value above threshold indicates suspected tapping.
    /// </summary>
    [Column("delta_amps")]
    public float DeltaAmps { get; set; }

    /// <summary>Set to true after ModelArts confirms the anomaly as genuine theft.</summary>
    [Column("is_theft_verified")]
    public bool IsTheftVerified { get; set; }

    /// <summary>AI confidence score (0.0 – 1.0) returned by ModelArts.</summary>
    [Column("confidence_score")]
    public float ConfidenceScore { get; set; }

    /// <summary>
    /// Public / pre-signed URL pointing to the raw waveform JSON in Huawei OBS.
    /// Stored here for fast dashboard lookups without hitting OBS on every request.
    /// </summary>
    [MaxLength(2048)]
    [Column("waveform_url")]
    public string WaveformUrl { get; set; } = string.Empty;

    /// <summary>Human-readable verdict label returned by ModelArts (e.g. "theft", "normal").</summary>
    [MaxLength(64)]
    [Column("ai_label")]
    public string AiLabel { get; set; } = string.Empty;

    /// <summary>Dashboard display status derived from the AI verdict: "Red" | "Green".</summary>
    [MaxLength(16)]
    [Column("status")]
    public string Status { get; set; } = "Green";
}
