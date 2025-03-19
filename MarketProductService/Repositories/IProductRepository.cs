using MarketProductService.Models;

namespace MarketProductService.Repositories
{
    public interface IProductRepository
    {
        Task<Product> CreateProduct(int market_id, PostProduct product);
        Task<Product> FindProduct(int id);
        Task<List<Product>> FindProductsByTags(IEnumerable<string> tags);
        Task<List<Product>> FindProductsByText(string text);
    }
}
