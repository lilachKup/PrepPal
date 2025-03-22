using Amazon.Lambda.Core;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using OpenAI.Chat;
using Amazon.DynamoDBv2.DocumentModel;
using System.Text.Json;
using Amazon.DynamoDBv2.Model;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AddItem
{
    public class Function
    {
        private readonly string CHAT_GPT_3 = "gpt-3.5-turbo";
        private readonly string CHAT_GPT_4 = "gpt-4-turbo";
        private string OPENAI_API_KEY;

        AmazonDynamoDBClient _dynamoClient = new AmazonDynamoDBClient();
        DynamoDBContext _dynamoDb;
        ChatClient _chatClient;


        /// <summary>
        /// A simple function that takes a string and does a ToUpper
        /// </summary>
        /// <param name="input">The event for the Lambda function handler to process.</param>
        /// <param name="context">The ILambdaContext that provides methods for logging and describing the Lambda environment.</param>
        /// <returns></returns>
        public async Task<string> FunctionHandler(PostItemRequest item, ILambdaContext context)
        {
            _dynamoDb = new DynamoDBContext(_dynamoClient);

            DotNetEnv.Env.Load();
            OPENAI_API_KEY = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
            context.Logger.LogLine("Key: "+ OPENAI_API_KEY);

            var (oldItem, alreadyExists) = await fetchFromDBByName(item.name, context);

            if(alreadyExists)
            {
                return JsonSerializer.Serialize(oldItem);
            }

            var newItem = await createNewItem(item, context);

            await _dynamoDb.SaveAsync(newItem);

            return JsonSerializer.Serialize(newItem);
        }

        private async Task<(GenaralItem item, bool alreadyExists)>  fetchFromDBByName(string name,ILambdaContext context)
        {
            var oldItem = await _dynamoDb.ScanAsync<GenaralItem>(new List<ScanCondition>()
            {
                new ScanCondition("name", ScanOperator.Equal, name)
            }).GetRemainingAsync();

            context.Logger.LogLine($"Found {oldItem.Count} items with the name {name}");

            if (oldItem.Count > 0)
            {
                return (oldItem[0], true);
            }

            return (null, false);
        }

        private async Task<GenaralItem> createNewItem(PostItemRequest item, ILambdaContext context)
        {
            var newItem = new GenaralItem()
            {
                item_id = await GetNextCounterValueAsync("Items_Genaral"),
                tags = await getItemTags(item),

                name = item.name,
                description = item.description,
                category = item.category,
                markets_ids =new List<int> { item.market_id }
            };

            context.Logger.LogLine($"Saving new item: {JsonSerializer.Serialize(newItem)}");

            await _dynamoDb.SaveAsync(newItem);

            return newItem;
        }

        private async Task<List<string>> getItemTags(PostItemRequest postItem)
        {
            _chatClient = new ChatClient(CHAT_GPT_3, OPENAI_API_KEY);

            var prompt = $"Create a list of tags for the item i will send to you in this message.\n"+ 
                $"your response have to be only the tags in this format: tag1, tag2, tag3.\n" +
                $"i want 6 tags that describe best the item so when i need to find it i can do it by the tags.\n" + 
                $"Item:\n" + $"name:{postItem.name},\n" + $"description: {postItem.description},\n" +$"category: {postItem.category}";

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

        public async Task<int> GetNextCounterValueAsync(string counterName)
        {
            const string COUNTER_TABLE = "Counters";

            var request = new UpdateItemRequest
            {
                TableName = COUNTER_TABLE,
                Key = new Dictionary<string, AttributeValue>
            {
                { "name", new AttributeValue { S = counterName } }
            },
                ExpressionAttributeNames = new Dictionary<string, string>
            {
                { "#val", "CurrentValue" }
            },
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":incr", new AttributeValue { N = "1" } }
            },
                // The ADD action increments the numeric attribute by the given value
                UpdateExpression = "ADD #val :incr",
                ReturnValues = ReturnValue.UPDATED_NEW
            };

            var response = await _dynamoClient.UpdateItemAsync(request);

            // The response.Attributes will contain the updated attributes
            if (response.Attributes.TryGetValue("CurrentValue", out var updatedValue))
            {
                return int.Parse(updatedValue.N);
            }

            throw new System.Exception("Could not retrieve the updated counter value.");
        }
    }
}
