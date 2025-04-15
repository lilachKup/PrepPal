using Amazon.Lambda.Core;
using ClientChatLambda.models;

namespace ClientChatLambda.AIAgents;

public interface IAIAgent
{
    ILambdaLogger? Logger { get; set; }
    Chat Chat { get; set; }
    int LastMessageTokenCount { get; set; }
    int PrimaryMessageTokenCount { get; set; }
    int MaxTokens { get; set; }
    string Model { get; set; }
    string Prompt { get; set; }
    Task<Message> SendMessage(Message message);
    
}