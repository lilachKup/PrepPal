using ClientChatLambda.models;
using OpenAI.Chat;

namespace ClientChatLambda.AIAgents;

public class OpenAIAgent :IAIAgent
{
    private readonly string _model;
    private readonly string _apiKey;
    
    private ChatClient _chatClient;
    
    public Chat Chat { get; set; }
    public int LastMessageTokenCount { get; set; }
    public int PrimaryMessageTokenCount { get; set; }
    public int MaxTokens { get; set; }
    public string Model { get; set; }
    public string Prompt { get; set; }

    public OpenAIAgent(string model, string apiKey)
    {
        Model = model;
        _apiKey = apiKey;
        _chatClient = new ChatClient(model , _apiKey);
    }
    
    public async Task<Message> SendMessage(Message message)
    {
        var messages = new List<ChatMessage>();
        messages.Add(new SystemChatMessage(Prompt));
        
        messages.AddRange(getPrimaryMessages());
        messages.AddRange(getChatHistory());
        
        messages.Add(new UserChatMessage(message.Content));

        var chatResponse = await _chatClient.CompleteChatAsync(messages);

        var assistantMessage = new Message()
        {
            Content = chatResponse.Value.Content[0].Text,
            SenderRole = MessageSenderRole.Assistant,
            SentAt = DateTime.Now
        };
        
        Chat.AddMessage(assistantMessage);

        return assistantMessage;
    }
    
    private List<ChatMessage> getPrimaryMessages()
    {
        var messages = new List<ChatMessage>();
        
        messages.Add(new SystemChatMessage(
            "In the next system messages you will find the last primary messages of the conversation. " +
            "this is context to the conversation."));

        var lastPrimaryMessages = Chat.PrimaryMessages.SkipLast(PrimaryMessageTokenCount);

        messages.AddRange(
            from message in lastPrimaryMessages
            let chatMessage = MessageToChatMessage(message)
            where chatMessage != null
            select chatMessage
        );
        
        return messages;
    }

    private List<ChatMessage> getChatHistory()
    {
        var messages = new List<ChatMessage>();
        messages.Add(new SystemChatMessage(
            "In the next system messages you will find the last messages of the conversation. " +
            "this is context to the conversation."));
        
        var lastMessages = Chat.Messages.SkipLast(LastMessageTokenCount);

        messages.AddRange(
            from message in lastMessages
            let chatMessage = MessageToChatMessage(message)
            where chatMessage != null
            select chatMessage
        );

        return messages;
    }

    private ChatMessage? MessageToChatMessage(Message message)
    {
        switch (message.SenderRole)
        {
            case MessageSenderRole.Client:
                return new UserChatMessage(message.Content);
            
            case MessageSenderRole.Assistant:
                return new AssistantChatMessage(message.Content);
        }

        return null;
    }
}