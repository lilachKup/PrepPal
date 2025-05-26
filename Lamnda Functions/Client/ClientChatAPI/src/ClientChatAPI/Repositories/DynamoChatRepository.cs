using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.Core;
using ClientChatLambda;
using ClientChatLambda.models;

namespace ClientChatAPI.Repositories;

public class DynamoChatRepository : IRepository<string, Chat>
{
    private readonly IDynamoDBContext _dynamoDb;
    private ILambdaLogger? _logger;
    
    public ILambdaLogger? Logger
    {
        get => _logger;
        set => _logger = value;
    }

    public async Task<Chat> GetByPkAsync(string id)
    {
        if (string.IsNullOrEmpty(id))
        {
            throw new ArgumentNullException(nameof(id), "Chat ID cannot be null or empty.");
        }

        _logger?.LogInformation($"Retrieving chat with id {id}");

        var entity = await _dynamoDb.LoadAsync<ChatEntity>(id);

        if (entity is null)
        {
            _logger?.LogWarning($"Chat with id {id} not found.");
            throw new KeyNotFoundException($"Chat with id {id} not found.");
        }

        _logger?.LogInformation($"Chat with id {id} retrieved successfully.");

        return new Chat(entity);
        
    }

    public async Task<List<Chat>> GetAllAsync(int limit = -1)
    {
        _logger?.LogInformation("Retrieving all chats");
        
        var search = _dynamoDb.ScanAsync<ChatEntity>(new []{new ScanCondition("chat_id", ScanOperator.IsNotNull)});
        
        var chats = new List<Chat>();

        // Get all chats, respecting the limit
        for (int i = 0; i < limit || limit == -1; i++)
        {
            var entity = await search.GetNextSetAsync();
            if (entity.Count == 0) break;
            
            foreach (var chat in entity)
                chats.Add(new Chat(chat));
        }
        
        _logger?.LogInformation($"Total chats retrieved: {chats.Count}");
        return chats;
    }

    public async Task<List<Chat>> GetWhereAsync(Predicate<Chat> predicate, int limit = -1)
    {
        var search = _dynamoDb.ScanAsync<ChatEntity>(new []{new ScanCondition("chat_id", ScanOperator.IsNotNull)});

        List<Chat> chats = new List<Chat>();
        
        for (int i = 0; i < limit || limit == -1; i++)
        {
            var entity = await search.GetNextSetAsync();
            if (entity.Count == 0) break;
            
            chats = entity.Select(chat => new Chat(chat)).Where(chat => predicate(chat)).ToList();
        }
        
        var loginfo = chats.Count > 0 ? $"Chats retrieved successfully. count = {chats.Count}" : "No chats found matching the predicate.";
        _logger?.LogInformation(loginfo);
        return chats;
    }

    public Task<List<Chat>> GetQueryAsync(string query)
    {
        throw new NotImplementedException();
    }

    public DynamoChatRepository(IDynamoDBContext dynamoDb, ILambdaLogger? logger = null)
    {
        _dynamoDb = dynamoDb;
        _logger = logger;
    }
    
    public async Task<Chat> Create(string clientId)
    {
        var entity = new ChatEntity()
        {
            client_id = clientId,
            created_at = DateTime.UtcNow,
            updated_at = DateTime.UtcNow
        };
        
        _logger?.LogInformation($"Creating chat for client {clientId} with id {entity.chat_id}");
        
        await _dynamoDb.SaveAsync(entity);
        
        _logger?.LogInformation($"Chat created with id {entity.chat_id}");

        return new Chat(entity);
    }

    public async Task<Chat> Update(Chat model)
    {
        if (model is null)
        {
            throw new ArgumentNullException(nameof(model));
        }

        var entity = new ChatEntity()
        {
            chat_id = model.ChatId,
            client_id = model.ClientId,
            order_products = model.OrderProducts,
            products_to_serch = model.ProductsToSearch,
            created_at = model.CreatedAt,
            updated_at = model.UpdatedAt,
            
            messages = (from message in model.Messages
                select new MessageEntity()
                {
                    content = message.Content,
                    sender_role = message.SenderRole ?? MessageSenderRole.NotInitilized,
                    sent_at = message.SentAt ?? DateTime.UtcNow
                }).ToList()
        };
        
        // for some resone it won't update the coordinates
        entity.latitude = model.Latitude;
        entity.longitude = model.Longitude;

        _logger?.LogInformation($"Updating chat for client {model.ClientId} with id {entity.chat_id}");

        await _dynamoDb.SaveAsync(entity);

        _logger?.LogInformation($"Chat updated with id {entity.chat_id}");

        return new Chat(entity);
    }
}