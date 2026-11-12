using Backend.Models;

namespace Backend.Data;

/// <summary>
/// Abstraction for querying theft history (grid isolation) events.
/// </summary>
public interface ITheftHistoryRepository
{
    Task<IEnumerable<TheftHistoryEvent>> GetAllAsync();
}
