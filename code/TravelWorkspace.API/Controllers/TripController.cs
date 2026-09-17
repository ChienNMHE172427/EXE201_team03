using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TravelWorkspace.API.Models.DTOs;
using TravelWorkspace.API.Services;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TripController : ControllerBase
    {
        private readonly ITripService _tripService;

        public TripController(ITripService tripService)
        {
            _tripService = tripService;
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TripDto>>> GetTrips()
        {
            var userId = GetUserId();
            var trips = await _tripService.GetTripsAsync(userId);
            return Ok(trips);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TripDto>> GetTrip(int id)
        {
            var userId = GetUserId();
            var trip = await _tripService.GetTripByIdAsync(id, userId);
            if (trip == null) return NotFound();
            return Ok(trip);
        }

        [HttpPost]
        public async Task<ActionResult<TripDto>> CreateTrip(CreateTripDto request)
        {
            var userId = GetUserId();
            try {
                var trip = await _tripService.CreateTripAsync(request, userId);
                return CreatedAtAction(nameof(GetTrip), new { id = trip.Id }, trip);
            } catch (InvalidOperationException ex) {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TripDto>> UpdateTrip(int id, UpdateTripDto request)
        {
            var userId = GetUserId();
            var trip = await _tripService.UpdateTripAsync(id, request, userId);
            if (trip == null) return NotFound();
            return Ok(trip);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTrip(int id)
        {
            var userId = GetUserId();
            var result = await _tripService.DeleteTripAsync(id, userId);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpPost("{id}/invite")]
        public async Task<ActionResult> InviteMember(int id, InviteDto request)
        {
            var userId = GetUserId();
            var result = await _tripService.InviteMemberAsync(id, request, userId);
            if (!result) return BadRequest("Cannot invite member. Trip not found, you don't have permission, or user doesn't exist.");
            return Ok("Invitation processed successfully.");
        }
    }
}
