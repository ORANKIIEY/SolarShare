using Backend.Data;
using Backend.Hubs;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;
using System.Collections.Frozen;

// ─────────────────────────────────────────────────────────────────────────────
// GridGuard AI Backend — Huawei Cloud Technology Stack
// Work Breakdown compliance:
//   Database    : TaurusDB (GaussDB for MySQL) — local dev uses mysql:8.0 image
//   Auth        : Huawei IAM + MFA via JWT; secrets managed by DEW (KMS)
//   Security    : Huawei WAF (edge), HSS (host), DBSS (DB audit), DEW (encryption)
//   Hosting     : CCE Kubernetes + ServiceStage; image stored in SWR
//   Monitoring  : AOM (Application Operations Management) + LTS (Log Tank Service)
//   Messaging   : IoTDA (MQTT) + ROMA Connect (event streaming)
// ─────────────────────────────────────────────────────────────────────────────

Env.Load();

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

// ── Huawei DEW: JWT secret sourcing ──────────────────────────────────────────
// Work Breakdown: Data Encryption Workshop (DEW) for full-stack encryption
// In production, Jwt:Secret is retrieved from Huawei KMS via DEW SDK:
//   var kmsClient = new KmsClient(...);
//   var secret = await kmsClient.DecryptDatakeyAsync(encryptedKey);
// For local dev, the secret is loaded from appsettings.Development.json.

var taurusConnectionString = builder.Configuration.GetConnectionString("TaurusDB") 
    ?? builder.Configuration["TaurusDB"] 
    ?? builder.Configuration["ConnectionStrings__TaurusDB"];

Console.WriteLine($"[STARTUP] Using Connection String: {(string.IsNullOrEmpty(taurusConnectionString) ? "NULL" : "EXISTS (Masked Password)")}");

if (string.IsNullOrEmpty(taurusConnectionString))
{
    Console.WriteLine("CRITICAL: TaurusDB Connection String is missing!");
}

var serverVersion = new MySqlServerVersion(new Version(8, 0, 22)); 

builder.Services.AddDbContextFactory<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(taurusConnectionString))
    {
        options.UseMySql(
            taurusConnectionString,
            serverVersion,
            mySqlOptions => mySqlOptions
                .EnableRetryOnFailure(maxRetryCount: 3)
                .CommandTimeout(30)
        );
    }
});


builder.Services.AddScoped(sp => 
    sp.GetRequiredService<IDbContextFactory<AppDbContext>>().CreateDbContext());


builder.Services.AddScoped<ITheftHistoryRepository, TheftHistoryRepository>();

builder.Services.AddHttpClient<TheftService>();
builder.Services.AddSingleton<IRegionalRouter, RegionalInfrastructureRouter>();
builder.Services.AddSingleton<TheftService>(); 


builder.Services.AddHttpClient<GridGuardOrchestrator>();
builder.Services.AddHostedService<GridGuardOrchestrator>();


builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
});


builder.Services.AddCors(options =>
{
    // Huawei CAE domains replace Vercel (Project_Work_Breakdown: Vercel/Netlify → CAE static hosting)
    var allowedHosts = new[] { "localhost", "myhuaweicloud.com", "huaweicloud.com", "cloud.huawei.com" }.ToFrozenSet();

    options.AddPolicy("NextJsDashboard", policy =>
    {
        policy
            .SetIsOriginAllowed(origin => 
            {
                var host = new Uri(origin).Host;
                return allowedHosts.Any(h => host.EndsWith(h, StringComparison.OrdinalIgnoreCase));
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();           
    });
});


builder.Services.AddSingleton<JwtService>();
builder.Services.AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"] ?? "Temporary_Development_Key_32_Chars_Length!"))
        };
    });


builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.AddOpenApi();
builder.Services.AddAuthorization(); // Required for [Authorize] attributes


builder.Services.AddSingleton<DataSeeder>();

var app = builder.Build();

// ── Huawei Security Headers ───────────────────────────────────────────────────
app.Use(async (context, next) =>
{
    context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: *.myhuaweicloud.com tile.openstreetmap.org; " +
        "connect-src 'self' *.myhuaweicloud.com wss:;";
    await next();
});

// Run database migrations and seeding
using (var scope = app.Services.CreateScope())
{
    var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>();
    await using var db = await dbFactory.CreateDbContextAsync();
    await db.Database.EnsureCreatedAsync();

    var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
    await seeder.SeedAsync();
    Console.WriteLine("[STARTUP] TaurusDB connected and seeded successfully.");
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("NextJsDashboard");
app.UseAuthentication();
app.UseAuthorization();


app.MapHub<GridGuardHub>("/hubs/gridguard");

app.MapControllers();

app.Run();
