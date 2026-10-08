using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using TravelWorkspace.API.Data;
using TravelWorkspace.API.Models;
using TravelWorkspace.API.Models.DTOs;
using BCrypt.Net;
using Google.Apis.Auth;

namespace TravelWorkspace.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public AuthService(AppDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        public async Task<AuthResponseDto?> RegisterAsync(RegisterDto request)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                return null;

            var user = new User
            {
                Email = request.Email,
                FullName = request.FullName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                ConfirmationToken = Guid.NewGuid().ToString(),
                IsEmailConfirmed = false
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Gửi email chào mừng/xác thực
            try
            {
                var clientUrl = _configuration["ClientUrl"] ?? "http://localhost:5173";
                var encodedEmail = Uri.EscapeDataString(user.Email);
                var encodedToken = Uri.EscapeDataString(user.ConfirmationToken ?? "");
                var confirmationLink = $"{clientUrl}/confirm-email?email={encodedEmail}&token={encodedToken}";
                var subject = "Xác nhận đăng ký - Travel Workspace";
                var body = $@"
                    <h2>Chào {user.FullName},</h2>
                    <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Travel Workspace</strong>!</p>
                    <p>Vui lòng nhấn vào đường dẫn bên dưới để xác nhận email của bạn:</p>
                    <p><a href='{confirmationLink}'>Xác nhận Email</a></p>
                    <br/>
                    <p>Trân trọng,<br/>Đội ngũ Travel Workspace</p>
                ";
                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LỖI GỬI EMAIL XÁC NHẬN] Gửi tới {user.Email} thất bại: {ex.Message}");
                // Vẫn tiếp tục luồng vì đã đăng ký thành công
            }

            return new AuthResponseDto
            {
                Token = GenerateJwtToken(user),
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                AvatarUrl = user.AvatarUrl
            };
        }

        public async Task<AuthResponseDto?> LoginAsync(LoginDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return null;
            
            if (!user.IsActive)
                throw new UnauthorizedAccessException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.");

            if (!user.IsEmailConfirmed)
                throw new UnauthorizedAccessException("Vui lòng kiểm tra email và xác nhận tài khoản trước khi đăng nhập.");

            return new AuthResponseDto
            {
                Token = GenerateJwtToken(user),
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                AvatarUrl = user.AvatarUrl
            };
        }

        public async Task<AuthResponseDto?> GoogleLoginAsync(GoogleLoginDto request)
        {
            try
            {
                var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken);
                
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);
                if (user == null)
                {
                    user = new User
                    {
                        Email = payload.Email,
                        FullName = payload.Name ?? payload.Email,
                        PasswordHash = "" 
                    };
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                }

                return new AuthResponseDto
                {
                    Token = GenerateJwtToken(user),
                    Email = user.Email,
                    FullName = user.FullName,
                    Role = user.Role,
                    AvatarUrl = user.AvatarUrl
                };
            }
            catch
            {
                return null;
            }
        }

        public async Task<bool> ConfirmEmailAsync(string email, string token)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                return false;

            if (user.IsEmailConfirmed)
                return true;

            if (user.ConfirmationToken != token)
                return false;

            user.IsEmailConfirmed = true;
            user.ConfirmationToken = null;
            await _context.SaveChangesAsync();
            return true;
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var jwtKey = _configuration.GetSection("JwtSettings:Key").Value;
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException("JWT Key is missing in configuration.");
            }

            var issuer = _configuration.GetSection("JwtSettings:Issuer").Value;
            var audience = _configuration.GetSection("JwtSettings:Audience").Value;
            var expireDays = int.TryParse(_configuration.GetSection("JwtSettings:ExpireDays").Value, out var days) ? days : 7;

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);
            
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(expireDays),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = creds
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }
    }
}
