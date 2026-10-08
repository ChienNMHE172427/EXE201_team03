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

        public bool IsPlanB { get; set; } = false;
        public int? ReplacesItemId { get; set; }
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
        public bool IsPlanB { get; set; } = false;
        public int? ReplacesItemId { get; set; }
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
        public bool? IsPlanB { get; set; }
        public int? ReplacesItemId { get; set; }
    }

    public class GeneratePlanBRequest
    {
        public DateTime Date { get; set; }
        public string? UserApiKey { get; set; }
    }

    public class PlanBItemSuggestionDto
    {
        public int OriginalItemId { get; set; }
        public int? ReplacesItemId { get; set; }
        public bool IsPlanB { get; set; } = true;
        public string Title { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public string Transport { get; set; } = "Taxi / Xe đưa đón";
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
    }

    public class AddRestaurantRequestDto
    {
        public DateTime? Date { get; set; }
        public string RestaurantName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Specialty { get; set; }
        public string? Notes { get; set; }
        public string? Lat { get; set; }
        public string? Lon { get; set; }
    }
}
