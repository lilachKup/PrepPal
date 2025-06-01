using System.Text.Json;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace OpenAIAddressLocation;

public class Function
{
    private readonly IAIAgent _aiAgent;
    private readonly string _apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
    private readonly Dictionary<string,string> _headers = new Dictionary<string, string>
    {
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Credentials", "true"},
        {"Access-Control-Allow-Headers", "Content-Type"},
        {"Access-Control-Allow-Methods", "OPTIONS,GET"}
    };
    

    public Function()
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            throw new InvalidOperationException("OPENAI_API_KEY environment variable is not set.");
        }

        _aiAgent = new OpenAIAtoL(_apiKey);
        
    }
    
    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="input">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _aiAgent.Logger = context.Logger;
        
        
        if (request.HttpMethod != "GET")
        {
            return new APIGatewayProxyResponse
            {
                StatusCode = 405,
                Body = "Method Not Allowed",
                Headers = _headers
            };
        }
        
        if (!request.QueryStringParameters.TryGetValue("address", out string? address) || string.IsNullOrEmpty(address))
        {
            context.Logger.LogError("Address parameter is missing or empty.");
            return new APIGatewayProxyResponse
            {
                StatusCode = 400,
                Body = "Address parameter is required.",
                Headers = _headers
            };
        }
        
        context.Logger.LogInformation($"Income request\n{request.HttpMethod} {request.Path}\naddress: {request.QueryStringParameters["address"]}");

        try
        {
            var coordinates = await _aiAgent.GetCoordinatesAsync(address);
            context.Logger.LogInformation(
                $"Coordinates for address '{address}': {coordinates.Latitude}, {coordinates.Longitude}");

            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = JsonSerializer.Serialize(coordinates),
                Headers = _headers
            };
        }
        catch (ArgumentOutOfRangeException ex)
        {
            context.Logger.LogError($"Invalid address exception: {ex.Message}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 400,
                Body = $"Invalid address or not found",
                Headers = _headers
            };
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error processing request: {ex.Message}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = $"Internal Server Error: {ex.Message}",
                Headers = _headers
            };
        }
    }
}