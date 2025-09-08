using Amazon.Lambda.Core;

namespace StoresFinderByRadius;

public interface IStoreProvider
{
    Task<List<string>> GetStoreIdsByCoordinatesAsync(double latitude, double longitude, double radius);
    
    ILambdaLogger? Logger { set; }
}