using System.Collections.Immutable;
using System.ComponentModel.DataAnnotations;

namespace ClientChatLambda.models;

public class Message
{
    private MessageSenderRole? _sender_role = null;
    private string _content = null;
    private DateTime? _createdAt = null;
    public MessageSenderRole? SenderRole
    {
        get { return _sender_role; }
        set {setImutable(_sender_role, value);}
    }
    public string? Content 
    {
        get { return _content; }
        set {setImutable(_content, value);}
    }
    public DateTime? SentAt 
    {
        get { return _createdAt; }
        set {setImutable(_createdAt, value);}
    }

    public Message()
    {
        
    }

    public Message(MessageEntity messageEntity)
    {
        SenderRole = messageEntity.sender_role;
        Content = messageEntity.content;
        SentAt = messageEntity.sent_at;
    }
    
    private void setImutable<T>(T? oldValue,T newValue)
    {
        if (oldValue != null)
        {
            throw new ValidationException("Value cannot be null.");
        }

        oldValue = newValue;
    }
}