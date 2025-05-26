namespace ClientChatLambda.models.Requests;

public class RecieveMessageRequest
{
    public string chat_id { get; set; }
    public string client_id { get; set; }
    public string message { get; set; }
}