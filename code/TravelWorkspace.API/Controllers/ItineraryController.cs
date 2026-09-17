using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelWorkspace.API.Data;
using TravelWorkspace.API.Models;
using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ItineraryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ItineraryController(AppDbContext context)
        {
            _context = context;
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
                    Notes = i.Notes,
                    StartTime = i.StartTime,
                    EndTime = i.EndTime,
                    CreatedAt = i.CreatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("{tripId}")]
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
                Notes = request.Notes,
                StartTime = request.StartTime,
                EndTime = request.EndTime
            };

            _context.ItineraryItems.Add(item);
            await _context.SaveChangesAsync();

            var dto = new ItineraryItemDto
            {
                Id = item.Id,
                TripId = item.TripId,
                Title = item.Title,
                Location = item.Location,
                Notes = item.Notes,
                StartTime = item.StartTime,
                EndTime = item.EndTime,
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
            item.Notes = request.Notes;
            item.StartTime = request.StartTime;
            item.EndTime = request.EndTime;

            await _context.SaveChangesAsync();

            return Ok(new ItineraryItemDto
            {
                Id = item.Id,
                TripId = item.TripId,
                Title = item.Title,
                Location = item.Location,
                Notes = item.Notes,
                StartTime = item.StartTime,
                EndTime = item.EndTime,
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
    }
}
