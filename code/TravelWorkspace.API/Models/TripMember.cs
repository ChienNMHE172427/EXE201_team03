namespace TravelWorkspace.API.Models
{
    public class TripMember
    {
        public int Id { get; set; }
        
        public int TripId { get; set; }
        public Trip Trip { get; set; } = null!;
        
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        public string Role { get; set; } = "Member"; // "Host" or "Member"
        public string Status { get; set; } = "Accepted"; // "Pending", "Accepted", "Declined"
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
