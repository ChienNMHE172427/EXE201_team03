namespace TravelWorkspace.API.Models.DTOs
{
    public class CloneTripDto
    {
        public string NewTripName { get; set; } = string.Empty;
        public DateTime NewStartDate { get; set; }
    }
}
