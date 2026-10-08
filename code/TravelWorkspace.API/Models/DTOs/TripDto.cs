namespace TravelWorkspace.API.Models.DTOs
{
    public class TripDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Budget { get; set; }
        public int NumberOfParticipants { get; set; }
        public string Preferences { get; set; } = string.Empty;
        public int OwnerId { get; set; }
        public bool IsPublic { get; set; }
        public int CloneCount { get; set; }
        public string? ImageUrl { get; set; }
        public ICollection<ItineraryItemDto> ItineraryItems { get; set; } = new List<ItineraryItemDto>();
        public DateTime CreatedAt { get; set; }
    }
}
