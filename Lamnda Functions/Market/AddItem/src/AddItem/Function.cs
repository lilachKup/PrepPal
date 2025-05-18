using Amazon.Lambda.Core;
using OpenAI.Chat;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AddItem
{
    public class Function
    {
        private readonly string CHAT_GPT_3 = "gpt-3.5-turbo";
        private readonly string CHAT_GPT_4 = "gpt-4o-mini";
        private string OPENAI_API_KEY;
        
        private ChatClient _chatClient;
        
        private IRepository _repository;


        /// <summary>
        /// A simple function that takes a string and does a ToUpper
        /// </summary>
        /// <param name="input">The event for the Lambda function handler to process.</param>
        /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
        /// <returns></returns>
        public async Task<ProductResponse> FunctionHandler(PostProductRequest product, ILambdaContext context)
        {
            _repository = new MainDbRepository(context.Logger);

            DotNetEnv.Env.Load();
            OPENAI_API_KEY = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
            
            var tags = await getItemTags(product);

            context.Logger.LogLine($"tags: {string.Join(", ", tags)}");

            var newProduct = await _repository.CreateProduct(product, tags);

            return newProduct;
        }
        
        private async Task<List<string>> getItemTags(PostProductRequest postProduct)
        {
            _chatClient = new ChatClient(CHAT_GPT_3, OPENAI_API_KEY);

            var prompt = $"Create a list of tags for the item i will send to you in this message.\n"+ 
                $"your response have to be only the tags in this format: tag1, tag2, tag3.\n" +
                $"i want 6 tags that describe best the item so when i need to find it i can do it by the tags.\n" + 
                $"Item:\n" + $"name:{postProduct.name},\n" + $"description: {postProduct.description},\n" +$"category: {postProduct.category}";

            ChatCompletionOptions options = new ChatCompletionOptions();
            options.MaxOutputTokenCount = 20;

            List<ChatMessage> messages = new List<ChatMessage>()
            {
                new SystemChatMessage(prompt),
            };

            var response = await _chatClient.CompleteChatAsync(messages, options);

            var chatMessage = new AssistantChatMessage(response);
            var tags = chatMessage.Content[0].Text.Split(",").ToList();
            
            

            return tags;
        }
        
    }
}
