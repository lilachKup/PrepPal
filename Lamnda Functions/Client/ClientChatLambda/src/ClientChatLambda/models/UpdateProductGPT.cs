namespace ClientChatLambda.models;

public class UpdateProductGPT
{
    public string Id { get; set; }
    
    public string StoreId { get; set; }

    public int NewQuantity { get; set; }
}