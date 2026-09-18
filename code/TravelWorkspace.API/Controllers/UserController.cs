using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TravelWorkspace.API.Data;
using Microsoft.EntityFrameworkCore;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UserController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        [HttpGet("profile")]
        public async Task<ActionResult> GetProfile()
        {
            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            return Ok(new
            {
                user.Id,
                user.Email,
                user.FullName,
                user.Role,
                user.AvatarUrl,
                user.CreatedAt
            });
        }

        [HttpPut("profile")]
        public async Task<ActionResult> UpdateProfile(TravelWorkspace.API.Models.DTOs.UpdateProfileDto request)
        {
            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            user.FullName = request.FullName;
            if (request.AvatarUrl != null) 
            {
                user.AvatarUrl = request.AvatarUrl;
            }
            await _context.SaveChangesAsync();

            return Ok(new
            {
                user.Id,
                user.Email,
                user.FullName,
                user.Role,
                user.AvatarUrl,
                user.CreatedAt
            });
        }

        [HttpPost("change-password")]
        public async Task<ActionResult> ChangePassword(TravelWorkspace.API.Models.DTOs.ChangePasswordDto request)
        {
            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                return BadRequest("Tài khoản này được đăng nhập qua Google, không có mật khẩu để thay đổi.");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest("Mật khẩu hiện tại không chính xác.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công." });
        }
    }
}
