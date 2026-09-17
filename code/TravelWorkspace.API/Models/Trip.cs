namespace TravelWorkspace.API.Models
{
    public class Trip
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
        
        // Navigation properties
        public int OwnerId { get; set; }
        public User Owner { get; set; } = null!;
        
        public ICollection<Destination> Destinations { get; set; } = new List<Destination>();
        public ICollection<TripMember> Members { get; set; } = new List<TripMember>();
        public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
        public ICollection<ItineraryItem> ItineraryItems { get; set; } = new List<ItineraryItem>();
        public ICollection<Message> Messages { get; set; } = new List<Message>();
        public ICollection<TodoItem> TodoItems { get; set; } = new List<TodoItem>();
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
