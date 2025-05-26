using Amazon.Lambda.Core;
using ClientChatLambda.models;

namespace ClientChatAPI.Services;

public interface IChatService
{
     ILambdaLogger? Logger { get; set; }
     Task<string> CreateChat(string clientId, string address);
     
     Task<bool> CheckChatClient(string chatId, string clientId);
     Task<(string response, List<Product> cart)> ReceiveMessage(string chatId, string message);
}