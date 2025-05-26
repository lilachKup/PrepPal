using Amazon.Lambda.Core;
using ClientChatAPI.Repositories;
using ClientChatLambda.models;

namespace ClientChatAPI.Services;

public class ChatService : IChatService
{
    private readonly IRepository<string,Chat> _chatRep;
    private ILambdaLogger? _logger;

    private readonly HttpClient _getCoordinatesClient = new();
    
    public ILambdaLogger? Logger
    {
        get => _logger;
        set
        {
            _logger = value;
            _chatRep.Logger = value;
        }
    }
    public ChatService(IRepository<string, Chat> repository, ILambdaLogger? logger = null)
    {
        _logger = logger;
        _chatRep = repository;
        _getCoordinatesClient.BaseAddress = new Uri("https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/");
        _getCoordinatesClient.DefaultRequestHeaders.Clear();
    }
    
    public async Task<string> CreateChat(string clientId, string address)
    {
        try
        {
            var coordinates = await GetCoordinates(address);
            if (coordinates.lat == 0 && coordinates.lon == 0)
            {
                throw new Exception("Failed to get coordinates");
            }
            
            var chat = await _chatRep.Create(clientId);
            
            _logger?.LogInformation($"Chat created with id {chat.ChatId}");
            
            chat.Latitude = coordinates.lat;
            chat.Longitude = coordinates.lon;
            
            _logger?.LogInformation($"Coordinates set for chat {chat.ChatId}: {coordinates.lat}, {coordinates.lon}");
            
            _chatRep.Update(chat);
            
            _logger?.LogInformation($"Chat updated with coordinates {coordinates.lat}, {coordinates.lon}");
            
            return chat.ChatId;
        }
        catch (Exception e)
        {
            _logger?.LogError(e.Message);
            throw;
        }
    }

    public async Task<bool> CheckChatClient(string chatId, string clientId)
    {
        var chat = await _chatRep.GetByPkAsync(chatId);
        
        if (chat is null)
        {
            _logger?.LogError($"Chat with id {chatId} not found");
            throw new KeyNotFoundException($"Chat with id {chatId} not found");
        }
        
        _logger?.LogInformation($"Chat found with id {chat.ChatId}");
        _logger?.LogInformation($"Chat client id: {chat.ClientId}, request client id: {clientId}");
        return chat.ClientId == clientId;
    }

    public async Task<(string response, List<Product> cart)> ReceiveMessage(string chatId, string message)
    {
        var chat = _chatRep.GetByPkAsync(chatId);
        if (chat is null)
        {
            _logger?.LogError($"Chat with id {chatId} not found");
            throw new KeyNotFoundException($"Chat with id {chatId} not found");
        }
        
        _logger?.LogInformation($"Chat found with id {chatId}");
        
        
        
    }

    private async Task<(double lat, double lon)> GetCoordinates(string address)
    {
        var response = await _getCoordinatesClient.GetAsync($"location?address={address}");
        
        _logger?.LogInformation($"response from get coordinates: {response.StatusCode}");
        
        if (response.IsSuccessStatusCode)
        {
            var coordinates = await response.Content.ReadFromJsonAsync<Coordinates>();

            if (double.TryParse(coordinates.lat, out var lat) && double.TryParse(coordinates.lon, out var lon))
            {
                _logger?.LogInformation($"Coordinates: {lat}, {lon}");
                return (lat, lon);
            }
            else
            {
                _logger?.LogError("Failed to parse coordinates");
                throw new Exception("Failed to parse coordinates");
            }
        }
        else
        {
            _logger?.LogError($"Failed to get coordinates: {response.StatusCode}");
            throw new Exception("Failed to get coordinates");
        }
    }
}