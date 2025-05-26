using ClientChatAPI.AIAgents;
using ClientChatAPI.Repositories;
using ClientChatLambda;
using ClientChatLambda.models;
using Microsoft.AspNetCore.Mvc;

namespace ClientChatAPI.Controllers.TestControllers;

[Route("test")]
public class TestController : ControllerBase
{
    private IReadRepository<(string, int), Product> _productRepository;
    
    [HttpPost("message")]
    public async Task<IActionResult> RecieveMessage([FromBody] string message)
    {
        string connectionString = Environment.GetEnvironmentVariable("ProductDbConnectionString");
        
        _productRepository = new ProductsPgRepository(connectionString, "product_store");

        IAIAgent<List<Message>, Product> agent = new SearchProductsGPTAgent(OpenAIAgentModels.Model.GPT_4O_MINI, _productRepository);
        
        var messages = new List<Message>
        {
            new Message
            {
                SenderRole = MessageSenderRole.Client,
                Content = "Hello, I am looking for a product.",
            },
            new Message
            {
                SenderRole = MessageSenderRole.Assistant,
                Content = "grate! I can help you with that. What kind of product are you looking for?",
            },
            new Message
            {
                SenderRole = MessageSenderRole.Client,
                Content = "Im looking for ingredients for chocolate cake .",
            }
        };
        
        var response = await agent.CollectionProcessAsync(messages);

        return Ok(new { Status = "Message received", Responses = response });
    }
    
}