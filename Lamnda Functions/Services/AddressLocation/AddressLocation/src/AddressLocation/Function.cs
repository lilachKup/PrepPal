using System.Text.Json;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;


// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AddressLocation;

public class Function
{
    
    HttpClient _client = new HttpClient();
    
    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="input">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _client.DefaultRequestHeaders.UserAgent.ParseAdd(
            "MyLambdaApp/1.0 (+https://github.com/mosmatan)");
        
        var address = request.QueryStringParameters["address"];
        
        if (string.IsNullOrEmpty(address))
        {
            context.Logger.LogLine($"No address provided");
            
            return new APIGatewayProxyResponse
            {
                StatusCode = 400,
                Body = JsonSerializer.Serialize(new { error = "Address is required" }),
                Headers = new Dictionary<string, string>
                {
                    { "Content-Type", "application/json" }
                }
            };
        }
        
        context.Logger.LogLine($"Address: {address}");
        
        // Call the AddressLocationService to get the location
        
        // URL-encode the address, remove trailing space
        var url = "https://nominatim.openstreetmap.org/search"
                  + "?q=" + Uri.EscapeDataString(address)
                  + "&format=jsonv2";
        
        var location = await _client.GetAsync(url);
        
        context.Logger.LogLine($"Location: {location}");

        if (!location.IsSuccessStatusCode)
        {
            context.Logger.LogLine($"Status code: {location.StatusCode}");
            
            return new APIGatewayProxyResponse
            {
                StatusCode = (int)location.StatusCode,
                Body = JsonSerializer.Serialize(new { error = "Failed to get location" }),
                Headers = new Dictionary<string, string>
                {
                    { "Content-Type", "application/json" }
                }
            };
        }

        OpenstreetmapResponse locationObject = null;

        try
        {
            var json = await location.Content.ReadAsStringAsync();
        
            // Deserialize the response into a list of OpenstreetmapResponse objects
            locationObject = JsonSerializer.Deserialize<List<OpenstreetmapResponse>>(json)[0];
        }
        catch (Exception e)
        {
            context.Logger.LogLine(e.Message);
            
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = JsonSerializer.Serialize(new { error = "Failed to parse location response" }),
                Headers = new Dictionary<string, string>
                {
                    { "Content-Type", "application/json" }
                }
            };
        }

        
        return new APIGatewayProxyResponse
        {
            StatusCode = 200,
            Body = JsonSerializer.Serialize(new LatLon { lat = locationObject.lat, lon = locationObject.lon }),
            Headers = new Dictionary<string, string>
            {
                { "Content-Type", "application/json" }
            }
        };
    }
}