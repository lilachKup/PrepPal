namespace MarketProductService.Models
{
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public List<string> Tags { get; set; } = new List<string>();

        public List<int> Markets_Id { get; set; } = new List<int>();
    }
}
