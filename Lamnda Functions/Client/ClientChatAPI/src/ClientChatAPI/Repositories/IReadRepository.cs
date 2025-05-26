using Amazon.Lambda.Core;

namespace ClientChatAPI.Repositories;

public interface IReadRepository <PK, T>
{
    ILambdaLogger? Logger { get; set; }

    Task<T> GetByPkAsync(PK id);

    Task<List<T>> GetAllAsync(int limit = -1);

    Task<List<T>> GetWhereAsync(Predicate<T> predicate, int limit = -1);
    
    Task<List<T>> GetQueryAsync(string query);
}