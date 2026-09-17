namespace TravelWorkspace.API.Models.DTOs
{
    public class UpdateTripDto
    {
        public string Title { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Budget { get; set; }
        public int NumberOfParticipants { get; set; }
        public string Preferences { get; set; } = string.Empty;
    }
}
