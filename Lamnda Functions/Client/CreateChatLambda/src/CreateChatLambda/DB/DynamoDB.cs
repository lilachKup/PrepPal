using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.Lambda.Core;
using Amazon.Runtime.Internal.Util;
using ClientChatLambda.models;

namespace CreateChatLambda.DB;

public class DynamoDB : IDbContext
{
    private readonly IDynamoDBContext _dynamoDBClient;
    
    public ILambdaLogger? Logger { get; set; }
    
    public DynamoDB(IDynamoDBContext dynamoDBClient)
    {
        _dynamoDBClient = dynamoDBClient;
    }
    
    public async Task<string> CreateChat(string client_id)
    {
        if (string.IsNullOrEmpty(client_id))
        {
            throw new ArgumentNullException(nameof(client_id));
        }

        var chat = new ChatEntity();
        chat.client_id = client_id;
        
        Logger?.LogInformation($"Creating chat for client {client_id} with id {chat.chat_id}");
        
        await _dynamoDBClient.SaveAsync(chat);
        
        Logger?.LogInformation($"Chat created with id {chat.chat_id}");
        
        return chat.chat_id;
    }
}