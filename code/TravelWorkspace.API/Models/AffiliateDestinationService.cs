using System;

namespace TravelWorkspace.API.Models
{
    public class AffiliateDestinationService
    {
        public int Id { get; set; }
        
        // Khu vực / Tỉnh thành (ví dụ: "Quảng Ninh", "Đà Nẵng", "Hà Nội", "Lâm Đồng")
        public string Region { get; set; } = string.Empty;
        
        // Địa điểm vui chơi / Khu du lịch (ví dụ: "Vịnh Hạ Long", "Bãi Cháy", "Bà Nà Hills", "Hồ Hoàn Kiếm")
        public string Destination { get; set; } = string.Empty;
        
        // Phân loại: "hotel" (Cư trú / Khách sạn / Homestay) hoặc "transport" (Nhà xe / Di chuyển)
        public string Category { get; set; } = "hotel";
        
        // Tên dịch vụ (ví dụ: "Khách sạn Mường Thanh Grand", "Xe Limousine Phúc Xuyên")
        public string Name { get; set; } = string.Empty;
        
        // Link tiếp thị liên kết (Affiliate URL - Booking, Agoda, Vexere, v.v.)
        public string AffiliateUrl { get; set; } = string.Empty;
        
        // Giá tham khảo (ví dụ: "Từ 1.200.000đ/đêm", "250.000đ/vé")
        public string Price { get; set; } = string.Empty;
        
        // Ghi chú / Tiện ích / Mô tả
        public string Notes { get; set; } = string.Empty;
        
        // Đánh giá sao (ví dụ: 4.8)
        public double Rating { get; set; } = 4.8;
        
        // Địa chỉ cụ thể
        public string Address { get; set; } = string.Empty;
        
        // Trạng thái hoạt động
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
