using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelWorkspace.API.Data;
using TravelWorkspace.API.Models;
using TravelWorkspace.API.Models.DTOs;
using TravelWorkspace.API.Services;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/trips/{tripId}/photos")]
    [Authorize]
    public class PhotoController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly ILogger<PhotoController> _logger;

        public PhotoController(
            AppDbContext context, 
            ICloudinaryService cloudinaryService,
            ILogger<PhotoController> logger)
        {
            _context = context;
            _cloudinaryService = cloudinaryService;
            _logger = logger;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        private async Task<bool> HasTripAccess(int tripId, int userId)
        {
            return await _context.Trips.AnyAsync(t => 
                t.Id == tripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId)));
        }

        /// <summary>
        /// Lấy danh sách ảnh trong Kho ảnh chung của chuyến đi, sắp xếp mới nhất lên đầu
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TripPhotoDto>>> GetTripPhotos(int tripId)
        {
            var userId = GetUserId();
            if (!await HasTripAccess(tripId, userId))
            {
                return Forbid("Bạn không có quyền truy cập kho ảnh của chuyến đi này.");
            }

            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null) return NotFound("Không tìm thấy chuyến đi.");

            var photos = await _context.TripPhotos
                .Include(p => p.UploadedBy)
                .Where(p => p.TripId == tripId)
                .OrderByDescending(p => p.UploadedAt)
                .Select(p => new TripPhotoDto
                {
                    Id = p.Id,
                    TripId = p.TripId,
                    UploadedById = p.UploadedById,
                    UploadedByName = p.UploadedBy.FullName,
                    UploadedByAvatar = p.UploadedBy.AvatarUrl,
                    PhotoUrl = p.PhotoUrl,
                    PublicId = p.PublicId,
                    Caption = p.Caption,
                    UploadedAt = p.UploadedAt,
                    CanDelete = p.UploadedById == userId || trip.OwnerId == userId
                })
                .ToListAsync();

            return Ok(photos);
        }

        /// <summary>
        /// Tải lên nhiều ảnh cùng lúc vào Kho ảnh chung qua Cloudinary
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<IEnumerable<TripPhotoDto>>> UploadPhotos(int tripId, [FromForm] List<IFormFile> files, [FromForm] string? caption = null)
        {
            var userId = GetUserId();
            if (!await HasTripAccess(tripId, userId))
            {
                return Forbid("Bạn không có quyền tải ảnh lên chuyến đi này.");
            }

            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null) return NotFound("Không tìm thấy chuyến đi.");

            if (files == null || files.Count == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn ít nhất một hình ảnh để tải lên." });
            }

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic" };
            var uploadedPhotos = new List<TripPhoto>();
            var user = await _context.Users.FindAsync(userId);

            foreach (var file in files)
            {
                if (file.Length == 0) continue;

                if (file.Length > 15 * 1024 * 1024)
                {
                    _logger.LogWarning("File {FileName} exceeds 15MB limit, skipped.", file.FileName);
                    continue;
                }

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(ext))
                {
                    _logger.LogWarning("File {FileName} has invalid extension {Ext}, skipped.", file.FileName, ext);
                    continue;
                }

                // Tải ảnh lên Cloudinary
                var uploadResult = await _cloudinaryService.UploadPhotoAsync(file, $"travelworkspace/trips/{tripId}");
                if (uploadResult != null && !string.IsNullOrEmpty(uploadResult.PhotoUrl))
                {
                    var tripPhoto = new TripPhoto
                    {
                        TripId = tripId,
                        UploadedById = userId,
                        PhotoUrl = uploadResult.PhotoUrl,
                        PublicId = uploadResult.PublicId,
                        Caption = caption,
                        UploadedAt = DateTime.UtcNow
                    };

                    _context.TripPhotos.Add(tripPhoto);
                    uploadedPhotos.Add(tripPhoto);
                }
            }

            if (uploadedPhotos.Count == 0)
            {
                return BadRequest(new { message = "Không có hình ảnh nào được tải lên thành công. Vui lòng kiểm tra định dạng và dung lượng ảnh (< 15MB)." });
            }

            await _context.SaveChangesAsync();

            var resultDtos = uploadedPhotos.Select(p => new TripPhotoDto
            {
                Id = p.Id,
                TripId = p.TripId,
                UploadedById = p.UploadedById,
                UploadedByName = user?.FullName ?? "Thành viên",
                UploadedByAvatar = user?.AvatarUrl,
                PhotoUrl = p.PhotoUrl,
                PublicId = p.PublicId,
                Caption = p.Caption,
                UploadedAt = p.UploadedAt,
                CanDelete = true
            }).ToList();

            return Ok(resultDtos);
        }

        /// <summary>
        /// Xóa ảnh khỏi kho ảnh và xóa trên Cloudinary (Chỉ uploader hoặc chủ chuyến đi được phép)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePhoto(int tripId, int id)
        {
            var userId = GetUserId();
            if (!await HasTripAccess(tripId, userId))
            {
                return Forbid("Bạn không có quyền truy cập chuyến đi này.");
            }

            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null) return NotFound("Không tìm thấy chuyến đi.");

            var photo = await _context.TripPhotos.FirstOrDefaultAsync(p => p.Id == id && p.TripId == tripId);
            if (photo == null) return NotFound(new { message = "Không tìm thấy hình ảnh." });

            // Quyền xóa: Người upload hoặc Chủ chuyến đi (Trip Owner)
            if (photo.UploadedById != userId && trip.OwnerId != userId)
            {
                return Forbid("Chỉ người tải lên hoặc Trưởng nhóm mới có quyền xóa bức ảnh này.");
            }

            // Xóa file trên Cloudinary
            if (!string.IsNullOrEmpty(photo.PublicId))
            {
                await _cloudinaryService.DeletePhotoAsync(photo.PublicId);
            }

            _context.TripPhotos.Remove(photo);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
