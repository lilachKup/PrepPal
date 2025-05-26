using Amazon.Lambda.Core;

namespace ClientChatAPI.Repositories;

public interface IRepository<PK, T> : IReadRepository<PK, T>, IWriteRepository<T>
{
    ILambdaLogger? Logger { get; set; }
}