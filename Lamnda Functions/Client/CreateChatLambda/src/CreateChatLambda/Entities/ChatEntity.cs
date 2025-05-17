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
    public int entity_version { get; set; } = 1;
}