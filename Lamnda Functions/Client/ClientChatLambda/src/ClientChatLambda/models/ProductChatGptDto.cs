namespace ClientChatLambda.models;

public class ProductChatGptDto
{
    public long Product_id { get; set; }
    public string Product_name { get; set; }
    public long? Store_id { get; set; }
    public int? Quantity { get; set; }
}