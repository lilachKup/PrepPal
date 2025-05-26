using Amazon.Lambda.Core;

namespace ClientChatAPI.AIAgents;

public interface IAIAgent<Input, Output>
{
    
    ILambdaLogger? Logger { get; set; }
    
    Task<Output> ProcessAsync(Input input);
    Task<IEnumerable<Output>> CollectionProcessAsync(Input inputs);
}