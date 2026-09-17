namespace TravelWorkspace.API.Models
{
    public class TodoItem
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public Trip Trip { get; set; } = null!;
        
        public string Title { get; set; } = string.Empty;
        public bool IsCompleted { get; set; } = false;
        
        public int? AssignedToUserId { get; set; }
        public User? AssignedToUser { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
