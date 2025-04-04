using MarketProductService.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using OpenAI;
using OpenAI.Chat;
using System.Text.Json;

namespace MarketProductService.Repositories
{
    public class MockProductRepository : IProductRepository
    {
        private readonly string CHAT_GPT_3 = "gpt-3.5-turbo";
        private readonly string CHAT_GPT_4 = "gpt-4-turbo";
        private readonly string OPENAI_API_KEY = Environment.GetEnvironmentVariable("OPENAI_API_KEY");

        private readonly List<Product> _products;

        private int _nextId = 5;


        public MockProductRepository() 
        {
            _products = new List<Product>()
            {
                new Product() { Id = 1, Name = "Apple", Description = "A fruit that is red and sweet and is good for health", Tags = new List<string> { "food", "fruit", "red", "sweet", "health", "vitamins", "fiber", "natural" } },
                new Product() { Id = 2, Name = "Banana", Description = "A fruit that is yellow and is good for health ", Tags = new List<string> { "food", "fruit", "yellow", "health", "vitamins", "fiber", "natural" } },
                new Product() { Id = 3, Name = "Coca-Cola", Description = "A soda that is sweet", Tags = new List<string> { "drink", "soda", "sweet", "black" } },
                new Product() { Id = 4, Name = "Chocolate", Description = "A sweet food that is made from cacao beans", Tags = new List<string> { "food", "sweet", "cacao", "beans", "chocolate", "brown" } }
            };

            _nextId = _products.Count + 1;
        }


        public async Task<Product> CreateProduct(int market_id, PostProduct product)
        {
            Product newProduct = new Product()
            {
                Id = _nextId++,
                Name = product.Name,
            };
            ChatClient client = new(CHAT_GPT_3, OPENAI_API_KEY);

            List<ChatMessage> messages = new List<ChatMessage>()
                {
                    new SystemChatMessage("i want you to describe the product better\nwrite only the new description and nothing else\n Product:\nName: "+product.Name+"\nDescription: "+product.Description)
                };

            // Set the completion options for the chat
            var options = new ChatCompletionOptions();
            options.MaxOutputTokenCount = 30;

            ChatCompletion response = await client.CompleteChatAsync(messages, options);

            var chatMessage = new AssistantChatMessage(response);
            newProduct.Description = chatMessage.Content[0].Text;
            messages.Add(new AssistantChatMessage(response));

            Console.WriteLine($"Name: {newProduct.Name}\nDescription: {newProduct.Description}");

            messages.Add(new SystemChatMessage("i want you to add tags to the product\nwrite only the new tags and nothing else in the format: tag1,tag2,tag3 \n Product:\nName: "+ newProduct.Name+"\nDescription: "+ newProduct.Description));

            response = await client.CompleteChatAsync(messages, options);

            chatMessage = new AssistantChatMessage(response);
            var tags = chatMessage.Content[0].Text.Split(",").ToList();
            newProduct.Tags = tags;
            newProduct.Markets_Id.Add(market_id);

            Console.WriteLine($"Name: {newProduct.Name}\nTags: {chatMessage.Content[0].Text}");

            _products.Add(newProduct);

            return newProduct;
        }

        public async Task<Product> FindProduct(int id)
        {
            return _products.FirstOrDefault(p => p.Id == id);
        }

        public async Task<List<Product>> FindProductsByTags(IEnumerable<string> tags)
        {
            var lst = from prod in _products 
                      where prod.Tags.Any(tag => tags.Contains(tag))
                      select prod;

            return lst.ToList();
        }

        public async Task<List<Product>> FindProductsByText(string text)
        {
            var tags = await getTagsFromText(text);

            Console.Write("Tags: ");

            foreach (var tag in tags)
            {
                Console.Write(tag+", ");
            }

            Console.Write("\n");

            var products_list = await FindProductsByTags(tags);

            Console.WriteLine(JsonSerializer.Serialize(products_list));

            return (await findBestMatchByText(text, products_list)).ToList();
        }

        private async Task<IEnumerable<string>> getTagsFromText(string text)
        {
            ChatClient chatClient = new(CHAT_GPT_3, OPENAI_API_KEY);

            List<ChatMessage> messages = new List<ChatMessage>()
            {
                new SystemChatMessage("i want you to write me tags about a product that i look for so i can find it by tags on my database\n" +
                "the tags write me in the format: tag1,tag2,tag3\nthe text that you use is: "+ text),
            };

            // Set the completion options for the chat
            var options = new ChatCompletionOptions();
            options.MaxOutputTokenCount = 30;

            ChatCompletion response = await chatClient.CompleteChatAsync(messages, options);

            var chatMessage = new AssistantChatMessage(response);

             return chatMessage.Content[0].Text.Split(",");
        }

        private async Task<IEnumerable<Product>> findBestMatchByText(string text, IEnumerable<Product> products)
        {
            var messages = new List<ChatMessage>()
            {
                //this is the system prompt to explain the task to the model
                new SystemChatMessage($"i want you to find the best match from the following products for the user from the products that i send you\n" +
                $"you need to write back only the id of the product and nothing else\n"+
                $"if you cant find any product that match return response the number -1\n"+
                $"your response should be an int\n"+
                $"product: {JsonSerializer.Serialize(products)}"),

                //this is the user prompt to explain the task to the model
                new UserChatMessage(text),
            };

            ChatClient chatClient = new(CHAT_GPT_3, OPENAI_API_KEY);
            ChatCompletionOptions options = new ChatCompletionOptions();
            options.MaxOutputTokenCount = 10;
            var response = await chatClient.CompleteChatAsync(messages, options);

            var chatMessage = new AssistantChatMessage(response);

            Console.WriteLine("Assistant: " + chatMessage.Content[0].Text);

            int id = int.Parse(chatMessage.Content[0].Text);

            return products.Where(p => p.Id == id).ToList();
        }
    }
}
