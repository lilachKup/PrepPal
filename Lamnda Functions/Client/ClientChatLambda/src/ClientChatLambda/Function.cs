using Amazon.Lambda.Core;
using ClientChatLambda.models;
using OpenAI;
using OpenAI.Chat;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace ClientChatLambda;

public class Function
{
    private readonly string CHAT_GPT_3 = "gpt-3.5-turbo";
    private readonly string CHAT_GPT_4 = "gpt-4-turbo";
    private readonly string OPENAI_API_KEY = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
    private ChatClient _client;
    
    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="request">The event for the Lambda function handler to process.</param>
    /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
    /// <returns></returns>
    public string FunctionHandler(PostMessageRequest request, ILambdaContext context)
    {
        _client = new ChatClient(CHAT_GPT_3,OPENAI_API_KEY);
        
        
        return "request.ToUpper();";
    }
}