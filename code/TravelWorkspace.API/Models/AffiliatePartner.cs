namespace TravelWorkspace.API.Models
{
    public class AffiliatePartner
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // e.g. "Flight", "Hotel"
        public string SearchUrlTemplate { get; set; } = string.Empty; // e.g. "https://www.booking.com/searchresults.html?ss={destination}"
        public int Clicks { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }
}
