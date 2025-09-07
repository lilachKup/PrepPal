using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace StoresFinderByRadius;

public class Function
{
    private readonly IStoreProvider _storeProvider;
    private readonly string _connectionString = Environment.GetEnvironmentVariable("ConnectionString") ?? string.Empty;
    private readonly string _query = Environment.GetEnvironmentVariable("Query") ?? string.Empty;
    
    private readonly Dictionary<string, string> headers = new Dictionary<string, string>
    {
        { "Content-Type", "application/json" },
        { "Access-Control-Allow-Origin", "*" },     // or "http://localhost:3000"  
        { "Access-Control-Allow-Credentials", "true" } // if you ever need cookies/auth
    };
    
    public Function()
    {
        _storeProvider = new SqlStoreProvider(_connectionString, _query);
    }
    
    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="input">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _storeProvider.Logger = context.Logger;
        
        var coordinates = request.QueryStringParameters["coordinates"];
        var radiusStr = request.QueryStringParameters["radius"];
        
        context.Logger.LogLine($"Coordinates: {coordinates}");
        
        double radius;
        radius = double.TryParse(radiusStr, out radius) ? radius : double.NaN;

        if (double.IsNaN(radius))
        {
            context.Logger.LogLine($"Radius is NaN");
            
            return new APIGatewayProxyResponse
            {
                StatusCode = 400,
                Body = "Invalid radius value",
                Headers = headers
            };
        }
        
        context.Logger.LogLine($"Radius: {radius}");
        
        var coordinatesArray = coordinates.Split(',');
        if (coordinatesArray.Length != 2 || 
            !double.TryParse(coordinatesArray[0], out var latitude) || 
            !double.TryParse(coordinatesArray[1], out var longitude))
        {
            context.Logger.LogLine($"Invalid coordinates format: {coordinates}");
            
            return new APIGatewayProxyResponse
            {
                StatusCode = 400,
                Body = "Invalid coordinates value",
                Headers = headers
            };
        }
        
        context.Logger.LogLine($"Latitude: {latitude}, Longitude: {longitude}");

        List<string> storeIds;
        
        try
        {
            storeIds = await _storeProvider.GetStoreIdsByCoordinatesAsync(latitude, longitude, radius);
        }
        catch (Exception e)
        {
            context.Logger.LogLine(e.Message);
            
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = "Internal server error",
                Headers = headers
            };
        }
        
        context.Logger.LogLine($"Found {storeIds.Count} store");
        
        if (storeIds.Count == 0)
        {
            return new APIGatewayProxyResponse
            {
                StatusCode = 404,
                Body = "No stores found",
                Headers = headers
            };
        }
        
        return new APIGatewayProxyResponse
        {
            StatusCode = 200,
            Body = string.Join(",", storeIds),
            Headers = headers
        };
    }
}