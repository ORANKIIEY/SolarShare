using System.Collections.Frozen;

namespace Backend.Services;

public record RegionalConfig(
    string ObsEndpoint,
    string ObsBucket,
    string ModelArtsEndpoint,
    string ModelArtsToken,
    string AccessKey,
    string SecretKey
);

/// <summary>
/// Provides O(1) lookup for regional Huawei Cloud infrastructure.
/// Optimized for the "entire continents" scale mentioned in the architecture document.
/// </summary>
public interface IRegionalRouter
{
    RegionalConfig GetConfig(string poleId);
}

public class RegionalInfrastructureRouter : IRegionalRouter
{
    private readonly IConfiguration _configuration;

    // O(1) Immutable Dictionary specifically optimized for AOT and high-throughput lookups
    private static readonly FrozenDictionary<string, RegionalConfig> _routeMap;

    static RegionalInfrastructureRouter()
    {
        // In a production scenario, these would be loaded once from a master config service
        // but stored in a FrozenDictionary for absolute O(1) performance thereafter.
        var routes = new Dictionary<string, RegionalConfig>
        {
            { "ZA", new RegionalConfig(
                "obs.ap-southeast-3.myhuaweicloud.com", 
                "gridguard-evidence-za", 
                "https://modelarts.ap-southeast-3.com/analyze", 
                "TOKEN_ZA", "AK_PROD", "SK_PROD") },
            { "DE", new RegionalConfig(
                "obs.eu-central-1.myhuaweicloud.com", 
                "gridguard-evidence-eu", 
                "https://modelarts.eu-central-1.com/analyze", 
                "TOKEN_DE", "AK_EU", "SK_EU") },
            { "US", new RegionalConfig(
                "obs.us-east-1.myhuaweicloud.com", 
                "gridguard-evidence-us", 
                "https://modelarts.us-east-1.com/analyze", 
                "TOKEN_US", "AK_US", "SK_US") }
        };

        _routeMap = routes.ToFrozenDictionary();
    }

    public RegionalInfrastructureRouter(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public RegionalConfig GetConfig(string poleId)
    {
        if (string.IsNullOrWhiteSpace(poleId)) return _routeMap["ZA"];

        // Extraction logic: "ZA-POLE-001" -> "ZA"
        var parts = poleId.Split('-');
        var region = parts[0].ToUpper();

        return _routeMap.TryGetValue(region, out var config) 
            ? config 
            : _routeMap["ZA"];
    }
}
