using ClientChatLambda;
using ClientChatLambda.models;
using OpenAI.Chat;

namespace ClientChatAPI.Utils;

public static class Adapters
{
    public static ChatMessage ToChatMessage(this Message message)
    {
        ChatMessage chatMessage;
        string content = message.Content;

        switch (message.SenderRole)
        {
            case MessageSenderRole.Client:
                chatMessage = new UserChatMessage(content);
                break;
            case MessageSenderRole.Assistant:
                chatMessage = new UserChatMessage(content);
                break;
            case MessageSenderRole.System:
                chatMessage = new SystemChatMessage(content);
                break;
            case MessageSenderRole.Tool:
                var id  = content.Split('#')[0];
                var msg = content.Split('#')[1];
                chatMessage = new ToolChatMessage(id, msg);
                break;
            
            default:
                throw new ArgumentOutOfRangeException(nameof(message.SenderRole), message.SenderRole, null);
            
        }

        return chatMessage;
    }
}