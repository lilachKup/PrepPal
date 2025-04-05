using MarketProductService.Repositories;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

//builder.Configuration
//       .SetBasePath(Directory.GetCurrentDirectory())
//       .AddUserSecrets<Program>()
//       .AddEnvironmentVariables();

// Add services to the container.
builder.Services.AddSingleton<IProductRepository, MockProductRepository>();

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
