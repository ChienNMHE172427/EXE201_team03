using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWorkspace.API.Data;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")] // BẮT BUỘC PHẢI LÀ ADMIN
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly TravelWorkspace.API.Services.IEmailService _emailService;

        public AdminController(AppDbContext context, TravelWorkspace.API.Services.IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    u.FullName,
                    u.Role,
                    u.IsActive,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("users/{id}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(int id, [FromBody] TravelWorkspace.API.Models.DTOs.StatusChangeRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound("User not found");
            
            if (user.Role == "Admin")
                return BadRequest("Cannot toggle Admin status");

            user.IsActive = !user.IsActive;
            await _context.SaveChangesAsync();

            var statusString = user.IsActive ? "được mở khóa" : "bị khóa";
            var subject = $"Tài khoản của bạn đã {statusString}";
            var body = $@"
                <h2>Chào {user.FullName},</h2>
                <p>Tài khoản của bạn tại <strong>Travel Workspace</strong> đã {statusString} bởi quản trị viên.</p>
                <p><strong>Lý do:</strong> {request.Reason}</p>
                <br/>
                <p>Trân trọng,<br/>Đội ngũ Travel Workspace</p>
            ";
            try { await _emailService.SendEmailAsync(user.Email, subject, body); } catch {}

            return Ok(new { message = "Status toggled successfully", isActive = user.IsActive });
        }

        [HttpPut("users/{id}/promote")]
        public async Task<IActionResult> PromoteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound("User not found");
            
            if (user.Role == "Admin")
                return BadRequest("User is already an Admin");

            user.Role = "Admin";
            await _context.SaveChangesAsync();

            return Ok(new { message = "User promoted to Admin successfully", role = user.Role });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id, [FromQuery] string reason)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound("User not found");
            
            if (user.Role == "Admin")
                return BadRequest("Cannot delete an Admin");

            var email = user.Email;
            var name = user.FullName;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            var subject = "Tài khoản của bạn đã bị xóa";
            var body = $@"
                <h2>Chào {name},</h2>
                <p>Tài khoản của bạn tại <strong>Travel Workspace</strong> đã bị xóa vĩnh viễn bởi quản trị viên.</p>
                <p><strong>Lý do:</strong> {reason}</p>
                <br/>
                <p>Trân trọng,<br/>Đội ngũ Travel Workspace</p>
            ";
            try { await _emailService.SendEmailAsync(email, subject, body); } catch {}

            return NoContent();
        }


        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var totalUsers = await _context.Users.CountAsync();
            var totalTrips = await _context.Trips.CountAsync();
            var totalExpenses = await _context.Expenses.SumAsync(e => e.Amount);

            return Ok(new
            {
                TotalUsers = totalUsers,
                TotalTrips = totalTrips,
                TotalRevenue = totalExpenses
            });
        }

        // --- PARTNERS ---
        [HttpGet("partners")]
        public async Task<IActionResult> GetPartners()
        {
            var partners = await _context.AffiliatePartners.ToListAsync();
            return Ok(partners);
        }

        [HttpPost("partners")]
        public async Task<IActionResult> CreatePartner([FromBody] TravelWorkspace.API.Models.AffiliatePartner partner)
        {
            _context.AffiliatePartners.Add(partner);
            await _context.SaveChangesAsync();
            return Ok(partner);
        }

        [HttpPut("partners/{id}")]
        public async Task<IActionResult> UpdatePartner(int id, [FromBody] TravelWorkspace.API.Models.AffiliatePartner dto)
        {
            var partner = await _context.AffiliatePartners.FindAsync(id);
            if (partner == null) return NotFound();

            partner.Name = dto.Name;
            partner.Category = dto.Category;
            partner.SearchUrlTemplate = dto.SearchUrlTemplate;
            partner.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return Ok(partner);
        }

        [HttpDelete("partners/{id}")]
        public async Task<IActionResult> DeletePartner(int id)
        {
            var partner = await _context.AffiliatePartners.FindAsync(id);
            if (partner == null) return NotFound();

            _context.AffiliatePartners.Remove(partner);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // --- CONTENT MANAGEMENT ---
        [HttpGet("contents")]
        public async Task<IActionResult> GetAllTrips()
        {
            var trips = await _context.Trips
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Origin,
                    t.Destination,
                    OwnerEmail = _context.Users.Where(u => u.Id == t.OwnerId).Select(u => u.Email).FirstOrDefault(),
                    t.StartDate,
                    t.CreatedAt
                })
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return Ok(trips);
        }

        [HttpDelete("contents/{id}")]
        public async Task<IActionResult> DeleteTrip(int id)
        {
            var trip = await _context.Trips.FindAsync(id);
            if (trip == null) return NotFound();

            _context.Trips.Remove(trip);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
