namespace AddItem;

public class ProductResponse
{
    public string product_id { get; set; }
    public string name { get; set; }
    public string description { get; set; }
    public string price { get; set; }
    public int quantity { get; set; }
    public string image_url { get; set; }
    public string store_id { get; set; }
}