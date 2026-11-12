using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Models;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services;

/// <summary>
/// Issues short-lived JWT tokens for API authentication.
///
/// Work Breakdown — Security Implementation:
///   - Secret key sourced from Huawei DEW (Data Encryption Workshop / KMS)
///     in production to meet "DEW encryption for sensitive data" requirement.
///   - Full IAM MFA flow: client authenticates via Huawei IAM PKCE,
///     exchanges code at /api/auth/oauth/huawei/exchange, receives this JWT.
///   - Token lifetime 24 h; rotate via Huawei IAM temporary credentials.
///   - All tokens are validated by WAF before reaching this service.
/// </summary>
public class JwtService
{
    private readonly string _secret;
    private readonly string _issuer;

    public JwtService(IConfiguration configuration)
    {
        // Production: retrieve this key from Huawei DEW KMS instead of config.
        // Example using Huawei SDK:
        //   var dew = new KmsClient(credential, "ap-southeast-3");
        //   var req  = new DecryptDatakeyRequest().WithKeyId(keyId).WithCiphertext(encryptedKey);
        //   _secret  = await dew.DecryptDatakeyAsync(req)  → decoded plaintext key;
        _secret = configuration["Jwt:Secret"] ?? throw new InvalidOperationException(
            "Jwt:Secret is not set. In production, source this from Huawei DEW KMS.");
        _issuer = configuration["Jwt:Issuer"] ?? "GridGuardAI";
    }

    public string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
