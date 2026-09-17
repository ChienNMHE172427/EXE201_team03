namespace TravelWorkspace.API.Models
{
    public class TripMember
    {
        public int Id { get; set; }
        
        public int TripId { get; set; }
        public Trip Trip { get; set; } = null!;
        
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        public string Role { get; set; } = "Viewer"; // "Editor" or "Viewer"
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
