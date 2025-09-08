using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.Core;
using ClientChatLambda.models;
using OpenAI.Chat;

namespace ClientChatLambda.Repositories;

public class DynamoChatRepository : IChatRepository
{
    private readonly IDynamoDBContext _context;
    
    public ILambdaLogger? Logger { get; set; }

    public DynamoChatRepository()
    {
        _context = new DynamoDBContext(new AmazonDynamoDBClient());
    }

    public async Task<Chat> CreateChat(string client_id)
    {
        if (string.IsNullOrEmpty(client_id))
        {
            throw new ArgumentNullException(nameof(client_id));
        }
        
        var chat = new Chat(client_id);

        var entity = new ChatEntity()
        {
            client_id = chat.ClientId,
            chat_id = chat.ChatId,
            order_products = chat.OrderProducts,
            created_at = chat.CreatedAt,
            updated_at = chat.UpdatedAt,
            messages = new List<MessageEntity>()
        };
        
        await _context.SaveAsync<ChatEntity>(entity);

        Logger.LogDebug($"created chat with id {chat.ChatId}");
        Logger.LogDebug($"created chat with client id {chat.ClientId}");
        
        return chat;
    }

    public async Task<Chat> GetChat(string clinet_id, string chat_id)
    {
        if (string.IsNullOrEmpty(chat_id))
        {
            throw new ArgumentNullException(nameof(chat_id));
        }

        ChatEntity? entity = await _context.LoadAsync<ChatEntity>(chat_id, clinet_id);
        
        if (entity == null)
        {
            Logger.LogInformation($"chat with id {chat_id} not found");
            throw new KeyNotFoundException($"Chat with id {chat_id} not found");
        }
        
        Logger.LogInformation($"Chat: {JsonSerializer.Serialize(entity)}");
        return new Chat(entity);
    }

    public async Task<List<Chat>> GetChatsByUserId(string client_id ,IComparer<Chat>? comparer = null)
    {
        if (string.IsNullOrEmpty(client_id))
        {
            throw new ArgumentNullException(nameof(client_id));
        }

        var entities = await _context.ScanAsync<ChatEntity>(new[]
        {
            new ScanCondition("client_id", ScanOperator.Equal, client_id)
        }).GetRemainingAsync();
        
        Logger.LogDebug($"get chats with id {client_id}"
            + $" count {entities.Count}");
        
        var chats = from entity in entities
                                          select new Chat(entity);

        if (comparer != null)
        {
            chats = from chat in chats
                    orderby comparer
                    select chat;
            
            Logger.LogDebug("sort chats by comparer");
        }
        
        return chats.ToList();
    }

    public async Task SaveMessage(string client_id, string chat_id, Message message)
    {
        
        if (string.IsNullOrEmpty(chat_id))
        {
            throw new ArgumentNullException(nameof(chat_id));
        }
        if (string.IsNullOrEmpty(client_id))
        {
            throw new ArgumentNullException(nameof(client_id));
        }
        
        var entity = await _context.LoadAsync<ChatEntity>(chat_id);

        if (entity == null)
        {
            Logger.LogDebug($"chat with id {chat_id} not found");
            throw new KeyNotFoundException($"Chat with id {chat_id} not found");
        }

        if (message == null || message.SenderRole == null
                            || string.IsNullOrEmpty(message.Content) || message.SentAt == null)
        {
            Logger.LogDebug($"message is null or filed is null");
            throw new NullReferenceException("message is null or filed is null");
        }

        entity.messages.Add(new MessageEntity()
        {
            sender_role = message.SenderRole ?? MessageSenderRole.NotInitilized,
            content = message.Content,
            sent_at = message.SentAt ?? DateTime.UtcNow,
        });
        
        entity.updated_at = entity.messages.Last().sent_at;
        
        Logger.LogDebug($"save message with content {message.Content}");

        await _context.SaveAsync(entity);
    }

    public async Task SaveProduct(string client_id, string chat_id, Product product)
    {
        if (string.IsNullOrEmpty(chat_id))
        {
            throw new ArgumentNullException(nameof(chat_id));
        }
        
        if (product == null)
        {
            throw new ArgumentNullException(nameof(product));
        }
        
        var entity = await _context.LoadAsync<ChatEntity>(chat_id);

        if (entity == null)
        {
            Logger.LogDebug($"chat with id {chat_id} not found");
            throw new KeyNotFoundException($"Chat with id {chat_id} not found");
        }

        //product.Image_url = "";
        entity.order_products.Add(product);
        entity.updated_at = DateTime.UtcNow;
        
        Logger.LogDebug($"save product with id {product}");
        
        await _context.SaveAsync(entity);
    }

    public async Task UpdateChat(Chat chat)
    {
        var entity = await _context.LoadAsync<ChatEntity>(chat.ChatId, chat.ClientId);

        if (entity == null)
        {
            Logger.LogDebug($"chat with id {chat.ChatId} not found");
            throw new KeyNotFoundException($"Chat with id {chat.ChatId} not found");
        }

        entity.messages = (from message in chat.Messages
                orderby message.SentAt
                select getMessageEntity(message)
                ).ToList();

        entity.primary_messages = (from message in chat.PrimaryMessages select getMessageEntity(message)).ToList();
        
        entity.order_products = chat.OrderProducts;
        entity.products_to_serch = chat.ProductsToSearch;
        entity.updated_at = chat.UpdatedAt;
        entity.latitude = chat.Latitude;
        entity.longitude = chat.Longitude;
        entity.entity_version = chat.Version;
        
        Logger.LogDebug($"update chat with id {chat.ChatId}");
        
        await _context.SaveAsync(entity);
    }

    public async Task DeleteChat(string chat_id)
    {
        if (string.IsNullOrEmpty(chat_id))
        {
            throw new ArgumentNullException(nameof(chat_id));
        }
        
        var entity = await _context.LoadAsync<ChatEntity>(chat_id);

        if (entity == null)
        {
            throw new KeyNotFoundException($"Chat with id {chat_id} not found");
        }
        
        await _context.DeleteAsync(entity);
    }
    
    private MessageEntity getMessageEntity(Message message)
    {
        return new MessageEntity()
        {
            content = message.Content,
            sender_role = message.SenderRole ?? MessageSenderRole.NotInitilized,
            sent_at = message.SentAt ?? DateTime.UtcNow,
        };
    }
}