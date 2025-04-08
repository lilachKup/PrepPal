using System.Net.Http.Json;
using System.Text.Json;
using ClientChatLambda.models;
using OpenAI.Assistants;
using OpenAI.Chat;

#pragma warning disable OPENAI001
namespace ClientChatLambda.AIAgents;

public class OpenAIAgent :IAIAgent
{
    private readonly string _model;
    private readonly string _apiKey;
    
    private ChatClient _chatClient;
    private HttpClient _repositoryClient;
    
    public Chat Chat { get; set; }
    public int LastMessageTokenCount { get; set; }
    public int PrimaryMessageTokenCount { get; set; }
    public int MaxTokens { get; set; }
    public string Model { get; set; }
    public string Prompt { get; set; }

    
    private readonly List<FunctionToolDefinition> _functions = new()
    {
        new FunctionToolDefinition("get_product")
        {
            Description = "Get product information",
            Parameters = new BinaryData(
                new
                {
                    type = "object",
                    properties = new
                    {
                        id = new
                        {
                            type = "string",
                            description = "The product id"
                        },
                        name = new
                        {
                            type = "string",
                            description = "The product name"
                        },
                        category = new
                        {
                            type = "string",
                            description = "The product category"
                        },
                        tag = new
                        {
                            type = "string",
                            description = "The product tag"
                        },
                        brand = new
                        {
                            type = "string",
                            description = "The product brand"
                        },
                        price = new
                        {
                            type = "string",
                            description = "The product price"
                        },
                    }
                })
        }
    };

    public OpenAIAgent(string model, string apiKey)
    {
        Model = model;
        _apiKey = apiKey;
        _chatClient = new ChatClient(model , _apiKey);
        _repositoryClient = new HttpClient();
        _repositoryClient.BaseAddress = new Uri("https://ztbpw4dzb7.execute-api.us-east-1.amazonaws.com/prod/products/filterProductsByTags");
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

    private async Task<SystemChatMessage> searchProductsByTags(string[] tags)
    {
        var response = await _repositoryClient.PostAsJsonAsync("", new
        {
            tags = string.Join(',', tags),
            store_ids = new[] { 1, 4, 3 }
        });

        List<Product> products = await response.Content.ReadFromJsonAsync<List<Product>>();

        return new SystemChatMessage(
            $"The following products were found: [" +
            $"{string.Join(',', products.Select(p => JsonSerializer.Serialize(p)))} " +
            $"]");
    }

    private async Task vaddProductToOrder(string[] productIds)
    {
        
    }
    
    
}