using System.Data.Common;
using Amazon.Lambda.Core;
using ClientChatAPI.Utils;
using ClientChatLambda.models;
using Npgsql;

namespace ClientChatAPI.Repositories;

public class ProductsPgRepository : IReadRepository<(string store_id, int product_id), Product>
{
    private readonly string _connectionString;
    private readonly string _tableName;
    
    
    public ILambdaLogger? Logger { get; set; }


    public ProductsPgRepository(string connectionString, string tableName)
    {
        _connectionString = connectionString;
        _tableName = tableName;
        
        if (string.IsNullOrEmpty(_connectionString))
        {
            throw new ArgumentException("Connection string cannot be null or empty", nameof(connectionString));
        }
        if (string.IsNullOrEmpty(_tableName))
        {
            throw new ArgumentException("Table name cannot be null or empty", nameof(tableName));
        }
    }


    public async Task<Product> GetByPkAsync((string store_id, int product_id) pk)
    {
        const string whereClause = "product_store.product_id = @product_id AND product_store.store_id = @store_id AND products.id = @product_id";
        const string tableName = "product_store, products"; // Ensure the table name is set correctly
        string query = $"SELECT * FROM {tableName} WHERE {whereClause}";
        
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        
        await using var command = new NpgsqlCommand(query, connection);
        command.Parameters.AddWithValue("product_id", pk.product_id);
        command.Parameters.AddWithValue("store_id", pk.store_id);
        
        await using var reader = await command.ExecuteReaderAsync();
        if (!reader.HasRows)
        {
            throw new Exception($"Product with id ({pk.store_id}, {pk.product_id}) not found");
        }
        
        // Read the first row
        if (await reader.ReadAsync())
        {
            var product = new Product
            {
                Store_id = reader.GetString(0),
                Id = reader.GetInt64(1),
                Name = reader.GetString(2),
                Price = reader.GetDecimal(3).ToString(),
                Quantity = reader.GetInt32(4),
                Description = reader.GetString(6),
                Category = reader.GetString(9),
                Tag = reader.GetString(10),
                Brand = reader.GetString(11),
            };
            return product;
        }
        // If we reach here, it means the product was not found
        throw new Exception($"Product with id ({pk.store_id}, {pk.product_id}) not found");
    }

    public Task<List<Product>> GetAllAsync(int limit = -1)
    {
        throw new NotImplementedException();
    }

    public async Task<List<Product>> GetWhereAsync(Predicate<Product> predicate, int limit = -1)
    {
        const string whereClause = "product_store.product_id = products.id";
        const string tableName = "product_store, products";
        string query = $"SELECT * FROM {tableName} WHERE {whereClause}";
        
        if (limit > 0)
        {
            query += $" LIMIT {limit}";
        }
        
        List<Product> products = new List<Product>();
        
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync();
        
        if (!reader.HasRows)
        {
            Logger?.LogInformation("No products found in the database.");
            return products;
        }
        while (await reader.ReadAsync())
        {
            var product = new Product
            {
                Store_id = reader.GetString(0),
                Id = reader.GetInt64(1),
                Name = reader.GetString(2),
                Price = reader.GetDecimal(3).ToString(),
                Quantity = reader.GetInt32(4),
                Description = reader.GetString(6),
                Category = reader.GetString(9),
                Tag = reader.GetString(10),
                Brand = reader.GetString(11),
            };
            
            if (predicate(product))
            {
                products.Add(product);
            }
        }
        
        if (products.Count == 0)
        {
            Logger?.LogInformation("No products found matching the predicate.");
        }
        else
        {
            Logger?.LogInformation($"Found {products.Count} products matching the predicate.");
        }
        
        return products;
    }

    public Task<List<Product>> GetQueryAsync(string query)
    {
        throw new NotImplementedException();
    }
}
