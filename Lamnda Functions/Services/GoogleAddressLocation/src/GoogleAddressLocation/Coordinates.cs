using System.Security.Cryptography.X509Certificates;

namespace GoogleAddressLocation;

public class Coordinates
{
    [System.Text.Json.Serialization.JsonPropertyName("latitude")]
    public double Latitude { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("longitude")]
    public double Longitude { get; set; }
}