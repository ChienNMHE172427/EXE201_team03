using System.ComponentModel.DataAnnotations;

namespace TravelWorkspace.API.Models.DTOs
{
    public class UpdateProfileDto
    {
        [Required]
        public string FullName { get; set; } = string.Empty;
    }
}
