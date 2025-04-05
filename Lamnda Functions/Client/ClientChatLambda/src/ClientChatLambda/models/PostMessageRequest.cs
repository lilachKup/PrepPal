namespace ClientChatLambda.models;

public class PostMessageRequest
{
    public string chat_id { get; set; }
    public string client_id { get; set; }
    public string message { get; set; }
}