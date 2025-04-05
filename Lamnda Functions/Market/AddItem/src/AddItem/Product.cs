using System.Collections.Generic;
namespace AddItem
{
    public class Product
    {
        public int product_id { get; set; }
        public string name { get; set; }
        public string description { get; set; }
        public string category { get; set; }
        public string brand { get; set; }
        public List<string> tags { get; set; }
        public List<int> store_ids { get; set; }
    }
}
