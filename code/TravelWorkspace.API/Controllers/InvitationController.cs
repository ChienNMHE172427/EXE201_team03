using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelWorkspace.API.Data;
using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/invitations")]
    [Authorize]
    public class InvitationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InvitationController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        /// <summary>
        /// Phản hồi lời mời tham gia chuyến đi (Chấp nhận hoặc Từ chối)
        /// PUT /api/invitations/{tripMemberId}/respond
        /// </summary>
        [HttpPut("{tripMemberId:int}/respond")]
        public async Task<IActionResult> RespondInvitation(int tripMemberId, [FromBody] RespondInvitationDto request)
        {
            var userId = GetUserId();
            var membership = await _context.TripMembers
                .Include(tm => tm.Trip)
                .FirstOrDefaultAsync(tm => tm.Id == tripMemberId && tm.UserId == userId);

            if (membership == null)
            {
                return NotFound(new { message = "Không tìm thấy lời mời chuyến đi này." });
            }

            if (request.Accept)
            {
                membership.Status = "Accepted";
                membership.JoinedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(new 
                { 
                    message = "Đã đồng ý tham gia chuyến đi!", 
                    tripId = membership.TripId,
                    status = "Accepted" 
                });
            }
            else
            {
                membership.Status = "Declined";
                await _context.SaveChangesAsync();

                return Ok(new 
                { 
                    message = "Đã từ chối lời mời tham gia chuyến đi.", 
                    tripId = membership.TripId,
                    status = "Declined" 
                });
            }
        }
    }
}
