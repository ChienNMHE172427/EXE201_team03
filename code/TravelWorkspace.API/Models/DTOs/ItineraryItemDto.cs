namespace TravelWorkspace.API.Models.DTOs
{
    public class ItineraryItemDto
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Transport { get; set; } = string.Empty;
        public string Assignee { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateItineraryItemDto
    {
        public string Title { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Transport { get; set; } = string.Empty;
        public string Assignee { get; set; } = string.Empty;
        public string Status { get; set; } = "Chưa bắt đầu";
    }

    public class UpdateItineraryItemDto
    {
        public string Title { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Transport { get; set; } = string.Empty;
        public string Assignee { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }
}
