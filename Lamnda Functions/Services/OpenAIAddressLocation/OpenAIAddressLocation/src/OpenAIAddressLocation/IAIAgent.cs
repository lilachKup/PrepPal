using Amazon.Lambda.Core;

namespace OpenAIAddressLocation;

public interface IAIAgent
{
    ILambdaLogger? Logger { get; set; }
    Task<Coordinates> GetCoordinatesAsync(string address);
}