namespace StoresFinderByRadius;

public interface IStoreProvider
{
    Task<List<string>> GetStoreIdsByCoordinatesAsync(double latitude, double longitude, double radius);
}