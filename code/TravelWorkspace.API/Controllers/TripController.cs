using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TravelWorkspace.API.Models.DTOs;
using TravelWorkspace.API.Services;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/trips")]
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

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<TripDto>>> GetPublicTrips()
        {
            var trips = await _tripService.GetPublicTripsAsync();
            return Ok(trips);
        }

        [HttpGet("{id:int}")]
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

        [HttpPut("{id:int}")]
        public async Task<ActionResult<TripDto>> UpdateTrip(int id, UpdateTripDto request)
        {
            var userId = GetUserId();
            var trip = await _tripService.UpdateTripAsync(id, request, userId);
            if (trip == null) return NotFound();
            return Ok(trip);
        }

        [HttpGet("{tripId:int}/members")]
        public async Task<ActionResult<IEnumerable<MemberDto>>> GetTripMembers(int tripId)
        {
            var userId = GetUserId();
            var members = await _tripService.GetTripMembersAsync(tripId, userId);
            return Ok(members);
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult> DeleteTrip(int id)
        {
            var userId = GetUserId();
            var result = await _tripService.DeleteTripAsync(id, userId);
            if (!result) return NotFound();
            return NoContent();
        }

        /// <summary>
        /// Mời bạn bè cộng tác vào chuyến đi
        /// POST /api/trips/{tripId}/invite
        /// </summary>
        [HttpPost("{tripId:int}/invite")]
        public async Task<ActionResult> InviteMember(int tripId, [FromBody] InviteDto request)
        {
            var userId = GetUserId();
            try
            {
                await _tripService.InviteMemberAsync(tripId, request, userId);
                return Ok(new { message = "Mời thành viên thành công." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi hệ thống khi mời thành viên.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Sao chép (clone) lịch trình của một chuyến đi công khai
        /// POST /api/trips/{originalTripId}/clone
        /// </summary>
        [HttpPost("{originalTripId:int}/clone")]
        public async Task<ActionResult> CloneTrip(int originalTripId, [FromBody] CloneTripDto request)
        {
            var userId = GetUserId();
            try
            {
                var newTripId = await _tripService.CloneTripAsync(originalTripId, request, userId);
                return Ok(new { id = newTripId, message = "Sao chép chuyến đi thành công." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi hệ thống khi sao chép chuyến đi.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Áp dụng các chặng từ lịch trình mẫu vào chuyến đi hiện tại
        /// POST /api/trips/{targetTripId}/apply-template/{templateTripId}
        /// </summary>
        [HttpPost("{targetTripId:int}/apply-template/{templateTripId:int}")]
        public async Task<ActionResult> ApplyTemplate(int targetTripId, int templateTripId, [FromQuery] bool overwrite = false)
        {
            var userId = GetUserId();
            try
            {
                await _tripService.ApplyTemplateAsync(targetTripId, templateTripId, userId, overwrite);
                return Ok(new { message = "Áp dụng lịch trình mẫu thành công!" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi hệ thống khi áp dụng lịch trình mẫu.", detail = ex.Message });
            }
        }
    }
}
