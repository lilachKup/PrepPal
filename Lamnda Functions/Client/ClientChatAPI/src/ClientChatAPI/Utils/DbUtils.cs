using Npgsql.Schema;

namespace ClientChatAPI.Utils;

public static class DbUtils
{
    public static void PrintSchema(IReadOnlyCollection<NpgsqlDbColumn> schema)
    {
        foreach (var column in schema)
        {
            Console.WriteLine($"Column: {column.ColumnName}, Type: {column.DataTypeName}, Ordinal: {column.ColumnOrdinal}");
        }
    }
    
}