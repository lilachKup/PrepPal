using Amazon.Lambda.Core;
using Amazon.Runtime.Internal.Util;
using ClientChatLambda.models;

namespace CreateChatLambda.DB;

public interface IDbContext
{
    ILambdaLogger? Logger { get; set; }
    Task<string> CreateChat(string client_id);
}