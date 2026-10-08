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
    [Route("api/[controller]")]
    [Authorize]
    public class ItineraryController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IGeminiService _geminiService;

        public ItineraryController(AppDbContext context, IGeminiService geminiService)
        {
            _context = context;
            _geminiService = geminiService;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        private async Task<bool> IsUserInTrip(int tripId, int userId)
        {
            var trip = await _context.Trips.Include(t => t.Members).FirstOrDefaultAsync(t => t.Id == tripId);
            if (trip == null) return false;
            return trip.OwnerId == userId || trip.Members.Any(m => m.UserId == userId);
        }

        [HttpGet("{tripId}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<ItineraryItemDto>>> GetTripItinerary(int tripId)
        {
            var trip = await _context.Trips.Include(t => t.Members).FirstOrDefaultAsync(t => t.Id == tripId);
            if (trip == null) return NotFound("Không tìm thấy chuyến đi.");

            var userId = GetUserId();
            bool isMember = userId > 0 && (trip.OwnerId == userId || trip.Members.Any(m => m.UserId == userId));
            if (!isMember && !trip.IsPublic)
            {
                return Forbid("Bạn không có quyền truy cập chuyến đi này.");
            }

            var items = await _context.ItineraryItems
                .Where(i => i.TripId == tripId)
                .OrderBy(i => i.StartTime)
                .Select(i => new ItineraryItemDto
                {
                    Id = i.Id,
                    TripId = i.TripId,
                    Title = i.Title,
                    Location = i.Location,
                    Destination = i.Destination,
                    Notes = i.Notes,
                    StartTime = i.StartTime,
                    EndTime = i.EndTime,
                    Transport = i.Transport,
                    Assignee = i.Assignee,
                    Status = i.Status,
                    CreatedAt = i.CreatedAt,
                    IsPlanB = i.IsPlanB,
                    ReplacesItemId = i.ReplacesItemId
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("{tripId}")]
        [HttpPost("{tripId}/items")]
        public async Task<ActionResult<ItineraryItemDto>> CreateItineraryItem(int tripId, CreateItineraryItemDto request)
        {
            var userId = GetUserId();
            if (!await IsUserInTrip(tripId, userId)) return Forbid();

            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null) return NotFound();

            var item = new ItineraryItem
            {
                TripId = tripId,
                Title = request.Title,
                Location = request.Location,
                Destination = request.Destination,
                Notes = request.Notes,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                Transport = request.Transport,
                Assignee = request.Assignee,
                Status = request.Status ?? "Chưa bắt đầu"
            };

            _context.ItineraryItems.Add(item);
            await _context.SaveChangesAsync();

            var dto = new ItineraryItemDto
            {
                Id = item.Id,
                TripId = item.TripId,
                Title = item.Title,
                Location = item.Location,
                Destination = item.Destination,
                Notes = item.Notes,
                StartTime = item.StartTime,
                EndTime = item.EndTime,
                Transport = item.Transport,
                Assignee = item.Assignee,
                Status = item.Status,
                CreatedAt = item.CreatedAt
            };

            return CreatedAtAction(nameof(GetTripItinerary), new { tripId = item.TripId }, dto);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ItineraryItemDto>> UpdateItineraryItem(int id, UpdateItineraryItemDto request)
        {
            var userId = GetUserId();
            
            var item = await _context.ItineraryItems.FindAsync(id);
            if (item == null) return NotFound();

            if (!await IsUserInTrip(item.TripId, userId)) return Forbid();

            item.Title = request.Title;
            item.Location = request.Location;
            item.Destination = request.Destination;
            item.Notes = request.Notes;
            item.StartTime = request.StartTime;
            item.EndTime = request.EndTime;
            item.Transport = request.Transport;
            item.Assignee = request.Assignee;
            item.Status = request.Status;

            await _context.SaveChangesAsync();

            return Ok(new ItineraryItemDto
            {
                Id = item.Id,
                TripId = item.TripId,
                Title = item.Title,
                Location = item.Location,
                Destination = item.Destination,
                Notes = item.Notes,
                StartTime = item.StartTime,
                EndTime = item.EndTime,
                Transport = item.Transport,
                Assignee = item.Assignee,
                Status = item.Status,
                CreatedAt = item.CreatedAt
            });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteItineraryItem(int id)
        {
            var userId = GetUserId();
            
            var item = await _context.ItineraryItems.FindAsync(id);
            if (item == null) return NotFound();

            if (!await IsUserInTrip(item.TripId, userId)) return Forbid();

            _context.ItineraryItems.Remove(item);
            await _context.SaveChangesAsync();

            return NoContent();
        }

    public class GenerateAiItineraryRequest
    {
        public bool Overwrite { get; set; } = false;
    }

    [HttpPost("GenerateAi/{tripId}")]
    public async Task<ActionResult<IEnumerable<ItineraryItemDto>>> GenerateAiItinerary(int tripId, [FromBody] GenerateAiItineraryRequest? request = null)
    {
        var userId = GetUserId();
        if (!await IsUserInTrip(tripId, userId)) return Forbid();

        var trip = await _context.Trips.FindAsync(tripId);
        if (trip == null) return NotFound();

        bool overwrite = request?.Overwrite ?? false;

        // Đếm xem tripId này đã có ItineraryItems nào chưa
        var existingItemsCount = await _context.ItineraryItems.CountAsync(i => i.TripId == tripId);

        // Nếu ĐÃ CÓ dữ liệu cũ và cờ Overwrite == false, TUYỆT ĐỐI KHÔNG XÓA. Return 409 Conflict.
        if (existingItemsCount > 0 && !overwrite)
        {
            return Conflict(new { message = "Chuyến đi đã có lịch trình. Yêu cầu xác nhận ghi đè." });
        }

        var userApiKey = Request.Headers["X-Gemini-API-Key"].FirstOrDefault();

        int days = Math.Max(1, (int)(trip.EndDate - trip.StartDate).TotalDays);
        List<CreateItineraryItemDto> aiItems;
        try
        {
            aiItems = await _geminiService.GenerateItineraryJsonAsync(
                trip.Origin, 
                trip.Destination, 
                days, 
                trip.StartDate, 
                userApiKey, 
                trip.Preferences, 
                trip.Budget, 
                trip.EndDate);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Lỗi khi tạo lịch trình bằng AI: {ex.Message}" });
        }

        // Chỉ xóa dữ liệu cũ khi người dùng đã xác nhận Overwrite == true
        if (existingItemsCount > 0 && overwrite)
        {
            var oldItems = await _context.ItineraryItems.Where(i => i.TripId == tripId).ToListAsync();
            _context.ItineraryItems.RemoveRange(oldItems);
        }

        var newItems = new List<ItineraryItem>();
        foreach (var ai in aiItems)
        {
            newItems.Add(new ItineraryItem
            {
                TripId = tripId,
                Title = ai.Title,
                Location = ai.Location,
                Destination = ai.Destination,
                Notes = ai.Notes,
                StartTime = ai.StartTime,
                EndTime = ai.EndTime,
                Transport = ai.Transport,
                Assignee = ai.Assignee,
                Status = ai.Status
            });
        }

        _context.ItineraryItems.AddRange(newItems);
        await _context.SaveChangesAsync();

            var dtos = newItems.OrderBy(i => i.StartTime).Select(i => new ItineraryItemDto
            {
                Id = i.Id,
                TripId = i.TripId,
                Title = i.Title,
                Location = i.Location,
                Destination = i.Destination,
                Notes = i.Notes,
                StartTime = i.StartTime,
                EndTime = i.EndTime,
                Transport = i.Transport,
                Assignee = i.Assignee,
                Status = i.Status,
                CreatedAt = i.CreatedAt
            }).ToList();

            return Ok(dtos);
        }
        public class ChatAiRequest
        {
            public string Message { get; set; } = string.Empty;
            public List<ChatMessageDto> History { get; set; } = new List<ChatMessageDto>();
        }

        [HttpPost("ChatAi/{tripId}")]
        public async Task<ActionResult> ChatAiItinerary(int tripId, [FromBody] ChatAiRequest request)
        {
            var userId = GetUserId();
            if (!await IsUserInTrip(tripId, userId)) return Forbid();

            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null) return NotFound();

            var currentItems = await _context.ItineraryItems.Where(i => i.TripId == tripId).OrderBy(i => i.StartTime).ToListAsync();

            var userApiKey = Request.Headers["X-Gemini-API-Key"].FirstOrDefault();
            TravelWorkspace.API.Models.DTOs.AiChatResponseDto aiResponse;
            try
            {
                aiResponse = await _geminiService.ChatAndModifyItineraryAsync(request.Message, request.History, currentItems, trip, userApiKey);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Lỗi khi trao đổi với AI: {ex.Message}" });
            }

            if (aiResponse.Items != null && aiResponse.Items.Any())
            {
                _context.ItineraryItems.RemoveRange(currentItems);

                var newItems = aiResponse.Items.Select(ai => new ItineraryItem
                {
                    TripId = tripId,
                    Title = ai.Title,
                    Location = ai.Location,
                    Destination = ai.Destination,
                    Notes = ai.Notes,
                    StartTime = ai.StartTime,
                    EndTime = ai.EndTime,
                    Transport = ai.Transport,
                    Assignee = ai.Assignee,
                    Status = ai.Status
                }).ToList();

                _context.ItineraryItems.AddRange(newItems);
                await _context.SaveChangesAsync();

                var dtos = newItems.OrderBy(i => i.StartTime).Select(i => new ItineraryItemDto
                {
                    Id = i.Id,
                    TripId = i.TripId,
                    Title = i.Title,
                    Location = i.Location,
                    Destination = i.Destination,
                    Notes = i.Notes,
                    StartTime = i.StartTime,
                    EndTime = i.EndTime,
                    Transport = i.Transport,
                    Assignee = i.Assignee,
                    Status = i.Status,
                    CreatedAt = i.CreatedAt
                }).ToList();

                return Ok(new { Reply = aiResponse.Reply, Items = dtos });
            }

            return Ok(new { Reply = aiResponse.Reply, Items = currentItems.Select(i => new ItineraryItemDto
            {
                Id = i.Id, TripId = i.TripId, Title = i.Title, Location = i.Location, Notes = i.Notes, StartTime = i.StartTime, EndTime = i.EndTime, Transport = i.Transport, Assignee = i.Assignee, Status = i.Status, CreatedAt = i.CreatedAt, IsPlanB = i.IsPlanB, ReplacesItemId = i.ReplacesItemId
            }) });
        }

        [HttpPost("/api/trips/{tripId}/itinerary/generate-plan-b")]
        [HttpPost("{tripId}/generate-plan-b")]
        public async Task<ActionResult> GeneratePlanB(int tripId, [FromBody] GeneratePlanBRequest request)
        {
            var userId = GetUserId();
            if (!await IsUserInTrip(tripId, userId)) return Forbid("Bạn không có quyền truy cập chuyến đi này.");

            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null) return NotFound("Không tìm thấy chuyến đi.");

            var targetDate = request.Date.Date;

            // 1. Lấy danh sách lịch trình của ngày hôm đó
            var dayItems = await _context.ItineraryItems
                .Where(i => i.TripId == tripId && i.StartTime.Date == targetDate)
                .OrderBy(i => i.StartTime)
                .ToListAsync();

            if (!dayItems.Any(i => !i.IsPlanB))
            {
                return BadRequest(new { message = $"Chưa có lịch trình hoạt động gốc nào trong ngày {targetDate:dd/MM/yyyy} để tạo Plan B." });
            }

            // 2. Xóa các hoạt động Plan B cũ của ngày này (nếu có) để tạo mới sạch sẽ
            var oldPlanBItems = dayItems.Where(i => i.IsPlanB).ToList();
            if (oldPlanBItems.Any())
            {
                _context.ItineraryItems.RemoveRange(oldPlanBItems);
                await _context.SaveChangesAsync();
            }

            var originalDayItems = dayItems.Where(i => !i.IsPlanB).ToList();

            // 3. Gọi Gemini sinh phương án trong nhà thay thế
            var userApiKey = request.UserApiKey ?? Request.Headers["X-Gemini-API-Key"].FirstOrDefault();
            var suggestions = await _geminiService.GeneratePlanBForDateAsync(trip.Destination, originalDayItems, targetDate, userApiKey);

            if (suggestions == null || !suggestions.Any())
            {
                return BadRequest(new { message = "Không thể tạo phương án dự phòng vào lúc này." });
            }

            // 4. Lưu các hoạt động Plan B mới vào Database với IsPlanB = true và mapping ReplacesItemId
            var newPlanBItems = new List<ItineraryItem>();
            foreach (var s in suggestions)
            {
                var originalItem = originalDayItems.FirstOrDefault(i => i.Id == s.OriginalItemId);
                
                var planBItem = new ItineraryItem
                {
                    TripId = tripId,
                    Title = s.Title,
                    Location = s.Location,
                    Destination = originalItem?.Destination ?? trip.Destination,
                    Notes = s.Notes,
                    StartTime = s.StartTime != default ? s.StartTime : (originalItem?.StartTime ?? targetDate.AddHours(9)),
                    EndTime = s.EndTime != default ? s.EndTime : (originalItem?.EndTime ?? targetDate.AddHours(11)),
                    Transport = s.Transport ?? "Taxi / Grab",
                    Assignee = originalItem?.Assignee ?? "Cả nhóm",
                    Status = "Chưa bắt đầu",
                    IsPlanB = true,
                    ReplacesItemId = s.OriginalItemId,
                    CreatedAt = DateTime.UtcNow
                };

                newPlanBItems.Add(planBItem);
            }

            _context.ItineraryItems.AddRange(newPlanBItems);
            await _context.SaveChangesAsync();

            // 5. Trả về danh sách tất cả các item cập nhật của ngày hôm đó
            var updatedDayItems = await _context.ItineraryItems
                .Where(i => i.TripId == tripId && i.StartTime.Date == targetDate)
                .OrderBy(i => i.StartTime)
                .Select(i => new ItineraryItemDto
                {
                    Id = i.Id,
                    TripId = i.TripId,
                    Title = i.Title,
                    Location = i.Location,
                    Destination = i.Destination,
                    Notes = i.Notes,
                    StartTime = i.StartTime,
                    EndTime = i.EndTime,
                    Transport = i.Transport,
                    Assignee = i.Assignee,
                    Status = i.Status,
                    CreatedAt = i.CreatedAt,
                    IsPlanB = i.IsPlanB,
                    ReplacesItemId = i.ReplacesItemId
                })
                .ToListAsync();

            return Ok(new
            {
                message = $"Đã kích hoạt thành công Phương án dự phòng (Plan B) cho ngày {targetDate:dd/MM/yyyy}.",
                planBItemsCount = newPlanBItems.Count,
                items = updatedDayItems
            });
        }

        /// <summary>
        /// Gợi ý 3 nhà hàng/địa điểm nổi tiếng theo từ khóa quanh vị trí bằng Gemini AI
        /// </summary>
        [HttpGet("food-suggestions")]
        public async Task<ActionResult<List<AiFoodSuggestionDto>>> GetFoodSuggestions(
            [FromQuery] string location,
            [FromQuery] string keyword = null,
            [FromHeader(Name = "X-Gemini-API-Key")] string userApiKey = null)
        {
            if (string.IsNullOrWhiteSpace(location))
            {
                return BadRequest(new { message = "Vui lòng cung cấp vị trí hoặc địa điểm cần gợi ý." });
            }

            var suggestions = await _geminiService.GetFoodSuggestionsAsync(location.Trim(), keyword?.Trim(), userApiKey);
            return Ok(suggestions);
        }

        /// <summary>
        /// Thêm trực tiếp quán ăn/địa điểm vào lịch trình chuyến đi
        /// </summary>
        [HttpPost("{tripId}/add-restaurant")]
        public async Task<ActionResult<ItineraryItemDto>> AddRestaurant(int tripId, [FromBody] AddRestaurantRequestDto request)
        {
            var userId = GetUserId();
            if (!await IsUserInTrip(tripId, userId)) return Forbid("Bạn không có quyền chỉnh sửa chuyến đi này.");

            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null) return NotFound(new { message = "Không tìm thấy chuyến đi." });

            if (string.IsNullOrWhiteSpace(request.RestaurantName))
            {
                return BadRequest(new { message = "Tên địa điểm/quán ăn không được để trống." });
            }

            // Xác định thời gian hoạt động: Mặc định theo ngày chặng được chọn
            var baseDate = request.Date ?? trip.StartDate;
            var startTime = new DateTime(baseDate.Year, baseDate.Month, baseDate.Day, 12, 0, 0, DateTimeKind.Local);
            var endTime = startTime.AddHours(1.5);

            // Kiểm tra trùng giờ ăn trưa: nếu đã có hoạt động lúc 12:00 thì lùi sang 18:30 (ăn tối)
            var hasLunchSlot = await _context.ItineraryItems
                .AnyAsync(i => i.TripId == tripId && i.StartTime.Date == baseDate.Date && i.StartTime.Hour >= 11 && i.StartTime.Hour <= 13);
            if (hasLunchSlot)
            {
                startTime = new DateTime(baseDate.Year, baseDate.Month, baseDate.Day, 18, 30, 0, DateTimeKind.Local);
                endTime = startTime.AddHours(1.5);
            }

            var noteParts = new List<string>();
            if (!string.IsNullOrWhiteSpace(request.Specialty))
            {
                noteParts.Add($"Món đặc trưng: {request.Specialty.Trim()}");
            }
            if (!string.IsNullOrWhiteSpace(request.Notes))
            {
                noteParts.Add(request.Notes.Trim());
            }
            if (!string.IsNullOrWhiteSpace(request.Lat) && !string.IsNullOrWhiteSpace(request.Lon))
            {
                noteParts.Add($"Tọa độ OSM: {request.Lat},{request.Lon}");
            }

            var item = new ItineraryItem
            {
                TripId = tripId,
                Title = $"🍽️ {request.RestaurantName.Trim()}",
                Location = !string.IsNullOrWhiteSpace(request.Address) ? request.Address.Trim() : request.RestaurantName.Trim(),
                Destination = trip.Destination ?? string.Empty,
                Notes = string.Join(" • ", noteParts),
                StartTime = startTime,
                EndTime = endTime,
                Transport = "Đi bộ / Tự túc",
                Assignee = string.Empty,
                Status = "Chưa bắt đầu"
            };

            _context.ItineraryItems.Add(item);
            await _context.SaveChangesAsync();

            var dto = new ItineraryItemDto
            {
                Id = item.Id,
                TripId = item.TripId,
                Title = item.Title,
                Location = item.Location,
                Destination = item.Destination,
                Notes = item.Notes,
                StartTime = item.StartTime,
                EndTime = item.EndTime,
                Transport = item.Transport,
                Assignee = item.Assignee,
                Status = item.Status,
                CreatedAt = item.CreatedAt
            };

            return Ok(dto);
        }
    }
}
