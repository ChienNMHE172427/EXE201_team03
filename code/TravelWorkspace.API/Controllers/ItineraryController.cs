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
        public async Task<ActionResult<IEnumerable<ItineraryItemDto>>> GetTripItinerary(int tripId)
        {
            var userId = GetUserId();
            if (!await IsUserInTrip(tripId, userId)) return Forbid("Bạn không có quyền truy cập chuyến đi này.");

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
                    CreatedAt = i.CreatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("{tripId}")]
        public async Task<ActionResult<ItineraryItemDto>> CreateItineraryItem(int tripId, CreateItineraryItemDto request)
        {
            try 
            {
                var userId = GetUserId();
                if (!await IsUserInTrip(tripId, userId)) return Forbid();

                var trip = await _context.Trips.FindAsync(tripId);
                if (trip == null) return NotFound();

                var item = new ItineraryItem
                {
                    TripId = tripId,
                    Title = request.Title ?? "",
                    Location = request.Location ?? "",
                    Destination = request.Destination ?? "",
                    Notes = request.Notes ?? "",
                    StartTime = request.StartTime.ToUniversalTime(),
                    EndTime = request.EndTime.ToUniversalTime(),
                    Transport = request.Transport ?? "",
                    Assignee = request.Assignee ?? "",
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
            catch (Exception ex)
            {
                return StatusCode(500, new { title = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ItineraryItemDto>> UpdateItineraryItem(int id, UpdateItineraryItemDto request)
        {
            try
            {
                var userId = GetUserId();
                
                var item = await _context.ItineraryItems.FindAsync(id);
                if (item == null) return NotFound();

                if (!await IsUserInTrip(item.TripId, userId)) return Forbid();

                item.Title = request.Title ?? "";
                item.Location = request.Location ?? "";
                item.Destination = request.Destination ?? "";
                item.Notes = request.Notes ?? "";
                item.StartTime = request.StartTime.ToUniversalTime();
                item.EndTime = request.EndTime.ToUniversalTime();
                item.Transport = request.Transport ?? "";
                item.Assignee = request.Assignee ?? "";
                item.Status = request.Status ?? "Chưa bắt đầu";

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
            catch (Exception ex)
            {
                return StatusCode(500, new { title = ex.Message, inner = ex.InnerException?.Message });
            }
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

        [HttpPost("GenerateAi/{tripId}")]
        public async Task<ActionResult<IEnumerable<ItineraryItemDto>>> GenerateAiItinerary(int tripId)
        {
            try
            {
                var userId = GetUserId();
                if (!await IsUserInTrip(tripId, userId)) return Forbid();

                var trip = await _context.Trips.FindAsync(tripId);
                if (trip == null) return NotFound();

                // Xóa lịch trình cũ (nếu muốn thay thế hoàn toàn)
                var oldItems = await _context.ItineraryItems.Where(i => i.TripId == tripId).ToListAsync();
                _context.ItineraryItems.RemoveRange(oldItems);

                var userApiKey = Request.Headers["X-Gemini-API-Key"].FirstOrDefault();

                int days = Math.Max(1, (int)(trip.EndDate - trip.StartDate).TotalDays);
                var aiItems = await _geminiService.GenerateItineraryJsonAsync(trip.Origin, trip.Destination, days, trip.StartDate, userApiKey);

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
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace, innerException = ex.InnerException?.Message });
            }
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
            var aiResponse = await _geminiService.ChatAndModifyItineraryAsync(request.Message, request.History, currentItems, trip, userApiKey);

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
                Id = i.Id, TripId = i.TripId, Title = i.Title, Location = i.Location, Notes = i.Notes, StartTime = i.StartTime, EndTime = i.EndTime, Transport = i.Transport, Assignee = i.Assignee, Status = i.Status, CreatedAt = i.CreatedAt
            }) });
        }
    }
}
