namespace StoresFinderByRadius;

public interface IStoreProvider
{
    Task<List<string>> GetStoreIdsByCoordinates(double latitude, double longitude, double radius);
}