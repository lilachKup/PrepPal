using Amazon.Lambda.Core;

namespace ClientChatAPI.Services;

public interface IChatService
{
     ILambdaLogger? Logger { get; set; }
     Task<string> CreateChat(string clientId, string address);
}