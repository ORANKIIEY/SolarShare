using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/assets")]
public class AssetController : ControllerBase
{
    private readonly AppDbContext _context;

    public AssetController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var assets = await _context.Assets.ToListAsync();
        return Ok(assets);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound(new { error = "Asset not found" });
        return Ok(asset);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateAssetRequest request)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return NotFound(new { error = "Asset not found" });

        if (request.Status != null) asset.Status = request.Status;
        if (request.Load.HasValue) asset.Load = request.Load.Value;

        await _context.SaveChangesAsync();
        return Ok(asset);
    }

    public class UpdateAssetRequest
    {
        public string? Status { get; set; }
        public double? Load { get; set; }
    }
}
