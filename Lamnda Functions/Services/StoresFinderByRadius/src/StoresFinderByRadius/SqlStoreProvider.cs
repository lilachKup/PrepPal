using System.Diagnostics;
using Amazon.Lambda.Core;
using GeoCoordinatePortable;
using Npgsql;

namespace StoresFinderByRadius;

public class SqlStoreProvider :IStoreProvider
{
    private IStoreProvider? _decorator;
    private readonly string _connectionString;
    private readonly string _query;
    private GeoCoordinate coordinate;
    private ILambdaLogger? _logger;
    
    public SqlStoreProvider(string connectionString, string query,ILambdaLogger? logger = null,IStoreProvider decorator = null)
    {
        _decorator = decorator;
        _query = query;
        _connectionString = connectionString;
        _logger = logger;
    }
    
    public async Task<List<string>> GetStoreIdsByCoordinatesAsync(double latitude, double longitude, double radius)
    {   
         coordinate = new GeoCoordinatePortable.GeoCoordinate(latitude, longitude);
        
         return await GetStoreIdsByCoordinatesFromDb(radius);
    }

    public ILambdaLogger? Logger
    {
        get => _logger;
        set => _logger = value;
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
            var hoursText = reader.GetString(2);
            var coordinates = storeCoordinates.Split(',');
            bool latSuc = double.TryParse(coordinates[0], out var storeLatitude);
            bool lonSuc = double.TryParse(coordinates[1], out var storeLongitude);
            //var storeLatitude = double.Parse(coordinates[0]);
            //var storeLongitude = double.Parse(coordinates[1]);
            
            if(!(latSuc && lonSuc))
                continue;
            
            var storeCoordinate = new GeoCoordinate(storeLatitude, storeLongitude);
            if (coordinate.GetDistanceTo(storeCoordinate) <= radius && isStoreOpen(hoursText))
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
    
    private bool isStoreOpen(string hoursText)
    {
        var current_time = DateTime.UtcNow.AddHours(2);
        
        var days = hoursText.Split(',');
        
        var opening_hours = new Dictionary<string, (TimeSpan, TimeSpan)>();
        foreach (var day in days)
        {
            _logger.LogInformation($"Day: {day}");
            var parts = day.Split(':', 2);
            _logger.LogInformation($"parts: {parts[0]}, {parts[1]}, length: {parts.Length}");
            if (parts.Length != 2) continue;
            var dayOfWeek = parts[0].Trim().Substring(0,3);
            var hours = parts[1].Split('–', 2);
            if (hours.Length != 2) continue;
            if (TimeSpan.TryParse(hours[0], out var openTime) && TimeSpan.TryParse(hours[1], out var closeTime))
            {
                _logger.LogInformation($"dayOfWeek: {dayOfWeek}, openTime: {openTime}, closeTime: {closeTime}");
                opening_hours[dayOfWeek] = (openTime, closeTime);
            }
        }
        
        var currentDay = current_time.DayOfWeek.ToString().Substring(0, 3);
        if (opening_hours.ContainsKey(currentDay))
        {
            var (openTime, closeTime) = opening_hours[currentDay];
            var currentTimeSpan = current_time.TimeOfDay;
            if (openTime <= currentTimeSpan && currentTimeSpan <= closeTime)
            {
                _logger.LogInformation("Store is open");  
                return true;
            }
        }
        
        _logger.LogInformation("Store is closed");
        return false;
    }
    
    
}