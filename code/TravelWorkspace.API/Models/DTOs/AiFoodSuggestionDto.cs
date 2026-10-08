namespace TravelWorkspace.API.Models.DTOs
{
    public class AiFoodSuggestionDto
    {
        public string Name { get; set; } = string.Empty;
        public string Specialty { get; set; } = string.Empty;
        public string EstimatedDistance { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }
}
