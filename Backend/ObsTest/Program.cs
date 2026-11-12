using DotNetEnv;
using OBS;
using OBS.Model;
using System.Text;

Env.Load();

string accessKey = Environment.GetEnvironmentVariable("HuaweiCloud__OBS__AccessKey") ?? "";
string secretKey = Environment.GetEnvironmentVariable("HuaweiCloud__OBS__SecretKey") ?? "";
string endpoint  = Environment.GetEnvironmentVariable("HuaweiCloud__OBS__Endpoint")  ?? "";
string bucket    = Environment.GetEnvironmentVariable("HuaweiCloud__OBS__BucketName") ?? "";

if (string.IsNullOrWhiteSpace(accessKey) ||
    string.IsNullOrWhiteSpace(secretKey) ||
    string.IsNullOrWhiteSpace(endpoint)  ||
    string.IsNullOrWhiteSpace(bucket))
{
    Console.WriteLine("ERROR: Missing required OBS environment variables.");
    Console.WriteLine("Required: HuaweiCloud__OBS__AccessKey, HuaweiCloud__OBS__SecretKey, HuaweiCloud__OBS__Endpoint, HuaweiCloud__OBS__BucketName");
    Environment.Exit(1);
}

try
{
    var obsConfig = new ObsConfig { Endpoint = endpoint };
    var client = new ObsClient(accessKey, secretKey, obsConfig);

    var content = "gridguard obs connectivity test";
    var fileName = $"obs_test_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.txt";
    using var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));

    var putReq = new PutObjectRequest
    {
        BucketName = bucket,
        ObjectKey = fileName,
        InputStream = stream,
        ContentType = "text/plain"
    };

    var resp = client.PutObject(putReq);
    if ((int)resp.StatusCode is >= 200 and < 300)
    {
        var host = endpoint.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? endpoint : $"https://{endpoint}";
        var url = $"{host}/{bucket}/{Uri.EscapeDataString(fileName)}";
        Console.WriteLine("OK: Uploaded test object");
        Console.WriteLine($"URL: {url}");
        Environment.Exit(0);
    }
    else
    {
        Console.WriteLine($"ERROR: Upload failed. Status={resp.StatusCode}");
        Environment.Exit(2);
    }
}
catch (Exception ex)
{
    Console.WriteLine("ERROR: Exception during OBS upload test");
    Console.WriteLine(ex.Message);
    Environment.Exit(3);
}
