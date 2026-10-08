using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TravelWorkspace.API.Data;
using Microsoft.EntityFrameworkCore;
using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/users")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public UserController(AppDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        [HttpPost("upload-avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn một tệp ảnh." });
            }

            // Kiểm tra dung lượng < 5MB (5 * 1024 * 1024 bytes)
            const long maxFileSize = 5 * 1024 * 1024;
            if (file.Length > maxFileSize)
            {
                return BadRequest(new { message = "Dung lượng tệp không được vượt quá 5MB." });
            }

            // Kiểm tra định dạng hợp lệ (.jpg, .jpeg, .png)
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Chỉ chấp nhận các định dạng ảnh: .jpg, .jpeg, .png." });
            }

            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Người dùng không tồn tại." });
            }

            try
            {
                // Xác định đường dẫn thư mục wwwroot/uploads/avatars
                var webRootPath = _environment.WebRootPath;
                if (string.IsNullOrEmpty(webRootPath))
                {
                    webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                }

                var avatarsFolder = Path.Combine(webRootPath, "uploads", "avatars");
                if (!Directory.Exists(avatarsFolder))
                {
                    Directory.CreateDirectory(avatarsFolder);
                }

                // Sinh tên file ngẫu nhiên với GUID
                var uniqueFileName = $"{Guid.NewGuid()}{extension}";
                var fullFilePath = Path.Combine(avatarsFolder, uniqueFileName);

                // Lưu file vật lý vào thư mục
                using (var stream = new FileStream(fullFilePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Cập nhật AvatarUrl trong Database thành đường dẫn tương đối
                var relativeUrl = $"/uploads/avatars/{uniqueFileName}";
                user.AvatarUrl = relativeUrl;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    avatarUrl = relativeUrl,
                    message = "Tải ảnh đại diện thành công."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = $"Có lỗi xảy ra khi lưu tệp ảnh: {ex.Message}"
                });
            }
        }

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

        /// <summary>
        /// Lấy danh sách các chuyến đi mà user đang có trạng thái lời mời "Pending"
        /// GET /api/users/me/invitations
        /// </summary>
        [HttpGet("me/invitations")]
        public async Task<ActionResult<IEnumerable<UserInvitationDto>>> GetMyPendingInvitations()
        {
            var userId = GetUserId();
            var invitations = await _context.TripMembers
                .Include(tm => tm.Trip)
                    .ThenInclude(t => t.Owner)
                .Where(tm => tm.UserId == userId && tm.Status == "Pending")
                .OrderByDescending(tm => tm.JoinedAt)
                .Select(tm => new UserInvitationDto
                {
                    TripMemberId = tm.Id,
                    TripId = tm.TripId,
                    TripTitle = tm.Trip.Title,
                    Destination = tm.Trip.Destination,
                    StartDate = tm.Trip.StartDate,
                    EndDate = tm.Trip.EndDate,
                    InviterName = tm.Trip.Owner != null ? tm.Trip.Owner.FullName : "Chủ chuyến đi",
                    InviterEmail = tm.Trip.Owner != null ? tm.Trip.Owner.Email : "",
                    InviterAvatarUrl = tm.Trip.Owner != null ? tm.Trip.Owner.AvatarUrl : "",
                    Role = tm.Role,
                    Status = tm.Status,
                    InvitedAt = tm.JoinedAt
                })
                .ToListAsync();

            return Ok(invitations);
        }
    }
}
