using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;

namespace ClientChatLambda.models;

[DynamoDBTable("ChatHistory")]
public class ChatEntity
{
    [DynamoDBHashKey]
    public string chat_id { get; set; } = Guid.NewGuid().ToString();
    [DynamoDBRangeKey]
    public string client_id { get; set; }
    public List<MessageEntity> messages { get; set; } = new List<MessageEntity>();
    public List<Product> order_products { get; set; } = new List<Product>();
    public List<Product> products_to_serch { get; set; } = new List<Product>();
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }
    public List<MessageEntity> primary_messages { get; set; } = new List<MessageEntity>();
    
    public double latitude { get; set; }
    public double longitude { get; set; }

    public int entity_version { get; set; } = 1;

    public static ChatEntity FromChat(Chat chat)
    {
        ChatEntity entity = new ChatEntity();
        
        entity.chat_id = chat.ChatId;
        entity.client_id = chat.ClientId;
        entity.messages = chat.Messages.Select(m => MessageEntity.FromMessage(m)).ToList();
        entity.order_products = chat.OrderProducts;
        entity.products_to_serch = chat.ProductsToSearch;
        entity.created_at = chat.CreatedAt;
        entity.updated_at = chat.UpdatedAt;
        entity.primary_messages = chat.PrimaryMessages.Select(m => MessageEntity.FromMessage(m)).ToList();
        entity.latitude = chat.Latitude;
        entity.longitude = chat.Longitude;
        entity.entity_version = chat.Version;
        return entity;
    }
}