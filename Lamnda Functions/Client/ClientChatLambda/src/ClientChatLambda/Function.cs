using System.Net.Http.Json;
using System.Text.Json;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.Core;
using Amazon.S3;
using Amazon.S3.Model;
using ClientChatLambda.AIAgents;
using ClientChatLambda.models;
using ClientChatLambda.Repositories;
using Amazon.Lambda.APIGatewayEvents;
using ClientChatLambda.Exeptions;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace ClientChatLambda;

public class Function
{
    private readonly string CHAT_GPT_3 = "gpt-3.5-turbo";
    private readonly string CHAT_GPT_4 = "gpt-4o-mini";
    private readonly string OPENAI_API_KEY = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
    
    private readonly Dictionary<string, string> _headers = new Dictionary<string, string>
    {
        { "Content-Type", "application/json" },
        { "Access-Control-Allow-Origin", "*" },     // or "http://localhost:3000"  
        { "Access-Control-Allow-Methods", "GET,OPTIONS,POST" },
        { "Access-Control-Allow-Headers", "Content-Type,X-Amz-Date,Authorization" }
        
    };


    private IAIAgent _aiAgent;
    private IChatRepository _chatRepository;
    private IAmazonS3 _s3Client;
    
    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="request">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request_proxy, ILambdaContext context)
    {
        _chatRepository = new DynamoChatRepository();
        
        _chatRepository.Logger = context.Logger;
        
        context.Logger.LogLine($"Received request: {JsonSerializer.Serialize(request_proxy)}");

        var request = JsonSerializer.Deserialize<PostMessageRequest>(request_proxy.Body);
        
        context.Logger.LogInformation(JsonSerializer.Serialize(request));

        if (!ValidateRequest(request).isValid)
        {
            context.Logger.LogError($"Invalid request: {ValidateRequest(request).error}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 400,
                Body = JsonSerializer.Serialize(new {error = ValidateRequest(request).error}),
                Headers = _headers
            };
        }

        try
        {
            if (request.create_chat)
            {
                var chat = await _chatRepository.CreateChat(request.client_id);
                context.Logger.LogInformation($"Chat {chat.ChatId} created");
                return new APIGatewayProxyResponse
                {
                    StatusCode = 200,
                    Body = JsonSerializer.Serialize(new { chat_id = chat.ChatId }),
                    Headers = _headers
                };
            }
            
            SetAIAgent(context);
            await LoadPrompt(context);
            
            var response =  await ExistChatHandler(request, context);

            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = JsonSerializer.Serialize(response),
                Headers = _headers
            };
        }
        catch (KeyNotFoundException e)
        {
            context.Logger.LogError($"Chat with id {request.chat_id} and clinet {request.client_id} not found");
            return new APIGatewayProxyResponse
            {
                StatusCode = 404,
                Body = JsonSerializer.Serialize(new
                    { error = $"Chat with id {request.chat_id} and clinet {request.client_id} not found" }),
                Headers = _headers
            };
        }
        catch (Exception e)
        {
            context.Logger.LogError($"Error: {e.Message}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = JsonSerializer.Serialize(new { error = e.Message }),
                Headers = _headers
            };
        }
    }

    private async Task LoadPrompt(ILambdaContext context)
    {
        _aiAgent.Prompt = Prompts.DEFAULT_PROMPT;
    }

    private void SetAIAgent(ILambdaContext context)
    {
        _aiAgent = new OpenAIAgent(CHAT_GPT_4, OPENAI_API_KEY);
        _aiAgent.MaxTokens = 1000;
        _aiAgent.LastMessageTokenCount = 3;
        _aiAgent.PrimaryMessageTokenCount = 3;
        _aiAgent.Logger = context.Logger;
    }

    private async Task<MessageResponse> ExistChatHandler(PostMessageRequest request, ILambdaContext context)
    {
        Message response = null;
        var chat = await _chatRepository.GetChat(request.client_id ,request.chat_id);
        
        var message = new Message();
        message.SenderRole = MessageSenderRole.Client;
        message.Content = request.message;
        message.SentAt = DateTime.Now;
            
        context.Logger.LogInformation($"Message {request.message} added to chat {request.chat_id}");

        _aiAgent.Chat = chat;
        
        context.Logger.LogInformation("Sending message to AI agent");
        try
        {
            response = await _aiAgent.SendMessage(message);
        }
        catch (StoresNotFoundException e)
        {
            response = new Message
            {
                SenderRole = MessageSenderRole.Assistant,
                Content = e.Message,
                SentAt = DateTime.Now
            };
        }
        catch (Exception e)
        {
            context.Logger.LogError($"Error sending message to AI agent: {e.Message}");
            throw;
        }
        
        chat.AddMessage(response);
        context.Logger.LogInformation($"AI response: {response.Content}");
        context.Logger.LogInformation("Saving chat");
        
        await _chatRepository.UpdateChat(chat);
        
        context.Logger.LogInformation("Chat updated successfully");
        
        string? store_id = chat.OrderProducts.Count > 0 ? chat.OrderProducts[0].Store_id : null;
        
        context.Logger.LogInformation($"Store ID: {store_id}");

        return new MessageResponse
        {
            Message = response.Content,
            Products = JsonSerializer.Serialize(chat.OrderProducts),
            Store_id = store_id
        };
    }

    private (string error, bool isValid) ValidateRequest(PostMessageRequest request)
    {
        if(request.create_chat && !string.IsNullOrEmpty(request.client_id))
        {
            return (null, true);
        }
        
        if (string.IsNullOrEmpty(request.chat_id))
        {
            return ("chat_id is required", false);
        }
        
        if (string.IsNullOrEmpty(request.client_id))
        {
            return ("client_id is required", false);
        }
        
        if (string.IsNullOrEmpty(request.message))
        {
            return ("message is required", false);
        }

        return (null, true);
    }
}