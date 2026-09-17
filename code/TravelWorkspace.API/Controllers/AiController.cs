using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelWorkspace.API.Services;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AiController : ControllerBase
    {
        private readonly IGeminiService _geminiService;

        public AiController(IGeminiService geminiService)
        {
            _geminiService = geminiService;
        }

        [HttpGet("itinerary")]
        public async Task<ActionResult> GenerateItinerary(string destination, int days = 3)
        {
            var result = await _geminiService.GenerateItineraryAsync(destination, days);
            return Ok(new { Suggestion = result });
        }
    }
}
