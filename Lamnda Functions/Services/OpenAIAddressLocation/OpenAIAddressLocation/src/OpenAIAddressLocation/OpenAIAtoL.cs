using System.Text.Json;
using Amazon.Lambda.Core;
using OpenAI.Chat;

namespace OpenAIAddressLocation;

public class OpenAIAtoL : IAIAgent
{
    const string DefaultModel = "gpt-4o-mini";
    const int DefaultMaxTokens = 100;
    const string PROMPT = "You are an AI agent that provides coordinates for a given address. " +
                     "Return the coordinates in the format: {\"latitude\": <latitude>, \"longitude\": <longitude>}"
                     + " where <latitude> and <longitude> are double precision floating point numbers. " +
                     "If the address is not valid or cannot be found, return {\"latitude\": 0, \"longitude\": 0.";

    
    private ChatClient _agent;
    private string _model;
    public int MaxTokens { get; set; } = DefaultMaxTokens;
    public ILambdaLogger? Logger { get; set; }
    
    public OpenAIAtoL(string apiKey, string model = DefaultModel, int maxTokens = DefaultMaxTokens)
    {
        _model = model;
        _agent = new ChatClient(_model, apiKey);
        MaxTokens = maxTokens;
    }
    
    
    public async Task<Coordinates> GetCoordinatesAsync(string address)
    {
        ArgumentNullException.ThrowIfNullOrEmpty(address);
        
        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(PROMPT),
            new UserChatMessage($"Provide the coordinates for the address: {address}")
        };

        var options = new ChatCompletionOptions();
        options.MaxOutputTokenCount = MaxTokens;
        options.Temperature = 0.1f;

        var response = await _agent.CompleteChatAsync(messages, options);

        if (response.Value.Content.Count == 0)
        {
            throw new Exception("No response from OpenAI");
        }

        var content = response.Value.Content[0].Text;
        if (string.IsNullOrEmpty(content))
        {
            throw new Exception("Empty response from OpenAI");
        }

        try
        {
            var coordinates = JsonSerializer.Deserialize<Coordinates>(content) ??
                              throw new Exception("Invalid coordinates format");
            if (coordinates.Latitude == 0 && coordinates.Longitude == 0)
            {
                throw new ArgumentOutOfRangeException("Address not found or invalid");
            }

            return coordinates;
        }
        catch (ArgumentOutOfRangeException ex)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new Exception($"Error parsing coordinates: {ex.Message}");
        }
    }
}