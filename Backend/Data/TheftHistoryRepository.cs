using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

/// <summary>
/// EF Core implementation that queries the theft_history_events table.
/// </summary>
public class TheftHistoryRepository : ITheftHistoryRepository
{
    private readonly AppDbContext _context;

    public TheftHistoryRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TheftHistoryEvent>> GetAllAsync()
    {
        return await _context.TheftHistoryEvents
            .OrderByDescending(e => e.Timestamp)
            .ToListAsync();
    }
}
