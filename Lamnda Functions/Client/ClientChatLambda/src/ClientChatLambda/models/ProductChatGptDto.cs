namespace ClientChatLambda.models;

public class ProductChatGptDto
{
    //short name so it not take alot of tockens
    public string P_id { get; set; } // Product id
    public string Product_name { get; set; }
    public string? S_id { get; set; } // Store id
    public int? Q { get; set; } // Quantity
}