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

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITripService, TripService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();

builder.Services.AddHttpClient();
builder.Services.AddScoped<IGeminiService, GeminiService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();

builder.Services.Configure<TravelWorkspace.API.Models.SmtpSettings>(builder.Configuration.GetSection("SmtpSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
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
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var connStr = config.GetConnectionString("DefaultConnection");

    // Chỉ chạy Migrate nếu không phải LocalDB trên Linux (tránh lỗi Status 139 do Trusted_Connection không hỗ trợ trên Linux)
    bool isWindows = System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows);
    bool isLocalDb = !string.IsNullOrEmpty(connStr) && (connStr.Contains("(localdb)", StringComparison.OrdinalIgnoreCase) || connStr.Contains("Trusted_Connection=True", StringComparison.OrdinalIgnoreCase));

    if (isWindows || !isLocalDb)
    {
        try
        {
            var context = scope.ServiceProvider.GetRequiredService<TravelWorkspace.API.Data.AppDbContext>();
            context.Database.Migrate();

            // Khởi tạo Admin
            if (!context.Users.Any(u => u.Email == "admin@travelworkspace.com"))
            {
                context.Users.Add(new TravelWorkspace.API.Models.User
                {
                    Email = "admin@travelworkspace.com",
                    FullName = "Administrator",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    Role = "Admin",
                    CreatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
            }

            // Tự động chèn 3 chuyến đi mẫu (Template Trips) chất lượng cao
            await TravelWorkspace.API.Data.TripSeeder.SeedTripsAsync(context);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WARNING] Database Migration skipped: {ex.Message}");
        }
    }
    else
    {
        Console.WriteLine("[INFO] Bỏ qua Database.Migrate trên Linux do chuỗi kết nối LocalDB Windows.");
    }
}

app.UseCors();

app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
