using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using ClientChatLambda.models;
using OpenAI.Chat;

namespace ClientChatLambda.Repositories;

public class DynamoChatRepository : IChatRepository
{
    private readonly DynamoDBContext _context;

    public async Task<Chat> CreateChat(string client_id)
    {
        if (string.IsNullOrEmpty(client_id))
        {
            throw new ArgumentNullException(nameof(client_id));
        }
        
        var chat = new Chat(client_id);
        
        await _context.SaveAsync(new ChatEntity()
        {
            client_id = chat.ClientId,
            chat_id = chat.ChatId,
            products_ids = chat.ProductsIds,
            created_at = chat.CreatedAt,
            updated_at = chat.UpdatedAt,
            messages = new List<MessageEntity>()
        });

        return chat;
    }

    public async Task<Chat> GetChat(string chat_id)
    {
        if (string.IsNullOrEmpty(chat_id))
        {
            throw new ArgumentNullException(nameof(chat_id));
        }
        
        var entity= await _context.LoadAsync<ChatEntity>(chat_id);

        if (entity == null)
        {
            throw new KeyNotFoundException($"Chat with id {chat_id} not found");
        }

        return new Chat(entity);
    }

    public async Task<List<Chat>> GetChatsByUserId(string client_id)
    {
        if (string.IsNullOrEmpty(client_id))
        {
            throw new ArgumentNullException(nameof(client_id));
        }

        var entities = await _context.ScanAsync<ChatEntity>(new[]
        {
            new ScanCondition("client_id", ScanOperator.Equal, client_id)
        }).GetRemainingAsync();
        
        var chats = from entity in entities
                                          select new Chat(entity);
        
        return chats.ToList();
    }

    public async Task SaveMessage(string chat_id, Message message)
    {
        var entity = await _context.LoadAsync<ChatEntity>(chat_id);

        if (entity == null)
        {
            throw new KeyNotFoundException($"Chat with id {chat_id} not found");
        }

        if (message == null || message.SenderRole == null
                            || string.IsNullOrEmpty(message.Content) || message.SentAt == null)
        {
            throw new NullReferenceException("message is null or filed is null");
        }

        entity.messages.Add(new MessageEntity()
        {
            sender_role = message.SenderRole ?? MessageSenderRole.NotInitilized,
            content = message.Content,
            sent_at = message.SentAt ?? DateTime.UtcNow,
        });

        await _context.SaveAsync(entity);
    }

    public async Task SaveProduct(string chat_id, string product_id)
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
        
        entity.products_ids.Add(product_id);
        
        await _context.SaveAsync(entity);
    }

    public async Task UpdateChat(Chat chat)
    {
        var entity = await _context.LoadAsync<ChatEntity>(chat.ChatId);

        if (entity == null)
        {
            throw new KeyNotFoundException($"Chat with id {chat.ChatId} not found");
        }

        entity.messages = (from message in entity.messages
            select new MessageEntity()
            {
                content =  message.content,
                sender_role = message.sender_role,
                sent_at = message.sent_at
            }
            ).ToList();
        
        entity.products_ids = entity.products_ids;
        entity.updated_at = entity.updated_at;
        
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
}