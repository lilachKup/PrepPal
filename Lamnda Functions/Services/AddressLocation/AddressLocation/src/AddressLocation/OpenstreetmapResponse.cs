namespace AddressLocation;

public class OpenstreetmapResponse
{
    public long PlaceId { get; set; }
    public string Licence { get; set; }
    public string OsmType { get; set; }
    public long OsmId { get; set; }
    public string lat { get; set; }
    public string lon { get; set; }
    public string Category { get; set; }
    public string Type { get; set; }
    public int PlaceRank { get; set; }
    public double Importance { get; set; }
    public string Addresstype { get; set; }
    public string Name { get; set; }
    public string DisplayName { get; set; }
    public List<string> Boundingbox { get; set; }
}

// [
// {
//     "place_id": 195440240,
//     "licence": "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright",
//     "osm_type": "node",
//     "osm_id": 2079022162,
//     "lat": "32.0469230",
//     "lon": "34.7594460",
//     "category": "place",
//     "type": "house",
//     "place_rank": 30,
//     "importance": 7.500038147550191e-05,
//     "addresstype": "place",
//     "name": "",
//     "display_name": "25, עזה, יפו, תל־אביב–יפו, נפת תל אביב, מחוז תל אביב, 6811156, ישראל",
//     "boundingbox": [
//     "32.0468730",
//     "32.0469730",
//     "34.7593960",
//     "34.7594960"
//         ]
// }
// ]