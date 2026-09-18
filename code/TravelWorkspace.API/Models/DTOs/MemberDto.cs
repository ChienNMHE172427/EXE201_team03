namespace TravelWorkspace.API.Models.DTOs
{
    public class MemberDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Initials { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}
