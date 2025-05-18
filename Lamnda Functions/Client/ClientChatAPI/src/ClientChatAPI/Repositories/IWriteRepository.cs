using Amazon.Lambda.Core;
using ClientChatLambda.models;

namespace ClientChatAPI.Repositories;

public interface IWriteRepository <T>
{
    ILambdaLogger? Logger { get; set; }
    Task<T> Create(string clientId);

    Task<T> Update(T model);
}