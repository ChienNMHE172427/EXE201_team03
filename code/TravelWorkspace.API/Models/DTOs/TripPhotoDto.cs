namespace TravelWorkspace.API.Models.DTOs
{
    public class TripPhotoDto
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public int UploadedById { get; set; }
        public string UploadedByName { get; set; } = string.Empty;
        public string? UploadedByAvatar { get; set; }
        public string PhotoUrl { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string? Caption { get; set; }
        public DateTime UploadedAt { get; set; }
        public bool CanDelete { get; set; }
    }

    public class UploadPhotoResultDto
    {
        public string PhotoUrl { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
    }
}
