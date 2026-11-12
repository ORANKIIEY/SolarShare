using Microsoft.AspNetCore.Mvc;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/reports/theft-history")]
public class TheftHistoryController : ControllerBase
{
    private readonly ITheftHistoryRepository _repository;

    public TheftHistoryController(ITheftHistoryRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<IActionResult> GetTheftHistory()
    {
        var events = await _repository.GetAllAsync();
        return Ok(events);
    }
}
