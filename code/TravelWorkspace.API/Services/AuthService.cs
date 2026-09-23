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
                IsEmailConfirmed = true // Tạm thời bỏ qua xác thực email để dễ test
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Gửi email chào mừng/xác thực
            try
            {
                var confirmationLink = $"http://localhost:5173/confirm-email?email={user.Email}&token={user.ConfirmationToken}";
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
                Console.WriteLine($"Không thể gửi email: {ex.Message}");
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

            // Using a dummy token for local dev. In production, this should be in secure settings.
            var tokenKey = _configuration.GetSection("AppSettings:Token").Value ?? "this is my custom Secret key for authentication very secure indeed yes";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);
            
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = creds
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }
    }
}
