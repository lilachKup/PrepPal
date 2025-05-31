using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using CreateChatLambda.DB;
using CreateChatLambda.Models;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace CreateChatLambda;

public class Function
{

    private readonly IDynamoDBContext _dynamoDBContext = new DynamoDBContext(new AmazonDynamoDBClient());
    private readonly IDbContext _dbContext;
    
    private readonly Dictionary<string,string> _headers = new Dictionary<string, string>
    {
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Credentials", "true"},
        {"Access-Control-Allow-Headers", "Content-Type"},
        {"Access-Control-Allow-Methods", "OPTIONS,POST,GET"},
        {"Content-Type", "application/json"}
    };
    
    public Function()
    {
        _dbContext = new DynamoDB(_dynamoDBContext);
    }
    
    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="request">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        string chat_id;
        
        _dbContext.Logger = context.Logger;
        
        context.Logger.LogLine($"{request.HttpMethod} {request.Path}");
        
        var hasClientId = request.QueryStringParameters.TryGetValue("client_id", out string client_id);
        
        context.Logger.LogLine($"Request from client {client_id}");
        
        var address = JsonSerializer.Deserialize<RequestBody>(request.Body);
        
        if (address is null)
        {
            context.Logger.LogError("Invalid request body");
            
            return new APIGatewayProxyResponse
            {
                StatusCode = 400,
                Body = "Invalid request body",
                Headers = _headers
            };
        }
        
        if (!hasClientId || string.IsNullOrEmpty(client_id))
        {
            context.Logger.LogError("client_id is required");
            
            return new APIGatewayProxyResponse
            {
                StatusCode = 400,
                Body = "client_id is required",
                Headers = _headers
            };
        }
        
        try
        {
            chat_id = await _dbContext.CreateChat(client_id, address.address);
        }
        catch (Exception e)
        {
            var errorMessage = $"Error creating chat for client {client_id}: {e.Message}";
            context.Logger.LogError(e, errorMessage);
            
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = "Error creating chat",
                Headers = _headers
            };
        }
        
        context.Logger.LogInformation($"Chat {chat_id} created");
        
        return new APIGatewayProxyResponse
        {
            StatusCode = 200,
            Body = JsonSerializer.Serialize(new { chat_id }),
            Headers = _headers
        };
    }
}