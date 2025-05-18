using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.Lambda.Core;
using ClientChatLambda;
using ClientChatLambda.models;

namespace ClientChatAPI.Repositories;

public class DynamoChatRepository : IWriteRepository<Chat>
{
    private readonly IDynamoDBContext _dynamoDb;
    private ILambdaLogger? _logger;
    
    public ILambdaLogger? Logger
    {
        get => _logger;
        set => _logger = value;
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