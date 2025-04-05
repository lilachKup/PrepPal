using ClientChatLambda.models;

namespace ClientChatLambda.Repositories;

public interface IChatRepository
{
    Task<Chat> CreateChat(string client_id);
    Task<Chat> GetChat(string chat_id);
    Task<List<Chat>> GetChatsByUserId(string client_id);
    Task SaveMessage(string chat_id, Message message);
    Task SaveProduct(string chat_id, string product_id);
    Task UpdateChat(Chat chat);
    Task DeleteChat(string chat_id);
}