using System.Text.Json;
using Amazon.Lambda.Core;
using ClientChatAPI.Repositories;
using ClientChatAPI.Utils;
using ClientChatLambda.models;
using OpenAI.Chat;

namespace ClientChatAPI.AIAgents;

public class SearchProductsGPTAgent : OpenAIAgentBase, IAIAgent<List<Message>, Product>
{
    private readonly SystemChatMessage _promptMessage = new SystemChatMessage(
        Environment.GetEnvironmentVariable("SearchProductsGPTAgentPrompt") ??
        "You are “ProductFinderGPT,” an expert shopping assistant.\nYour job is to read the user’s free-form query, decide precisely what they want, then drive a two-step search:\n\n1. Tag extraction: decide which keywords capture their intent (categories, brands, features, use-cases).  \n2. Product selection: from candidate items, pick those that best satisfy their needs (price, availability, features).\n\nAlways think:\n- “What is the user really asking for?”\n- “Which tags will yield the most relevant products?”\n- “Which of these candidates best fit their criteria?”\n\nUnder no circumstances generate plain text at the end—only call the function with valid JSON. Keep responses concise, factual, and focused on calling the function.\n");

    private readonly SystemChatMessage _FindBestProductMessage = new SystemChatMessage(
    "Choose best products.\n\nYou have:\n- The original user messages.\n- A list of candidate products (each with P_id, S_id, P_name, available Q, price, tags, etc.).\n\nEvaluate each candidate against the user’s needs:\n• Price: choose within budget or best value.\n• Availability: only items in stock.\n• Features: must satisfy any specified features.\n• Brand/model preferences as stated.\n\nThen return only a single function call in JSON:\n\n{\n  \"name\": \"AddProducts\",\n  \"arguments\": {\n    \"products\": [\n      { \"P_id\": 123, \"S_id\": \"store42\", \"P_name\": \"Example\", \"Q\": 1 },\n      ...\n    ]\n  }\n}\n\nIf none match, return `\"products\": []`. Do not output any other text.\n");
    private readonly SystemChatMessage _CreateTagsMessage = new SystemChatMessage(
        "Extract tags.\n\n– Read the user’s conversation history.  \n– Identify 6–20 one-word tags: product types (“laptop”), brands (“Sony”), features (“wireless”), use-cases (“gaming”), etc.  \n– No synonyms, no stopwords, no multi-word phrases.  \n– Return only a single function call in JSON:\n\n{\n  \"name\": \"GetProducts\",\n  \"arguments\": {\n    \"tags\": [\"tag1\", \"tag2\", ..., \"tagN\"]\n  }\n}\n\nDo not output any other text or explanations.\n");
    
    private readonly IReadRepository<(string, int),Product> _productRepository;

    public ILambdaLogger? Logger { get; set; }
    
    private static readonly ChatTool GetProductsTool = ChatTool.CreateFunctionTool(
        functionName: "GetProducts",
        functionDescription: "Retrieves products based on the provided tags.",
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

    private static readonly ChatTool _AddProductsTool = ChatTool.CreateFunctionTool(
        functionName: "AddProducts",
        functionDescription: "Adds products to the cart.",
        functionParameters: BinaryData.FromBytes("""
                                                 {
                                                     "type": "object",
                                                     "properties": {
                                                         "products": {
                                                             "type": "array",
                                                             "description": "List of products to add to the order. when P_id is Product_id, P_name is Product_name, S_id is Store_id and Q is Quantity",
                                                             "items": {
                                                                 "type": "object",
                                                                 "properties": {
                                                                     "P_id": { "type": "integer" },
                                                                     "S_id": { "type": "string" },
                                                                     "P_name" : { "type": "string" },
                                                                     "Q": { "type": "integer" }
                                                                 },
                                                                 "required": ["P_id", "S_id", "P_name","Q"]
                                                             }
                                                         }
                                                     },
                                                     "required": ["products"]
                                                 }
                                                 """u8.ToArray())
    );

    public SearchProductsGPTAgent(OpenAIAgentModels.Model model, IReadRepository<(string, int), Product> productRepository) : base(model)
    {
        _productRepository = productRepository ?? throw new ArgumentNullException(nameof(productRepository));
    }

    public async Task<Product> ProcessAsync(List<Message> input)
    {
        return (await CollectionProcessAsync(input)).FirstOrDefault() 
               ?? throw new Exception("No products found matching the AI agent's request.");
    }

    public async Task<IEnumerable<Product>> CollectionProcessAsync(List<Message> inputs)
    {
        List<Product> products = new List<Product>();
        List<ProductChatGptDto> productsDtos = new List<ProductChatGptDto>();
        
        var messages = inputs.Select(inp => inp.ToChatMessage()).ToList();
        
        messages.Insert(0, _promptMessage);
        messages.Insert(1, _CreateTagsMessage);
        
        try
        {
            productsDtos = await searchForProduct(messages);
            if (productsDtos.Count == 0)
            {
                Logger?.LogInformation("No products found by the AI agent.");
                return products;
            }
            
            Logger?.LogInformation($"Found {productsDtos.Count} products by the AI agent.");
            
            messages.RemoveAt(1);

            products = await findBestProducts(messages, productsDtos);

            return products;
        }
        catch (Exception e)
        {
            Logger?.LogError(e.Message);
            throw;
        }
        
    }

    private async Task<List<Product>> findBestProducts(List<ChatMessage> inputs, IEnumerable<ProductChatGptDto> proDtos)
    {
        bool useGetProductsTool = false;
        short retries = 0;
        short maxRetries = 3;

        var products = SetFindBestSettings(inputs, proDtos, out var options);

        do
        {
            var response = await AgentClient.CompleteChatAsync(inputs, options);
            if (response is null)
            {
                Logger?.LogError("No response from the AI agent.");
                throw new Exception("No response from the AI agent.");
            }

            if (response.Value.ToolCalls.Count == 0)
            {
                Logger?.LogError("No choices in the response from the AI agent.");
                Logger?.LogError($"Retrying... ({retries}/{maxRetries})");
                continue;
            }

            foreach (var toolCall in response.Value.ToolCalls)
            {
                if (toolCall is null)
                {
                    Logger?.LogError("No tool call in the response from the AI agent.");
                    Logger?.LogError($"Retrying... ({retries}/{maxRetries})");
                    continue;
                }

                if (toolCall.FunctionName == _AddProductsTool.FunctionName)
                {
                    useGetProductsTool = true;
                    var productsList = JsonSerializer.Deserialize<Dictionary<string, List<ProductChatGptDto>>>(toolCall.FunctionArguments)["products"];

                    if (productsList is null || productsList.Count == 0)
                    {
                        Logger?.LogError("No products found in the response from the AI agent.");
                        Logger?.LogError($"Retrying... ({++retries}/{maxRetries})");
                        continue;
                    }

                    Logger?.LogInformation(
                        $"Products received from the AI agent: {string.Join(", ", productsList.Select(p => p.P_name))}");

                    products.AddRange(await AddProducts(productsList));
                }
                else
                {
                    Logger?.LogError($"Unknown tool call: {toolCall.FunctionName}");
                    Logger?.LogError($"Retrying... ({retries}/{maxRetries})");
                }
            }
        } while (!useGetProductsTool && (++retries) <= maxRetries);

        if (retries > maxRetries)
        {
            Logger?.LogError("Max retries reached. Unable to get products.");
            throw new Exception("Max retries reached. Unable to get products.");
        }


        string logInfo = products.Count > 0
            ? $"Products retrieved successfully. count = {products.Count}"
            : "No products found matching the AI agent's request.";

        Logger?.LogInformation(logInfo);
        return products;
    }

    private List<Product> SetFindBestSettings(List<ChatMessage> inputs, IEnumerable<ProductChatGptDto> proDtos, out ChatCompletionOptions options)
    {
        List<Product> products = new List<Product>();
        inputs.Insert(1, _FindBestProductMessage);
        inputs.Insert(2, new SystemChatMessage($"From the following products, find the best ones based on the user's request: {JsonSerializer.Serialize(proDtos)}"));
        
        
        options = new ChatCompletionOptions();
        options.Temperature = 0.7f;
        options.MaxOutputTokenCount = 300;
        options.Tools.Add(_AddProductsTool);
        return products;
    }

    private async Task<List<ProductChatGptDto>> searchForProduct(List<ChatMessage> messages)
    {
        bool useGetProductsTool = false;
        short retries = 0;
        short maxRetries = 3;
        List<ProductChatGptDto> productsDtos = new List<ProductChatGptDto>();
        
        var options = new ChatCompletionOptions();
        options.Temperature = 0.7f;
        options.MaxOutputTokenCount = 300;
        options.Tools.Add(GetProductsTool);
        
        do
        {
            var response = await AgentClient.CompleteChatAsync(messages, options);
            
            if (response is null)
            {
                Logger?.LogError("No response from the AI agent.");
                throw new Exception("No response from the AI agent.");
            }
            
            if (response.Value.ToolCalls.Count == 0)
            {
                Logger?.LogError("No choices in the response from the AI agent.");
                Logger?.LogError($"Retrying... ({++retries}/{maxRetries})");
                continue;
            }
            
            var toolCall = response.Value.ToolCalls.FirstOrDefault();
            if (toolCall is null)
            {
                Logger?.LogError("No tool call in the response from the AI agent.");
                Logger?.LogError($"Retrying... ({++retries}/{maxRetries})");
                continue;
            }
            
            if (toolCall.FunctionName == GetProductsTool.FunctionName)
            {
                useGetProductsTool = true;
                var tags = JsonSerializer.Deserialize<Dictionary<string,List<string>>>(toolCall.FunctionArguments)["tags"];
                Logger?.LogInformation($"Tags received from the AI agent: {string.Join(", ", tags)}");
                
                productsDtos = await GetProducts(tags);
            }
            else
            {
                Logger?.LogError($"Unknown tool call: {toolCall.FunctionName}");
                Logger?.LogError($"Retrying... ({++retries}/{maxRetries})");
            }
            
        }while(!useGetProductsTool && retries < maxRetries);
        
        if (retries >= maxRetries)
        {
            Logger?.LogError("Max retries reached. Unable to get products.");
            throw new Exception("Max retries reached. Unable to get products.");
        }

        return productsDtos;
    }

    private async Task<List<Product>> AddProducts(List<ProductChatGptDto> products)
    {
        var productList = new List<Product>();
        
        foreach (var productDto in products)
        {
            var product = await _productRepository.GetByPkAsync((productDto.S_id, (int)productDto.P_id));
            if (product is null)
            {
                Logger?.LogWarning($"Product with id {productDto.P_id} and store id {productDto.S_id} not found.");
                continue;
            }
            
            if (product.Quantity < productDto.Q)
            {
                Logger?.LogWarning($"Product {product.Name} has insufficient quantity. Requested: {productDto.Q}, Available: {product.Quantity}");
                continue;
            }
            
            productList.Add(product);
        }

        return productList;
    }
    
    private async Task<List<ProductChatGptDto>> GetProducts(List<string> tags)
    {
        var products = await _productRepository.GetWhereAsync(p =>
        {
            if (p.Tag is null || p.Tag.Length == 0)
            {
                Logger?.LogWarning($"Product {p.Id} has no tags.");
                return false;
            }
            
            var productTags = p.Tag.Split(',').Select(t => t.Trim()).ToList();
            return tags.Any(tag => productTags.Contains(tag, StringComparer.OrdinalIgnoreCase));
        });
        
        if (products.Count == 0)
        {
            Logger?.LogInformation("No products found with the provided tags.");
            return new List<ProductChatGptDto>();
        }
        
        Logger?.LogInformation($"Found {products.Count} products with the provided tags.");
        
        return products.Select(p => new ProductChatGptDto
        {
            P_id = p.Id,
            P_name = p.Name,
            S_id = p.Store_id,
            Q = p.Quantity
        }).ToList();
    }

}