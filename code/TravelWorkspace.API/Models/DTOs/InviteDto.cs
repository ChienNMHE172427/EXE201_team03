namespace TravelWorkspace.API.Models.DTOs
{
    public class InviteDto
    {
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "Viewer"; // Viewer or Editor
    }
}
