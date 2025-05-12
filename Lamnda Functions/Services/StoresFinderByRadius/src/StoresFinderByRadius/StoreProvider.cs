using GeoCoordinatePortable;
using Npgsql;

namespace StoresFinderByRadius;

public class StoreProvider :IStoreProvider
{
    private IStoreProvider? _decorator;
    private readonly string _connectionString = Environment.GetEnvironmentVariable("ConnectionString") ?? string.Empty;
    private readonly string _query = Environment.GetEnvironmentVariable("Query") ?? string.Empty;
    private GeoCoordinate coordinate;
    
    public StoreProvider(IStoreProvider decorator = null)
    {
        _decorator = decorator;
    }
    
    public async Task<List<string>> GetStoreIdsByCoordinates(double latitude, double longitude, double radius)
    {   
         coordinate = new GeoCoordinatePortable.GeoCoordinate(latitude, longitude);
        
         return await GetStoreIdsByCoordinatesFromDb(radius);
    }
    
    private async Task<List<string>> GetStoreIdsByCoordinatesFromDb( double radius)
    {
        var storeIds = new List<string>();
        
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(_query, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var storeId = reader.GetString(0);
            var storeCoordinates = reader.GetString(1);
            var coordinates = storeCoordinates.Split(',');
            var storeLatitude = double.Parse(coordinates[0]);
            var storeLongitude = double.Parse(coordinates[1]);

            var storeCoordinate = new GeoCoordinate(storeLatitude, storeLongitude);
            if (coordinate.GetDistanceTo(storeCoordinate) <= radius)
            {
                storeIds.Add(storeId);
            }
        }

        return storeIds;
    }
    
    
}