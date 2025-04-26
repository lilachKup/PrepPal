namespace ClientChatLambda.models;

public class ProductChatGptDto
{
    //short name so it not take alot of tockens
    public long P_id { get; set; } // Product id
    public string Product_name { get; set; }
    public long? S_id { get; set; } // Store id
    public int? Q { get; set; } // Quantity
}