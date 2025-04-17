using Amazon.Lambda.Core;
using ClientChatLambda.models;

namespace ClientChatLambda.Repositories;

public interface IChatRepository
{
    ILambdaLogger Logger { get; set; }
    Task<ChatEntity> GetChat(string client_id, string chat_id);
    Task<List<ChatEntity>> GetChatsByUserId(string client_id, IComparer<ChatEntity>? comparer = null);
}