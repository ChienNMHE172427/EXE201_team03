namespace TravelWorkspace.API.Models
{
    public class Message
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public Trip Trip { get; set; } = null!;
        
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
