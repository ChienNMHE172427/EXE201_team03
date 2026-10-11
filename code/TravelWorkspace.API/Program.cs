using Microsoft.EntityFrameworkCore;
using TravelWorkspace.API.Data;
using TravelWorkspace.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddOpenApi();

string ConvertPostgresUrlToNpgsql(string url)
{
    if (string.IsNullOrWhiteSpace(url)) return url;
    if (!url.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) && 
        !url.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
        return url;

    try
    {
        var uri = new Uri(url);
        var userInfo = uri.UserInfo.Split(':');
        var user = userInfo.Length > 0 ? userInfo[0] : "";
        var password = userInfo.Length > 1 ? userInfo[1] : "";
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 5432;
        var database = uri.AbsolutePath.TrimStart('/');

        return $"Host={host};Port={port};Database={database};Username={user};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
    }
    catch
    {
        return url;
    }
}

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? builder.Configuration["DATABASE_URL"];

bool isPostgres = !string.IsNullOrEmpty(connectionString) && 
    (connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) || 
     connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) || 
     connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase));

if (isPostgres)
{
    var npgsqlConnection = ConvertPostgresUrlToNpgsql(connectionString!);
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(npgsqlConnection));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlServer(connectionString ?? "Server=(localdb)\\mssqllocaldb;Database=TravelWorkspaceDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"));
}

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITripService, TripService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();

builder.Services.AddHttpClient();
builder.Services.AddScoped<IGeminiService, GeminiService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();

builder.Services.Configure<TravelWorkspace.API.Models.SmtpSettings>(builder.Configuration.GetSection("SmtpSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var jwtKey = builder.Configuration.GetSection("JwtSettings:Key").Value;
if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("JWT Key is missing in configuration.");
}

var jwtIssuer = builder.Configuration.GetSection("JwtSettings:Issuer").Value;
var jwtAudience = builder.Configuration.GetSection("JwtSettings:Audience").Value;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = !string.IsNullOrWhiteSpace(jwtIssuer),
            ValidIssuer = jwtIssuer,
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<TravelWorkspace.API.Data.AppDbContext>();
        if (context.Database.IsNpgsql())
        {
            // Tự động tạo toàn bộ bảng trong PostgreSQL nếu chưa có
            await context.Database.EnsureCreatedAsync();
        }
        else
        {
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var connStr = config.GetConnectionString("DefaultConnection");
            bool isWindows = System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows);
            bool isLocalDb = !string.IsNullOrEmpty(connStr) && (connStr.Contains("(localdb)", StringComparison.OrdinalIgnoreCase) || connStr.Contains("Trusted_Connection=True", StringComparison.OrdinalIgnoreCase));

            if (isWindows || !isLocalDb)
            {
                context.Database.Migrate();
            }
        }

        // Khởi tạo Admin
        var admin = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@travelworkspace.com");
        if (admin == null)
        {
            context.Users.Add(new TravelWorkspace.API.Models.User
            {
                Email = "admin@travelworkspace.com",
                FullName = "Administrator",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                Role = "Admin",
                CreatedAt = DateTime.UtcNow,
                IsEmailConfirmed = true
            });
            await context.SaveChangesAsync();
        }

        // Tự động chèn 3 chuyến đi mẫu (Template Trips) chất lượng cao
        await TravelWorkspace.API.Data.TripSeeder.SeedTripsAsync(context);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[WARNING] Database setup / seeding: {ex.Message}");
    }
}

app.UseCors();

app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
