namespace TravelWorkspace.API.Models
{
    public class Destination
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public Trip Trip { get; set; } = null!;
        public string LocationName { get; set; } = string.Empty;
        public DateTime PlannedDate { get; set; }
        public string Notes { get; set; } = string.Empty;
    }
}
