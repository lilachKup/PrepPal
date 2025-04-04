using Amazon.Lambda.Core;

namespace AddItem;

public interface IRepository
{
    Task<ProductResponse> CreateProduct(PostProductRequest product,List<string> tags);
}