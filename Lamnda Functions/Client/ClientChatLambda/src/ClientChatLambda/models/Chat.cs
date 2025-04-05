using System.Collections.Immutable;

namespace ClientChatLambda.models;

public class Chat
{
    private List<string> _products_ids;
    private List<Message> _messages;
    private List<Message> _primary_messages;
    
    public string ChatId { get; }
    public string ClientId { get; }
    public IEnumerable<Message> Messages => _messages?.ToImmutableList() ?? ImmutableList<Message>.Empty;
    public IEnumerable<Message> PrimaryMessages => _primary_messages?.ToImmutableList() ?? ImmutableList<Message>.Empty;
    
    public List<string> ProductsIds => _products_ids;
    public DateTime CreatedAt { get; }
    public DateTime UpdatedAt { get; private set; }

    public Chat(string client_id)
    {
        ChatId = Guid.NewGuid().ToString();
        ClientId = client_id;
        _products_ids = new List<string>();
        _messages = new List<Message>();
        CreatedAt = DateTime.Now;
        UpdatedAt = DateTime.Now;
    }

    public Chat(ChatEntity chatEntity)
    {
        ChatId = chatEntity.chat_id;
        ClientId = chatEntity.client_id;
        _products_ids = chatEntity.products_ids;
        _messages = (from message in chatEntity.messages select new Message(message)).ToList();
        _primary_messages = (from message in chatEntity.primary_messages select new Message(message)).ToList();
        CreatedAt = chatEntity.created_at;
        UpdatedAt = chatEntity.updated_at;
    }

    public void AddMessage(Message message)
    {
        _messages.Add(message);
        UpdatedAt = message.SentAt?? DateTime.Now;
    }

    public void AddMessages(IEnumerable<Message> messages)
    {
        _messages.AddRange(messages);
    }
    
    public void AddPrimaryMessage(Message message)
    {
        _primary_messages.Add(message);
    }
}