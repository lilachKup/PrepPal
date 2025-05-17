namespace ClientChatLambda.models;

public class MessageEntity
{
    public MessageSenderRole sender_role { get; set; }
    public string content { get; set; }
    public DateTime sent_at { get; set; }
    public int entity_version { get; set; } = 1;
}

public enum MessageSenderRole
{
    NotInitilized = 0,
    Client,
    Assistant,
    System,
    Tool,
}