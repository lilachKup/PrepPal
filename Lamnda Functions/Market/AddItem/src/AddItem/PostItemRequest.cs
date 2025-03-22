using System.Collections.Generic;

namespace AddItem
{
    public class PostItemRequest
    {
        public string market_id { get; set; }
        public string name { get; set; }
        public string description { get; set; }
        public double price { get; set; }
        public string category { get; set; }
        public int quantity { get; set; }
    }
}
