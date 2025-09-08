namespace ClientChatLambda.models;

public class MessageEntity
{
    public MessageSenderRole sender_role { get; set; }
    public string content { get; set; }
    public DateTime sent_at { get; set; }
    
    public int entity_version { get; set; } = 1;

    public static MessageEntity FromMessage(Message message)
    {
        return new MessageEntity
        {
            sender_role = message.SenderRole ?? MessageSenderRole.System,
            content = message.Content,
            sent_at = message.SentAt ?? DateTime.Now,
            entity_version = message.Version
        };
    }
}