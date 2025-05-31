using System.ClientModel;
using System.Net.Http.Json;
using System.Text.Json;
using Amazon.Lambda.Core;
using ClientChatLambda.models;
using OpenAI.Chat;
using ChatToolChoice = OpenAI.Chat.ChatToolChoice;

#pragma warning disable OPENAI001
namespace ClientChatLambda.AIAgents;

public class OpenAIAgent :IAIAgent
{
    private readonly string _model;
    private readonly string _apiKey;
    
    private ChatClient _chatClient;
    private HttpClient _repositoryClient;
    private List<Product> _products_srearch;
    
    public Chat Chat { get; set; }
    public int LastMessageTokenCount { get; set; }
    public int PrimaryMessageTokenCount { get; set; }
    public int MaxTokens { get; set; }
    public string Model { get; set; }
    public string Prompt { get; set; }
    
    public ILambdaLogger? Logger { get; set; }
    
    private static readonly ChatTool search_products_by_tags = ChatTool.CreateFunctionTool(
        functionName: "search_products_by_tags",
        functionDescription: "Search for products related to the user request using a list of relevant tags.",
        functionParameters: BinaryData.FromBytes("""
            {
                "type": "object",
                "properties": {
                    "tags": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "List of tags related to the user's product request."
                    }
                },
                "required": ["tags"]
            }
        """u8.ToArray())
    );

    private static readonly ChatTool add_products_to_order = ChatTool.CreateFunctionTool(
        functionName: "add_products_to_order",
        functionDescription: "Add products to the user's order by specifying product and store IDs and quantities.",
        functionParameters: BinaryData.FromBytes("""
            {
                "type": "object",
                "properties": {
                    "products": {
                        "type": "array",
                        "description": "List of products to add to the order. when P_id is Product_id, S_id is Store_id and Q is Quantity",
                        "items": {
                            "type": "object",
                            "properties": {
                                "P_id": { "type": "string" },
                                "S_id": { "type": "string" },
                                "Q": { "type": "integer" }
                            },
                            "required": ["P_id", "S_id", "Q"]
                        }
                    }
                },
                "required": ["products"]
            }
        """u8.ToArray())
    );

    private static readonly ChatTool mark_message_as_primary = ChatTool.CreateFunctionTool(
        functionName: "mark_message_as_primary",
        functionDescription:
        "Mark a user message as important so it can be stored as a primary message for long-term context.",
        functionParameters: BinaryData.FromBytes("""
                                                     {
                                                         "type": "object",
                                                         "properties": {
                                                             "SenderRole": {
                                                                 "type": "number",
                                                                 "description": "The numeric sender role for the message. (1 = Client, 2 = Assistant, 3 = System, 4 = Tool)"
                                                             },
                                                             "Content": {
                                                                 "type": "string",
                                                                 "description": "The text content of the message to be marked as primary"
                                                             }
                                                         },
                                                         "required": ["SenderRole", "Content"]
                                                     }
                                                 """u8.ToArray())
    );
    
    private static readonly ChatTool update_products_quantity_in_order = ChatTool.CreateFunctionTool(
        functionName: "update_products_quantity_in_order",
        functionDescription: "Update the quantity of products in the user's order.",
        functionParameters: BinaryData.FromBytes("""
            {
                "type": "object",
                "properties": {
                    "products": {
                        "type": "array",
                        "description": "List of products to update in the order.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "Id": { "type": "string" },
                                "StoreId": { "type": "string" },
                                "NewQuantity": { "type": "integer" }
                            },
                            "required": ["Id", "StoreId", "NewQuantity"]
                        }
                    }
                },
                "required": ["products"]
            }
        """u8.ToArray())
    );

    private readonly ChatTool[] _functions =
    {
        search_products_by_tags,
        add_products_to_order,
        mark_message_as_primary,
        update_products_quantity_in_order
    };
    

    public OpenAIAgent(string model, string apiKey)
    {
        Model = model;
        _apiKey = apiKey;
        _chatClient = new ChatClient(model , _apiKey);
        _repositoryClient = new HttpClient();
        _repositoryClient.BaseAddress = new Uri("https://xgpbt0u4ql.execute-api.us-east-1.amazonaws.com/prod/getProductsFromStoreByTags");
    }
    
    public async Task<Message> SendMessage(Message message)
    {
        bool isNeedToReact = false;
        ClientResult<ChatCompletion> chatResponse;
        Chat.AddMessage(message);

        byte functionCallCount = 0;
        var messages = getChatMessages();
        do
        {
            isNeedToReact = false;
            
            messages.Add(getProductsInOrderToChatGpt());
            var options = getOptions();
            chatResponse = await _chatClient.CompleteChatAsync(messages, options);

            if (chatResponse.Value.ToolCalls != null && chatResponse.Value.ToolCalls.Count > 0)
            {
                messages.Add(new AssistantChatMessage(chatResponse));
                foreach (var call in chatResponse.Value.ToolCalls)
                {
                    Logger?.LogInformation($"{call.FunctionName} has called with arguments: {call.FunctionArguments}");
                    var functionResponse = await functionCallHandler(call);
                    //messages.Add(new ToolChatMessage(call.Id, "Functions executed"));
                    messages.Add(functionResponse);
                }
                
                isNeedToReact = true;
            }
            
            functionCallCount++;
            
        } while (isNeedToReact && functionCallCount < 3); // run function calls and limit to 3 times

        if (isNeedToReact)
        {
            throw new Exception("System failed to generate a response, please try again. " +
                                "If the problem persists, try to change prompt.");
        }
        
        var assistantMessage = new Message()
        {
            Content = chatResponse.Value.Content[0].Text,
            SenderRole = MessageSenderRole.Assistant,
            SentAt = DateTime.Now
        };

        Chat.AddMessage(assistantMessage);
        return assistantMessage;
    }

    private List<ChatMessage> getChatMessages()
    {
        var messages = new List<ChatMessage>();
        messages.Add(new SystemChatMessage(Prompt));
        messages.AddRange(getPrimaryMessages());
        messages.AddRange(getChatHistory());
        return messages;
    }

    private ChatCompletionOptions getOptions()
    {
        ChatCompletionOptions options = new ChatCompletionOptions();
        options.MaxOutputTokenCount = MaxTokens;
        options.Temperature = 0.3f;
            
        // Add the function tools to the options use auto to call the function
        options.ToolChoice = ChatToolChoice.CreateAutoChoice();
            
        foreach (var func in _functions)
        {
            options.Tools.Add(func);
        }

        return options;
    }

    private async Task<ChatMessage> functionCallHandler(ChatToolCall chatToolCall)
    {
        var functionCall = chatToolCall;
        var functionName = functionCall.FunctionName;
        var arguments = functionCall.FunctionArguments.ToString();

        var toolMessage = new Message();
        toolMessage.SenderRole = MessageSenderRole.Tool;
        toolMessage.SentAt = DateTime.Now;

        if (functionName == search_products_by_tags.FunctionName)
        {
            var args = JsonSerializer.Deserialize<Dictionary<string, string[]>>(arguments);
            var systemMessage = await searchProductsByTags(args["tags"]);
            toolMessage.Content = functionCall.Id + "#" + systemMessage.Content[0].Text;
        }

        else if (functionName == add_products_to_order.FunctionName)
        {
            var productsDict = JsonSerializer.Deserialize<Dictionary<string,ProductChatGptDto[]>>(arguments);
            await addProductsToOrder(productsDict["products"]);
            toolMessage.Content = functionCall.Id + "#" + "Products added to order";
        }

        else if (functionName == mark_message_as_primary.FunctionName)
        {
            var messageToMark = JsonSerializer.Deserialize<Message>(arguments);
            markMessageAsPrimary(messageToMark);
            toolMessage.Content = functionCall.Id + "#" + "Message marked as primary";
        }

        else if (functionName == update_products_quantity_in_order.FunctionName)
        {
            var args = JsonSerializer.Deserialize<Dictionary<string, List<UpdateProductGPT>>>(arguments);
            updateProductsQuantityInOrder(args["products"]);
            toolMessage.Content = functionCall.Id + "#" + "Products quantity updated";
        }

        else
        {
            throw new Exception($"Unknown function: {functionCall.FunctionName}");
        }

        return MessageToChatMessage(toolMessage);
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
        
        int messageToSkip = Chat.Messages.Count() >= LastMessageTokenCount ? Chat.Messages.Count() -LastMessageTokenCount : 0;
        
        var lastMessages = Chat.Messages.Skip(messageToSkip);
        
        var lastMessagesChatMessages = from message in lastMessages
            let chatMessage = MessageToChatMessage(message)
            where chatMessage != null
            select chatMessage;

        messages.AddRange(lastMessagesChatMessages);

        return messages;
    }

    private ChatMessage getProductsInOrderToChatGpt()
    {
        var products = (from product in Chat.OrderProducts
            select new ProductChatGptDto()
            {
                P_id = product.Id,
                Product_name = product.Name,
                S_id = product.Store_id,
                Q = product.Quantity
            }).ToList();
        
        var message = new SystemChatMessage(
            $"The following products are in the order: [" +
            $"{string.Join(',', products.Select(p => JsonSerializer.Serialize(p)))} " +
            $"]");

        return message;
    }

    private ChatMessage? MessageToChatMessage(Message message)
    {
        switch (message.SenderRole)
        {
            case MessageSenderRole.Client:
                return new UserChatMessage(message.Content);
            
            case MessageSenderRole.Assistant:
                return new AssistantChatMessage(message.Content);
            case MessageSenderRole.System:
                return new SystemChatMessage(message.Content);
            case MessageSenderRole.Tool:
                string callId = message.Content.Split("#")[0];
                string content = message.Content.Split("#")[1];
                return new ToolChatMessage(callId, content);
        }

        return null;
    }

    private async Task<SystemChatMessage> searchProductsByTags(string[] tags)
    {
        Logger?.LogInformation($"Searching products by tags: " +
                               $"{string.Join(',', tags)}");
        bool failed = true;

        List<string> stores = await getStoresByLocation();

        for (int i = 0; i < 3 && failed; ++i)
        {
            try
            {
                var response = await _repositoryClient.PostAsJsonAsync("", new
                {
                    tags = tags,
                    store_ids = stores.ToArray()
                });
                
                Logger?.LogInformation(await response.Content.ReadAsStringAsync());
        
                _products_srearch = await response.Content.ReadFromJsonAsync<List<Product>>();
                Chat.ProductsToSearch.AddRange(_products_srearch);
                
                failed = false;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
            }
        }

        if (failed)
        {
            Logger?.LogError("Failed to search products by tags");
            throw new Exception("Failed to search products by tags");
        }
        
        Logger?.LogInformation($"Products found: " +
                               $"{string.Join(',', _products_srearch.Select(p => JsonSerializer.Serialize(p)))}");

        return new SystemChatMessage(
            $"The following products were found: [" +
            $"{string.Join(',', _products_srearch.Select(p => JsonSerializer.Serialize(p)))} " +
            $"]");
    }

    private async Task<List<string>> getStoresByLocation()
    {
        HttpClient client = new HttpClient();
        client.BaseAddress = new Uri("https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/location/stores");
        string query = $"?coordinates={Chat.Latitude},{Chat.Longitude}&radius=10000";
        
        List<string> stores = new List<string>();
        
        Logger?.LogInformation($"Getting stores by location: {query}");
        
        var response = await client.GetAsync(query);
        
        if (response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            Logger?.LogInformation($"Stores by location response: {content}");
            stores = content.Split(',').ToList();
        }
        else
        {
            Logger?.LogError($"Failed to get stores by location: {response.ReasonPhrase}");
            throw new Exception("Failed to get stores by location");
        }
        
        return stores;
    }

    private async Task addProductsToOrder(ProductChatGptDto[] products)
    {
        Logger?.LogInformation($"Adding products to order: " +
                         $"{string.Join(',', products.Select(p => JsonSerializer.Serialize(p)))}");
        
        _products_srearch = Chat.ProductsToSearch;
        
        var products_to_add = from product in products
            let product_id = product.P_id
            let store_id = product.S_id
            where _products_srearch.Any(p => p.Id == product_id && p.Store_id == store_id)
            select  _products_srearch.First(p => p.Id == product_id && p.Store_id == store_id);

        foreach (var product in products_to_add)
        {
            var quantity = products.First(p => p.P_id == product.Id && p.S_id == product.Store_id)?.Q;
            
            if (quantity == null)
            {
                quantity = 1;
            }
            
            var product_to_add = new Product()
            {
                Id = product.Id,
                Name = product.Name,
                Category = product.Category,
                Tag = product.Tag,
                Brand = product.Brand,
                Price = product.Price,
                Quantity = (int) quantity,
                Store_id = product.Store_id
            };
                
            Chat.OrderProducts.Add(product_to_add);
            
            Logger?.LogInformation($"Product {product.Name} added to order");
        }
        
    }

    private void markMessageAsPrimary(Message message)
    {
        Chat.AddPrimaryMessage(message);
        
        Logger?.LogInformation($"{message.Content} is marked as primary");;
    }

    private void updateProductsQuantityInOrder(List<UpdateProductGPT> updateProduct)
    {
        List<Product> productsToRemove = new List<Product>();
        
        foreach (var product in updateProduct)
        {
            var productToUpdate = Chat.OrderProducts.FirstOrDefault(p => p.Id == product.Id && p.Store_id == product.StoreId);
            if (productToUpdate != null)
            {
                productToUpdate.Quantity = product.NewQuantity;
                Logger?.LogInformation($"Product {productToUpdate.Name} updated to {product.NewQuantity}");
                
                if(productToUpdate.Quantity == 0)
                    productsToRemove.Add(productToUpdate);
            }
        }

        foreach (var product in productsToRemove)
        {
            Chat.OrderProducts.Remove(product);
        }
    }
}