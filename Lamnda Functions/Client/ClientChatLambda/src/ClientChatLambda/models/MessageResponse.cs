using System.Text.Json.Serialization;

namespace ClientChatLambda.models;

public class MessageResponse
{
    [JsonPropertyName("message")]
    public string Message { get; set; }
    [JsonPropertyName("products")]
    public string Products { get; set; }
    [JsonPropertyName("store_id")]
    public string Store_id { get; set; }
}

//return new { message = response.Content, products = JsonSerializer.Serialize(chat.OrderProducts) , store_id = store_id };