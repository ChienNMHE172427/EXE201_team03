using Microsoft.AspNetCore.Mvc;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PartnerController : ControllerBase
    {
        [HttpGet("flights")]
        public ActionResult GetFlightPartners(string destination)
        {
            return Ok(new[]
            {
                new { Partner = "Skyscanner", Link = $"https://www.skyscanner.com/transport/flights-from/sgn/to/{destination}" },
                new { Partner = "Traveloka", Link = $"https://www.traveloka.com/en-vn/flight/search?ap={destination}" }
            });
        }

        [HttpGet("hotels")]
        public ActionResult GetHotelPartners(string destination)
        {
            return Ok(new[]
            {
                new { Partner = "Booking.com", Link = $"https://www.booking.com/searchresults.html?ss={destination}" },
                new { Partner = "Agoda", Link = $"https://www.agoda.com/search?textToSearch={destination}" }
            });
        }
    }
}
