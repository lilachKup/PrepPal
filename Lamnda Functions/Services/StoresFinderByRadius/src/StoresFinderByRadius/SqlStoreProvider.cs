using GeoCoordinatePortable;
using Npgsql;

namespace StoresFinderByRadius;

public class SqlStoreProvider :IStoreProvider
{
    private IStoreProvider? _decorator;
    private readonly string _connectionString;
    private readonly string _query;
    private GeoCoordinate coordinate;
    
    public SqlStoreProvider(string connectionString, string query,IStoreProvider decorator = null)
    {
        _decorator = decorator;
        _query = query;
        _connectionString = connectionString;
    }
    
    public async Task<List<string>> GetStoreIdsByCoordinatesAsync(double latitude, double longitude, double radius)
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
        
        await reader.CloseAsync();
        await conn.CloseAsync();
        
        if (_decorator != null)
        {
            var decoratorStoreIds = await _decorator.GetStoreIdsByCoordinatesAsync(coordinate.Latitude, coordinate.Longitude, radius);
            storeIds.AddRange(decoratorStoreIds);
        }

        return storeIds;
    }
    
    
}