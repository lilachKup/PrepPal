using System.Text.Json;
using Amazon.DynamoDBv2.DataModel;
using Amazon.Lambda.Core;
using ClientChatLambda.models;
using CreateChatLambda.Models;

namespace CreateChatLambda.DB;

public class DynamoDB : IDbContext
{
    private readonly IDynamoDBContext _dynamoDBClient;
    
    public ILambdaLogger? Logger { get; set; }
    
    public DynamoDB(IDynamoDBContext dynamoDBClient)
    {
        _dynamoDBClient = dynamoDBClient;
    }
    
    public async Task<string> CreateChat(string client_id, string address)
    {
        if (string.IsNullOrEmpty(client_id))
        {
            throw new ArgumentNullException(nameof(client_id));
        }
        
        if (string.IsNullOrEmpty(address))
        {
            throw new ArgumentNullException(nameof(address));
        }
        
        // Get coordinates for the address
        (double lat, double lon) = await GetCoordinates(address);

        var chat = new ChatEntity();
        chat.client_id = client_id;
        chat.chat_id = Guid.NewGuid().ToString();
        chat.latitude = lat;
        chat.longitude = lon;
        
        Logger?.LogInformation($"Creating chat for client {client_id} with id {chat.chat_id}");
        
        await _dynamoDBClient.SaveAsync(chat);
        
        Logger?.LogInformation($"Chat created with id {chat.chat_id}");
        
        return chat.chat_id;
    }

    private async Task<(double lat, double lon)> GetCoordinates(string address)
    {
        HttpClient coordinatesClient = new HttpClient();
        coordinatesClient.BaseAddress = new Uri("https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/location");
        string query = $"?address={Uri.EscapeDataString(address)}";
        
        HttpResponseMessage response = await coordinatesClient.GetAsync(query);
        if (!response.IsSuccessStatusCode)
        {
            Logger?.LogError($"Failed to get coordinates for address {address}. Status code: {response.StatusCode}");
            throw new Exception("Failed to get coordinates from external service.");
        }
        
        string content = await response.Content.ReadAsStringAsync();
        var coordinates = JsonSerializer.Deserialize<Coordinate>(content);

        if (coordinates is null)
        {
            Logger?.LogError($"Failed to deserialize coordinates for address {address}. Content: {content}");
            throw new Exception("Failed to get coordinates from external service.");
        }
        
        // double latitude = double.Parse(coordinates.lat);
        // double longitude = double.Parse(coordinates.lon);
        
        Logger?.LogInformation($"Coordinates for address {address} are lat: {coordinates.lat}, lon: {coordinates.lon}");
        return (coordinates.lat, coordinates.lon);
    }
}