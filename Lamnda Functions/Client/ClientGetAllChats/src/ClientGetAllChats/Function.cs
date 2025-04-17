using System.Text.Json;
using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using ClientChatLambda.models;
using ClientChatLambda.Repositories;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace ClientGetAllChats;

public class Function
{
    private IChatRepository _repository;
    
    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="input">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public async Task<APIGatewayHttpApiV2ProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        string? clientIdStr = request.QueryStringParameters?["id"];
        if (string.IsNullOrEmpty(clientIdStr) && long.TryParse(clientIdStr, out long clientId))
        {
            return new APIGatewayHttpApiV2ProxyResponse
            {
                StatusCode = 400,
                Body = "id is invalid"
            };
        }

        string? getAll = null;
        request.QueryStringParameters?.TryGetValue("get_all", out getAll);
        
        _repository = new DynamoChatRepository();
        List<ChatEntity> chats;

        if (string.IsNullOrEmpty(getAll))
        {
            chats = await _repository.GetChatsByUserId(clientIdStr, new ChatEntityLastUpdateComparer());
        }
        else
        {
            chats = await _repository.GetChatsByUserId(clientIdStr);
        }
        
        return new APIGatewayHttpApiV2ProxyResponse()
        {
            StatusCode = 200,
            Body = JsonSerializer.Serialize(chats)
        };
    }
    
    private class ChatEntityLastUpdateComparer : Comparer<ChatEntity>
    {
        public override int Compare(ChatEntity? x, ChatEntity? y)
        {
            return x.updated_at.CompareTo(y.updated_at);   
        }
    }
}