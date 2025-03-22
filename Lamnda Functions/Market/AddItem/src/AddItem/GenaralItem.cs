using System.Collections.Generic;
using Amazon.DynamoDBv2.DataModel;


namespace AddItem
{
    [DynamoDBTable("Items_Genaral")]
    public class GenaralItem
    {

        [DynamoDBHashKey]
        public int item_id { get; set; }
        public string name { get; set; }
        public string description { get; set; }

        [DynamoDBRangeKey]
        public string category { get; set; }
        public List<string> tags { get; set; }

        public List<int> markets_ids { get; set; }
    }
}
