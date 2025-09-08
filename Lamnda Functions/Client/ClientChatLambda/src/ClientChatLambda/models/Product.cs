using System.Text.Json.Serialization;

namespace ClientChatLambda.models;

public class Product
{
    public string Id { get; set; }
    public string? Name { get; set; }
    public string? Category { get; set; }
    public string? Tag { get; set; }
    public string? Brand { get; set; }
    public string? Price { get; set; }
    public int? Quantity { get; set; }
    public string? Store_id { get; set; }
    
    [JsonPropertyName("image_url")]
    public string? Image_url { get; set; }
    
    public int entity_version { get; set; } = 1; // version for optimistic concurrency control
}
