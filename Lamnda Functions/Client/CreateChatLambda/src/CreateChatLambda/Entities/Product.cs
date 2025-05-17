namespace ClientChatLambda.models;

public class Product
{
    public long Id { get; set; }
    public string? Name { get; set; }
    public string? Category { get; set; }
    public string? Tag { get; set; }
    public string? Brand { get; set; }
    public string? Price { get; set; }
    public int? Quantity { get; set; }
    public long? Store_id { get; set; }
    public int entity_version { get; set; } = 1; // version for optimistic concurrency control
}
