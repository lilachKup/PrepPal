using Amazon.Lambda.Core;
using ClientChatLambda.models;

namespace ClientChatLambda.Repositories;

public interface IChatRepository
{
    ILambdaLogger Logger { get; set; }
    Task<Chat> CreateChat(string client_id);
    Task<Chat> GetChat(string client_id, string chat_id);
    Task<List<Chat>> GetChatsByUserId(string client_id, IComparer<Chat>? comparer = null);
    Task SaveMessage(string client_id, string chat_id, Message message);
    Task SaveProduct(string client_id, string chat_id, string product_id);
    Task UpdateChat(Chat chat);
    Task DeleteChat(string chat_id);
}