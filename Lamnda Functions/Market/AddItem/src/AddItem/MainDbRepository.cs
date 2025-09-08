using System.Net.Http.Json;
using System.Text.Json;
using Amazon.Lambda.Core;

namespace AddItem;

public class MainDbRepository : IRepository
{
    HttpClient _dbClinet = new HttpClient();
    ILambdaLogger? _logger;

    public MainDbRepository(ILambdaLogger? logger = null)
    {
        _dbClinet = new HttpClient();
        _dbClinet.BaseAddress = new Uri("https://xgpbt0u4ql.execute-api.us-east-1.amazonaws.com/prod/products/add");
        
        _logger = logger;
    }
    
    public async Task<ProductResponse> CreateProduct(PostProductRequest product, List<string> tags)
    {
        _logger?.LogInformation("Creating product");
        
        var requestBody = new
        {
            store_id = product.store_id,
            product_name = product.product_name,
            description = product.description,
            price = product.price,
            brand = product.brand,
            category = product.category,
            image_url = product.image_url,
            quantity = product.quantity,
            tags = tags
            
        };
        
        _logger?.LogInformation(JsonSerializer.Serialize(requestBody));

        var response = await _dbClinet.PostAsJsonAsync("", requestBody);

        _logger?.LogInformation("Created product");
        _logger?.LogInformation( await response.Content.ReadAsStringAsync());

        return (await response.Content.ReadFromJsonAsync<DBResponse>()).product;
    }
}