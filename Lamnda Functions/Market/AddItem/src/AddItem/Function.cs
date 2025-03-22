using Amazon.Lambda.Core;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using OpenAI.Chat;
using OpenAI;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AddItem
{
    public class Function
    {
        private readonly string CHAT_GPT_3 = "gpt-3.5-turbo";
        private readonly string CHAT_GPT_4 = "gpt-4-turbo";
        private readonly string OPENAI_API_KEY = Environment.GetEnvironmentVariable("OPENAI_API_KEY");

        DynamoDBContext _dynamoDb = new DynamoDBContext(new AmazonDynamoDBClient());
        ChatClient _chatClient;


        /// <summary>
        /// A simple function that takes a string and does a ToUpper
        /// </summary>
        /// <param name="input">The event for the Lambda function handler to process.</param>
        /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
        /// <returns></returns>
        public async Task<string> FunctionHandler(PostItemRequest item, ILambdaContext context)
        {
            DotNetEnv.Env.Load();

            _chatClient = new (CHAT_GPT_3 ,OPENAI_API_KEY);

            List<ChatMessage> messages = new List<ChatMessage>()
                {
                    new SystemChatMessage("i want you to describe the product better\nwrite only the new description and nothing else\n Product:\nName: "+item.name+"\nDescription: "+item.description)
                };

            // Set the completion options for the chat
            var options = new ChatCompletionOptions();
            options.MaxOutputTokenCount = 30;

            ChatCompletion response = await _chatClient.CompleteChatAsync(messages, options);



            return "Hello";
        }
    }
}
