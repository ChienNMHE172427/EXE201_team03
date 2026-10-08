namespace TravelWorkspace.API.Models
{
    public class TripPhoto
    {
        public int Id { get; set; }

        public int TripId { get; set; }
        public Trip Trip { get; set; } = null!;

        public int UploadedById { get; set; }
        public User UploadedBy { get; set; } = null!;

        /// <summary>
        /// Đường dẫn URL xem ảnh trên Cloudinary
        /// </summary>
        public string PhotoUrl { get; set; } = string.Empty;

        /// <summary>
        /// PublicId định danh duy nhất của ảnh trên Cloudinary phục vụ việc xóa ảnh
        /// </summary>
        public string PublicId { get; set; } = string.Empty;

        public string? Caption { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
