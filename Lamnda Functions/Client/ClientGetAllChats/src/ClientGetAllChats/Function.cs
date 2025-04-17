using System.Text.Json;
using Amazon.DynamoDBv2.Model;
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
    public async Task<APIGatewayHttpApiV2ProxyResponse> FunctionHandler(APIGatewayHttpApiV2ProxyRequest request, ILambdaContext context)
    {
        context.Logger.LogLine($"Received request: {JsonSerializer.Serialize(request)}");
        string? clientIdStr = null;

        request.QueryStringParameters?.TryGetValue("id", out clientIdStr);

        if (clientIdStr == null)
        {
            return new APIGatewayHttpApiV2ProxyResponse
            {
                StatusCode = 400,
                Body = "id query is required, please provide it, e.g. ?id=client_id(as number)"
            };      
        }

        if (!long.TryParse(clientIdStr, out long clientId))
        {
            return new APIGatewayHttpApiV2ProxyResponse
            {
                StatusCode = 400,
                Body = "id is invalid"
            };
        }

        string? chat_id = null;
        request.QueryStringParameters?.TryGetValue("chat_id", out chat_id);

        if (_repository == null)
        {
            _repository = new DynamoChatRepository();
        }
        _repository.Logger = context.Logger;
        List<ChatEntity> chats;

        if (chat_id == null)
        {
            try
            {
                chats = await _repository.GetChatsByUserId(clientIdStr, new ChatEntityLastUpdateComparer());
            }
            catch (Exception e)
            {
                context.Logger.LogError(e.Message);
                return new APIGatewayHttpApiV2ProxyResponse
                {
                    StatusCode = 404,
                    Body = "id not found"
                };
            }
            
        }
        else
        {
            try
            {
                chats = new List<ChatEntity>() { await _repository.GetChat(clientIdStr, chat_id) };
            }
            catch (Exception e)
            {
                context.Logger.LogError(e.Message);
                return new APIGatewayHttpApiV2ProxyResponse
                {
                    StatusCode = 404,
                    Body = "id or chat_id is invalid or not found or not match"
                };
            }
            
        }
        
        return new APIGatewayHttpApiV2ProxyResponse()
        {
            StatusCode = 200,
            Body = JsonSerializer.Serialize(chats)
        };
    }
    
    public void SetRepository(IChatRepository repository)
    {
        _repository = repository;
    }
    
    private class ChatEntityLastUpdateComparer : Comparer<ChatEntity>
    {
        public override int Compare(ChatEntity? x, ChatEntity? y)
        {
            return x.updated_at.CompareTo(y.updated_at);   
        }
    }
}