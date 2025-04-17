namespace ClientChatLambda.models;

public class MessageEntity
{
    public MessageSenderRole sender_role { get; set; }
    public string content { get; set; }
    public DateTime sent_at { get; set; }
}