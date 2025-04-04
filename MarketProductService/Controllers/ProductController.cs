using MarketProductService.Models;
using MarketProductService.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace MarketProductService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly IProductRepository _productRepository;

        public ProductController(IProductRepository productRepository)
        {
            _productRepository = productRepository;
        }

        [HttpPost("{market_id}")]
        public async Task<IActionResult> CreateProduct(int market_id, [FromBody] PostProduct product)
        {
            // Create a new product

            return Ok(await _productRepository.CreateProduct(market_id,product));
        }

        [HttpGet()]
        public async Task<IActionResult> FindProductsByTags([FromQuery] IEnumerable<string> tags)
        {
            // Find products by tags

            return Ok(await _productRepository.FindProductsByTags(tags));
        }

        [HttpGet("search")]
        public async Task<IActionResult> FindProductsByText([FromQuery] string text)
        {
            // Find products by text

            return Ok(await _productRepository.FindProductsByText(text));
        }
    }
}
