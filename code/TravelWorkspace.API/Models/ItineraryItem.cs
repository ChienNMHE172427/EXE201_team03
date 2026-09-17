namespace TravelWorkspace.API.Models
{
    public class ItineraryItem
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public Trip Trip { get; set; } = null!;
        
        public string Title { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        
        public string Transport { get; set; } = string.Empty;
        public string Assignee { get; set; } = string.Empty;
        public string Status { get; set; } = "Chưa bắt đầu";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
