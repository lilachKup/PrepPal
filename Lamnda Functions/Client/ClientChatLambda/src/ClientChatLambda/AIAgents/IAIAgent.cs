using ClientChatLambda.models;

namespace ClientChatLambda.AIAgents;

public interface IAIAgent
{
    Chat Chat { get; set; }
    int LastMessageTokenCount { get; set; }
    int PrimaryMessageTokenCount { get; set; }
    int MaxTokens { get; set; }
    string Model { get; set; }
    string Prompt { get; set; }
    Task<Message> SendMessage(Message message);
    
}