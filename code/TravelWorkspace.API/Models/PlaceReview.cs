namespace TravelWorkspace.API.Models
{
    public class PlaceReview
    {
        public int Id { get; set; }

        /// <summary>
        /// Mã định danh địa điểm (Google Place ID, slug hoặc ID nội bộ)
        /// </summary>
        public string PlaceId { get; set; } = string.Empty;

        /// <summary>
        /// Tên địa điểm hiển thị
        /// </summary>
        public string? PlaceName { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        /// <summary>
        /// Điểm số đánh giá 1 - 5 sao
        /// </summary>
        public int Rating { get; set; } = 5;

        /// <summary>
        /// Nội dung nhận xét, cảnh báo hoặc mẹo du lịch (travel tips)
        /// </summary>
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// Số lượt người khác bấm "Hữu ích"
        /// </summary>
        public int HelpfulCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
