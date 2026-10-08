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
    [Route("api")]
    public class ReviewController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IGeminiService _geminiService;
        private readonly ILogger<ReviewController> _logger;

        public ReviewController(
            AppDbContext context, 
            IGeminiService geminiService,
            ILogger<ReviewController> logger)
        {
            _context = context;
            _geminiService = geminiService;
            _logger = logger;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        /// <summary>
        /// Lấy danh sách đánh giá & mẹo du lịch của địa điểm (hỗ trợ phân trang và sắp xếp)
        /// </summary>
        [HttpGet("places/{placeId}/reviews")]
        public async Task<ActionResult<PlaceReviewsResponseDto>> GetPlaceReviews(
            string placeId, 
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 10,
            [FromQuery] string sortBy = "latest")
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 50) pageSize = 10;

            var query = _context.PlaceReviews
                .Include(r => r.User)
                .Where(r => r.PlaceId == placeId);

            var totalReviews = await query.CountAsync();
            var averageRating = totalReviews > 0 ? await query.AverageAsync(r => r.Rating) : 0;

            // Sắp xếp: "helpful" (được thả hữu ích nhiều nhất) hoặc "latest" (mới nhất)
            if (sortBy?.ToLower() == "helpful")
            {
                query = query.OrderByDescending(r => r.HelpfulCount).ThenByDescending(r => r.CreatedAt);
            }
            else
            {
                query = query.OrderByDescending(r => r.CreatedAt);
            }

            var reviews = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new PlaceReviewDto
                {
                    Id = r.Id,
                    PlaceId = r.PlaceId,
                    PlaceName = r.PlaceName,
                    UserId = r.UserId,
                    UserName = r.User.FullName,
                    UserAvatar = r.User.AvatarUrl,
                    Rating = r.Rating,
                    Content = r.Content,
                    HelpfulCount = r.HelpfulCount,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            var totalPages = (int)Math.Ceiling(totalReviews / (double)pageSize);

            return Ok(new PlaceReviewsResponseDto
            {
                PlaceId = placeId,
                AverageRating = Math.Round(averageRating, 1),
                TotalReviews = totalReviews,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                Reviews = reviews
            });
        }

        /// <summary>
        /// Đăng đánh giá và mẹo du lịch mới cho địa điểm
        /// </summary>
        [HttpPost("places/{placeId}/reviews")]
        [Authorize]
        public async Task<ActionResult<PlaceReviewDto>> CreatePlaceReview(
            string placeId, 
            [FromBody] CreatePlaceReviewDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { message = "Nội dung nhận xét/mẹo du lịch không được để trống." });
            }

            if (request.Rating < 1 || request.Rating > 5)
            {
                return BadRequest(new { message = "Điểm số đánh giá phải từ 1 đến 5 sao." });
            }

            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();

            var review = new PlaceReview
            {
                PlaceId = placeId,
                PlaceName = request.PlaceName,
                UserId = userId,
                Rating = request.Rating,
                Content = request.Content.Trim(),
                HelpfulCount = 0,
                CreatedAt = DateTime.UtcNow
            };

            _context.PlaceReviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(new PlaceReviewDto
            {
                Id = review.Id,
                PlaceId = review.PlaceId,
                PlaceName = review.PlaceName,
                UserId = review.UserId,
                UserName = user.FullName,
                UserAvatar = user.AvatarUrl,
                Rating = review.Rating,
                Content = review.Content,
                HelpfulCount = review.HelpfulCount,
                CreatedAt = review.CreatedAt
            });
        }

        /// <summary>
        /// Tăng biến đếm HelpfulCount khi người dùng thấy mẹo này hữu ích
        /// </summary>
        [HttpPut("reviews/{id}/helpful")]
        [Authorize]
        public async Task<IActionResult> MarkHelpful(int id)
        {
            var review = await _context.PlaceReviews.FindAsync(id);
            if (review == null)
            {
                return NotFound(new { message = "Không tìm thấy đánh giá." });
            }

            review.HelpfulCount++;
            await _context.SaveChangesAsync();

            return Ok(new { helpfulCount = review.HelpfulCount });
        }

        /// <summary>
        /// Tính năng nâng cao: Gọi AI Gemini tổng hợp toàn bộ các mẹo của địa điểm thành 3-4 gạch đầu dòng ngắn gọn
        /// </summary>
        [HttpPost("places/{placeId}/reviews/ai-summary")]
        public async Task<ActionResult<AiTipsSummaryDto>> SummarizePlaceTips(
            string placeId, 
            [FromQuery] string? placeName = null)
        {
            var displayName = !string.IsNullOrWhiteSpace(placeName) ? placeName : placeId;

            var reviews = await _context.PlaceReviews
                .Where(r => r.PlaceId == placeId)
                .OrderByDescending(r => r.HelpfulCount)
                .ThenByDescending(r => r.CreatedAt)
                .Take(20)
                .ToListAsync();

            var userApiKey = Request.Headers["X-Gemini-API-Key"].FirstOrDefault();
            var summary = await _geminiService.SummarizePlaceTipsAsync(placeId, displayName, reviews, userApiKey);

            return Ok(summary);
        }
    }
}
