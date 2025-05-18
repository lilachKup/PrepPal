namespace ClientChatLambda.models;

public class UpdateProductGPT
{
    public long Id { get; set; }
    
    public long StoreId { get; set; }

    public int NewQuantity { get; set; }
}