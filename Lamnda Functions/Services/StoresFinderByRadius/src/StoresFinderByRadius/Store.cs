namespace StoresFinderByRadius;

public class Store
{
    public string Id { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Coordinates => $"{Latitude},{Longitude}";
}