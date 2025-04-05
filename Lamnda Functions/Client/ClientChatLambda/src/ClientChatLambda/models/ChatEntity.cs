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
    public List<string> products_ids { get; set; } = new List<string>();
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }
    public List<MessageEntity> primary_messages { get; set; } = new List<MessageEntity>();
}