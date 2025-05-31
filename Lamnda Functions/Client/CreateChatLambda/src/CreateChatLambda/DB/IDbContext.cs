using Amazon.Lambda.Core;

namespace CreateChatLambda.DB;

public interface IDbContext
{
    ILambdaLogger? Logger { get; set; }
    Task<string> CreateChat(string client_id, string address);
}