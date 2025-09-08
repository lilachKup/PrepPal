namespace CreateChatLambda.Models;

public class Coordinate
{
    [System.Text.Json.Serialization.JsonPropertyName("latitude")]
    public double lat { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("longitude")]
    public double lon { get; set; }
}