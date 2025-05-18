using System.Collections.Generic;

namespace AddItem
{
    public class PostProductRequest
    {
        public string store_id { get; set; }
        public string name { get; set; }
        public string description { get; set; }
        public decimal price { get; set; }
        public string brand { get; set; }
        public string category { get; set; }
        public int quantity { get; set; }
        public string image_url { get; set; }
    }
}
