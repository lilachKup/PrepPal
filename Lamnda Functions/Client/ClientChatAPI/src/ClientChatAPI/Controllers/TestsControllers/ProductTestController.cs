using Amazon.Lambda.Core;
using ClientChatAPI.Repositories;
using ClientChatLambda.models;
using Microsoft.AspNetCore.Mvc;

namespace ClientChatAPI.Controllers.TestControllers;

[Route("test/[controller]")]
public class ProductTestController : ControllerBase
{
    
    private readonly ILambdaLogger? _logger;
    private readonly IReadRepository<(string, int), Product> _productRepository;
    public ProductTestController(ILambdaLogger logger = null)
    {
         string connectionString = Environment.GetEnvironmentVariable("ProductDbConnectionString");
        
        _logger = logger;
        _productRepository = new ProductsPgRepository(connectionString, "product_store");
        
    }
    
    // GET: test/producttest
    [HttpGet]
    public async Task<IActionResult> GetProduct()
    {
        const string storeId = "24682478-3021-70bf-41e1-a3ee28bb3db7";
        const int productId = 11;
        var product = await _productRepository.GetByPkAsync((storeId, productId));
        
        return Ok(product);
    }
    
}