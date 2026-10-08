namespace TravelWorkspace.API.Models
{
    public class AffiliatePartner
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // "Flight", "Hotel", "Tour", etc.
        public string PartnerUrl { get; set; } = string.Empty; // Đường dẫn tiếp thị liên kết
        public string SearchUrlTemplate { get; set; } = string.Empty;
        public decimal CommissionRate { get; set; } = 0.0m; // Tỷ lệ hoa hồng
        public int Clicks { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
