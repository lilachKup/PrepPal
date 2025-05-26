using System.Runtime.InteropServices.ComTypes;
using Amazon.Lambda.Core;
using ClientChatAPI.Utils;
using ClientChatLambda;
using ClientChatLambda.models;
using OpenAI.Chat;

namespace ClientChatAPI.AIAgents;


public class ManagerOpenAIAgent : OpenAIAgentBase, IAIAgent<(Chat chat, string message), string>
{
    private const int CONTEXT_LENGTH = 4;
    
    public ILambdaLogger? Logger { get; set; }
    public  IAIAgent<List<Message>, Product> _searchAgent { get; set; }

    private Chat _chat;
    private List<Product> _searchResults = new List<Product>();

    private static readonly ChatTool SearchTool = ChatTool.CreateFunctionTool(
        functionName: "search_products",
        functionDescription: "Search for products based on the user's query.");

    
    public ManagerOpenAIAgent(OpenAIAgentModels.Model model, ILambdaLogger? logger = null) : base(model)
    {
        Logger = logger;
    }
    
    public async Task<string> ProcessAsync((Chat chat, string message) input)
    {
        _chat = input.chat ?? throw new ArgumentNullException(nameof(input.chat), "Chat cannot be null.");
        if (string.IsNullOrEmpty(input.message))
        {
            throw new ArgumentException("Message cannot be null or empty.", nameof(input.message));
        }
        Logger?.LogInformation($"Processing chat with id {_chat.ChatId} and message: {input.message}");

        var messages = _chat.Messages.Skip(_chat.Messages.Count() - CONTEXT_LENGTH).ToList();
        messages.Add(new Message{SenderRole = MessageSenderRole.Client, Content = input.message});

        var options = new ChatCompletionOptions();
        options.Temperature = 0.5f;
        options.MaxOutputTokenCount = 128;

        var inputs = messages.Select(m => m.ToChatMessage()).ToList();
        var response = await AskOpenAIAsync<ToolChatMessage>(inputs, options,async(tool) => await onToolCall(tool));

    }

    public async Task<IEnumerable<string>> CollectionProcessAsync((Chat, string) inputs)
    {
        throw new NotImplementedException();
    }
    
    private async Task<ToolChatMessage> onToolCall(ChatToolCall toolCall)
    {
        var result = new ToolChatMessage(toolCall.Id);

        if (toolCall.FunctionName == SearchTool.FunctionName)
        {
            
        }
        
        

        return result;

    }
    
}