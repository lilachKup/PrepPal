using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.Core;
using ClientChatLambda.models;

namespace ClientChatLambda.Repositories;

public class DynamoChatRepository : IChatRepository
{
    private readonly IDynamoDBContext _context;
    
    public ILambdaLogger? Logger { get; set; }

    public DynamoChatRepository()
    {
        _context = new DynamoDBContext(new AmazonDynamoDBClient());
    }

    public async Task<ChatEntity> GetChat(string clinet_id, string chat_id)
    {
        if (string.IsNullOrEmpty(chat_id))
        {
            throw new ArgumentNullException(nameof(chat_id));
        }

        ChatEntity? entity = await _context.LoadAsync<ChatEntity>(chat_id, clinet_id);

        Logger.LogDebug(entity.ToString());

        if (entity == null)
        {
            Logger.LogDebug($"chat with id {chat_id} not found");
            throw new KeyNotFoundException($"Chat with id {chat_id} not found");
        }
        
        Logger.LogDebug($"get chat with id {chat_id}");
        return entity;
    }

    public async Task<List<ChatEntity>> GetChatsByUserId(string client_id ,IComparer<ChatEntity>? comparer = null)
    {
        if (string.IsNullOrEmpty(client_id))
        {
            throw new ArgumentNullException(nameof(client_id));
        }

        var entities = await _context.ScanAsync<ChatEntity>(new[]
        {
            new ScanCondition("client_id", ScanOperator.Equal, client_id)
        }).GetRemainingAsync();
        
        Logger?.LogDebug($"get chats with id {client_id}"
            + $" count {entities.Count}");

        if (comparer != null)
        {
            entities = (from chat in entities
                    orderby comparer
                    select chat).ToList();
            
            Logger?.LogDebug("sort chats by comparer");
        }

        return entities;
    }
    
}