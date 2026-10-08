namespace TravelWorkspace.API.Models.DTOs
{
    public class CreatePackingItemDto
    {
        public string ItemName { get; set; } = string.Empty;
        public string Category { get; set; } = "Vật dụng khác";
        public int Quantity { get; set; } = 1;
        public bool IsShared { get; set; } = false;
        public int? AssigneeId { get; set; }
    }

    public class UpdatePackingItemDto
    {
        public string ItemName { get; set; } = string.Empty;
        public string Category { get; set; } = "Vật dụng khác";
        public int Quantity { get; set; } = 1;
        public bool IsShared { get; set; } = false;
        public int? AssigneeId { get; set; }
        public bool? IsChecked { get; set; }
    }

    public class PackingItemDto
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int Quantity { get; set; } = 1;
        public bool IsShared { get; set; } = false;
        public bool IsChecked { get; set; }
        public int? AssigneeId { get; set; }
        public string? AssigneeName { get; set; }
        public string? AssigneeAvatarUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AiPackingSuggestionDto
    {
        public string ItemName { get; set; } = string.Empty;
        public string Category { get; set; } = "Vật dụng khác";
        public int Quantity { get; set; } = 1;
        public bool IsShared { get; set; } = false;
        public string Reason { get; set; } = string.Empty;
    }
}
