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
    [Route("api/trips/{tripId}/packing")]
    [Authorize]
    public class PackingController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IGeminiService _geminiService;

        public PackingController(AppDbContext context, IGeminiService geminiService)
        {
            _context = context;
            _geminiService = geminiService;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        private async Task<bool> HasTripAccess(int tripId, int userId)
        {
            return await _context.Trips.AnyAsync(t => t.Id == tripId && 
                (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId && m.Status == "Accepted")));
        }

        private async Task<bool> IsValidTripMember(int tripId, int memberUserId)
        {
            return await _context.Trips.AnyAsync(t => t.Id == tripId && 
                (t.OwnerId == memberUserId || t.Members.Any(m => m.UserId == memberUserId && m.Status == "Accepted")));
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PackingItemDto>>> GetPackingList(int tripId)
        {
            var userId = GetUserId();
            if (!await HasTripAccess(tripId, userId)) return Forbid();

            var items = await _context.PackingItems
                .Include(p => p.Assignee)
                .Where(p => p.TripId == tripId)
                .OrderBy(p => p.Category)
                .ThenBy(p => p.CreatedAt)
                .Select(p => new PackingItemDto
                {
                    Id = p.Id,
                    TripId = p.TripId,
                    ItemName = p.ItemName,
                    Category = p.Category,
                    Quantity = p.Quantity,
                    IsShared = p.IsShared,
                    IsChecked = p.IsChecked,
                    AssigneeId = p.AssigneeId,
                    AssigneeName = p.Assignee != null ? p.Assignee.FullName : null,
                    AssigneeAvatarUrl = p.Assignee != null ? p.Assignee.AvatarUrl : null,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost]
        public async Task<ActionResult<PackingItemDto>> AddPackingItem(int tripId, [FromBody] CreatePackingItemDto request)
        {
            var userId = GetUserId();
            if (!await HasTripAccess(tripId, userId)) return Forbid();

            if (string.IsNullOrWhiteSpace(request.ItemName))
            {
                return BadRequest(new { message = "Tên món đồ không được để trống." });
            }

            if (request.ItemName.Trim().Length > 200)
            {
                return BadRequest(new { message = "Tên món đồ không được vượt quá 200 ký tự." });
            }

            if (request.AssigneeId.HasValue)
            {
                if (!await IsValidTripMember(tripId, request.AssigneeId.Value))
                {
                    return BadRequest(new { message = "Người được phân công phải là thành viên chính thức của chuyến đi." });
                }
            }

            var item = new PackingItem
            {
                TripId = tripId,
                ItemName = request.ItemName.Trim(),
                Category = string.IsNullOrWhiteSpace(request.Category) ? "Vật dụng khác" : request.Category.Trim(),
                Quantity = request.Quantity > 0 ? request.Quantity : 1,
                IsShared = request.IsShared,
                IsChecked = false,
                AssigneeId = request.AssigneeId,
                CreatedAt = DateTime.UtcNow
            };

            _context.PackingItems.Add(item);
            await _context.SaveChangesAsync();

            var user = item.AssigneeId.HasValue ? await _context.Users.FindAsync(item.AssigneeId.Value) : null;

            return Ok(new PackingItemDto
            {
                Id = item.Id,
                TripId = item.TripId,
                ItemName = item.ItemName,
                Category = item.Category,
                Quantity = item.Quantity,
                IsShared = item.IsShared,
                IsChecked = item.IsChecked,
                AssigneeId = item.AssigneeId,
                AssigneeName = user?.FullName,
                AssigneeAvatarUrl = user?.AvatarUrl,
                CreatedAt = item.CreatedAt
            });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PackingItemDto>> UpdatePackingItem(int tripId, int id, [FromBody] UpdatePackingItemDto request)
        {
            var userId = GetUserId();
            if (!await HasTripAccess(tripId, userId)) return Forbid();

            var item = await _context.PackingItems
                .Include(p => p.Assignee)
                .FirstOrDefaultAsync(p => p.Id == id && p.TripId == tripId);

            if (item == null) return NotFound(new { message = "Món đồ không tồn tại." });

            if (string.IsNullOrWhiteSpace(request.ItemName))
            {
                return BadRequest(new { message = "Tên món đồ không được để trống." });
            }

            if (request.ItemName.Trim().Length > 200)
            {
                return BadRequest(new { message = "Tên món đồ không được vượt quá 200 ký tự." });
            }

            if (request.AssigneeId.HasValue)
            {
                if (!await IsValidTripMember(tripId, request.AssigneeId.Value))
                {
                    return BadRequest(new { message = "Người được phân công phải là thành viên chính thức của chuyến đi." });
                }
            }

            item.ItemName = request.ItemName.Trim();
            item.Category = string.IsNullOrWhiteSpace(request.Category) ? "Vật dụng khác" : request.Category.Trim();
            item.Quantity = request.Quantity > 0 ? request.Quantity : 1;
            item.IsShared = request.IsShared;
            item.AssigneeId = request.AssigneeId;
            if (request.IsChecked.HasValue)
            {
                item.IsChecked = request.IsChecked.Value;
            }

            await _context.SaveChangesAsync();

            var user = item.AssigneeId.HasValue ? await _context.Users.FindAsync(item.AssigneeId.Value) : null;

            return Ok(new PackingItemDto
            {
                Id = item.Id,
                TripId = item.TripId,
                ItemName = item.ItemName,
                Category = item.Category,
                Quantity = item.Quantity,
                IsShared = item.IsShared,
                IsChecked = item.IsChecked,
                AssigneeId = item.AssigneeId,
                AssigneeName = user?.FullName,
                AssigneeAvatarUrl = user?.AvatarUrl,
                CreatedAt = item.CreatedAt
            });
        }

        [HttpPut("{id}/toggle")]
        public async Task<ActionResult<PackingItemDto>> ToggleCheck(int tripId, int id)
        {
            var userId = GetUserId();
            if (!await HasTripAccess(tripId, userId)) return Forbid();

            var item = await _context.PackingItems
                .Include(p => p.Assignee)
                .FirstOrDefaultAsync(p => p.Id == id && p.TripId == tripId);

            if (item == null) return NotFound(new { message = "Món đồ không tồn tại." });

            item.IsChecked = !item.IsChecked;
            await _context.SaveChangesAsync();

            return Ok(new PackingItemDto
            {
                Id = item.Id,
                TripId = item.TripId,
                ItemName = item.ItemName,
                Category = item.Category,
                Quantity = item.Quantity,
                IsShared = item.IsShared,
                IsChecked = item.IsChecked,
                AssigneeId = item.AssigneeId,
                AssigneeName = item.Assignee?.FullName,
                AssigneeAvatarUrl = item.Assignee?.AvatarUrl,
                CreatedAt = item.CreatedAt
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePackingItem(int tripId, int id)
        {
            var userId = GetUserId();
            if (!await HasTripAccess(tripId, userId)) return Forbid();

            var item = await _context.PackingItems
                .FirstOrDefaultAsync(p => p.Id == id && p.TripId == tripId);

            if (item == null) return NotFound(new { message = "Món đồ không tồn tại." });

            _context.PackingItems.Remove(item);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("suggest")]
        public async Task<ActionResult<IEnumerable<PackingItemDto>>> SuggestWithAi(int tripId)
        {
            var userId = GetUserId();
            if (!await HasTripAccess(tripId, userId)) return Forbid();

            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null) return NotFound(new { message = "Chuyến đi không tồn tại." });

            var userApiKey = Request.Headers["X-Gemini-API-Key"].FirstOrDefault();
            int days = Math.Max(1, (int)(trip.EndDate - trip.StartDate).TotalDays + 1);

            // Gọi Gemini để phân tích điểm đến, thời tiết, thời gian và đề xuất danh mục hành lý
            var suggestions = await _geminiService.GeneratePackingListAsync(
                trip.Destination,
                days,
                trip.StartDate,
                trip.Preferences,
                userApiKey
            );

            // Lấy danh sách tên các món đồ đã có sẵn trong chuyến đi để tránh trùng
            var existingItems = await _context.PackingItems
                .Where(p => p.TripId == tripId)
                .Select(p => p.ItemName.ToLower())
                .ToListAsync();

            var newItems = new List<PackingItem>();

            foreach (var sug in suggestions)
            {
                var trimmedName = sug.ItemName?.Trim();
                if (!string.IsNullOrEmpty(trimmedName) && !existingItems.Contains(trimmedName.ToLower()))
                {
                    newItems.Add(new PackingItem
                    {
                        TripId = tripId,
                        ItemName = trimmedName,
                        Category = string.IsNullOrWhiteSpace(sug.Category) ? "Vật dụng khác" : sug.Category.Trim(),
                        Quantity = sug.Quantity > 0 ? sug.Quantity : 1,
                        IsShared = sug.IsShared,
                        IsChecked = false,
                        CreatedAt = DateTime.UtcNow
                    });
                    existingItems.Add(trimmedName.ToLower());
                }
            }

            if (newItems.Count > 0)
            {
                _context.PackingItems.AddRange(newItems);
                await _context.SaveChangesAsync();
            }

            // Trả về toàn bộ danh sách đồ đạc của chuyến đi
            return await GetPackingList(tripId);
        }
    }
}
