namespace TravelWorkspace.API.Models
{
    public class PackingItem
    {
        public int Id { get; set; }
        
        public int TripId { get; set; }
        public Trip Trip { get; set; } = null!;
        
        public string ItemName { get; set; } = string.Empty;
        
        // Ví dụ: "Quần áo & Trang phục", "Giấy tờ & Tiền mặt", "Đồ điện tử & Công nghệ", "Y tế & Sức khỏe", "Đồ dùng cá nhân", "Vật dụng khác"
        public string Category { get; set; } = "Vật dụng khác";
        
        public int Quantity { get; set; } = 1;
        
        public bool IsShared { get; set; } = false;
        
        public bool IsChecked { get; set; } = false;
        
        public int? AssigneeId { get; set; }
        public User? Assignee { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
