using System.Net.Http.Json;
using System.Text.Json;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.Core;
using Amazon.S3;
using Amazon.S3.Model;
using ClientChatLambda.AIAgents;
using ClientChatLambda.models;
using ClientChatLambda.Repositories;
using OpenAI.Chat;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace ClientChatLambda;

public class Function
{
    private readonly string CHAT_GPT_3 = "gpt-3.5-turbo";
    private readonly string CHAT_GPT_4 = "gpt-4o-mini";
    private readonly string OPENAI_API_KEY = Environment.GetEnvironmentVariable("OPENAI_API_KEY");


    private IAIAgent _aiAgent;
    private IChatRepository _chatRepository;
    private IAmazonS3 _s3Client;
    
    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="request">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public async Task<Object> FunctionHandler(PostMessageRequest request, ILambdaContext context)
    {
        _chatRepository = new DynamoChatRepository();
        
        _chatRepository.Logger = context.Logger;

        if (!ValidateRequest(request).isValid)
        {
            context.Logger.LogError($"Invalid request: {ValidateRequest(request).error}");
            return new { error = ValidateRequest(request).error };
        }

        try
        {
            if (request.create_chat)
            {
                var chat = await _chatRepository.CreateChat(request.client_id);
                context.Logger.LogInformation($"Chat {chat.ChatId} created");
                return new { chat_id = chat.ChatId };
            }
            
            SetAIAgent(context);
            await LoadPrompt(context);
            
            return await ExistChatHandler(request, context);
        }
        catch (KeyNotFoundException e)
        {
            context.Logger.LogError($"Chat with id {request.chat_id} and clinet {request.client_id} not found");
            return new { error = $"Chat with id {request.chat_id} and clinet {request.client_id} not found" };
        }
        catch (Exception e)
        {
            context.Logger.LogError($"Error: {e.Message}");
            return new { error = e.Message };
        }
    }

    private async Task LoadPrompt(ILambdaContext context)
    {
        // if (Environment.GetEnvironmentVariable("USE_S3") == "true")
        // {
        //     // Create a GetObject request
        //     var request = new GetObjectRequest
        //     {
        //         BucketName = Environment.GetEnvironmentVariable("AWS_S3_BUCKET_NAME"),
        //         //Key = Environment.GetEnvironmentVariable("AWS_S3_ACCESS_KEY_ID"),
        //     };
        //     using (var response = await _s3Client.GetObjectAsync(request))
        //     {
        //         using (var responseStream = response.ResponseStream)
        //         {
        //             using (var reader = new StreamReader(responseStream))
        //             {
        //                 var prompt = await reader.ReadToEndAsync();
        //                 _aiAgent.Prompt = prompt;
        //                 context.Logger.LogLine(prompt);
        //             }
        //         }
        //     }
        // }
        // else
        // {
        //     using (var promptStream = File.OpenRead("ClientChatMainPrompt.txt"))
        //     {
        //         byte[] buffer = new byte[promptStream.Length];
        //         promptStream.Read(buffer);
        //
        //         _aiAgent.Prompt = buffer.Length > 0 ? System.Text.Encoding.UTF8.GetString(buffer) : string.Empty;
        //         context.Logger.LogLine(_aiAgent.Prompt);
        //     }
        // }

        _aiAgent.Prompt = Prompts.DEFAULT_PROMPT;
    }

    private void SetAIAgent(ILambdaContext context)
    {
        _aiAgent = new OpenAIAgent(CHAT_GPT_4, OPENAI_API_KEY);
        _aiAgent.MaxTokens = 150;
        _aiAgent.LastMessageTokenCount = 3;
        _aiAgent.PrimaryMessageTokenCount = 3;
        _aiAgent.Logger = context.Logger;
    }

    private async Task<object> ExistChatHandler(PostMessageRequest request, ILambdaContext context)
    {
        var chat = await _chatRepository.GetChat(request.client_id ,request.chat_id);
        
        var message = new Message();
        message.SenderRole = MessageSenderRole.Client;
        message.Content = request.message;
        message.SentAt = DateTime.Now;
            
        context.Logger.LogInformation($"Message {request.message} added to chat {request.chat_id}");

        _aiAgent.Chat = chat;
        
        var response = await _aiAgent.SendMessage(message);
        
        await _chatRepository.UpdateChat(chat);

        return new { message = response.Content, products = JsonSerializer.Serialize(chat.OrderProducts) };
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