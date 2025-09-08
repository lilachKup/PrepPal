using System.Text.Json;
using System.Text.Json.Serialization;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace GoogleAddressLocation;

public class Function
{
    
    private static readonly HttpClient _httpClient = new HttpClient();
        
    // Read the Google Maps API key from environment variables
    private readonly string _googleApiKey = Environment.GetEnvironmentVariable("GOOGLE_MAPS_API_KEY");
    private readonly Dictionary<string,string> _headers = new Dictionary<string, string>
    {
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Credentials", "true"},
        {"Access-Control-Allow-Headers", "Content-Type"},
        {"Access-Control-Allow-Methods", "OPTIONS,GET"},
        {"Content-Type", "application/json"}
    };

    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="request">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        context.Logger.LogLine($"Request: {JsonSerializer.Serialize(request)}");
        if (request.QueryStringParameters == null || !request.QueryStringParameters.TryGetValue("address", out var address))
        {
            return new APIGatewayProxyResponse
            {
                StatusCode = 400,
                Body = "{\"error\":\"Missing 'address' query parameter.\"}",
                Headers = _headers
            };
        }
        
        try
        {
            var coordinates = await GetCoordinates(address);
            context.Logger.LogInformation($"Coordinates for address '{address}': {coordinates.Latitude}, {coordinates.Longitude}");
            
            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = JsonSerializer.Serialize(new {lat = coordinates.Latitude, lon = coordinates.Longitude}),
                Headers = _headers
            };
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error fetching coordinates: {ex.Message}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = "{\"error\":\"Failed to fetch coordinates.\"}",
                Headers = _headers
            };
        }
    }

    private async Task<Coordinates> GetCoordinates(string address)
    {
        var encodedAddress = Uri.EscapeDataString(address);
        
        var geocodeUrl = $"https://maps.googleapis.com/maps/api/geocode/json?address={encodedAddress}&key={_googleApiKey}";
        
        var httpResponse = await _httpClient.GetAsync(geocodeUrl);
        httpResponse.EnsureSuccessStatusCode();

        var jsonResponse = await httpResponse.Content.ReadAsStringAsync();
        
        var geocodeResult = JsonSerializer.Deserialize<GeocodeResponse>(jsonResponse);
        
        if (geocodeResult == null || geocodeResult.Status != "OK" || geocodeResult.Results.Count == 0)
        {
            throw new Exception("Failed to retrieve valid coordinates from Google Maps API.");
        }
        
        var location = geocodeResult.Results[0].Geometry.Location;
        return new Coordinates
        {
            Latitude = location.Lat,
            Longitude = location.Lng
        };
    }
}

public class GeocodeResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; }
    [JsonPropertyName("results")]
    public List<Result> Results { get; set; }
}

public class Result
{
    [JsonPropertyName("geometry")]
    public Geometry Geometry { get; set; }
}

public class Geometry
{
    [JsonPropertyName("location")]
    public Location Location { get; set; }
}

public class Location
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }
    [JsonPropertyName("lng")]
    public double Lng { get; set; }
}