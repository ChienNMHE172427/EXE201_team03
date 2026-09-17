using System.Text;
using System.Text.Json;

namespace TravelWorkspace.API.Services
{
    public class GeminiService : IGeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public GeminiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        public async Task<string> GenerateItineraryAsync(string destination, int days)
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                // Trả về dữ liệu giả lập (Mock data) nếu chưa có API Key
                return $@"## Lịch trình gợi ý cho {destination} ({days} ngày) 🌟

Đây là lịch trình mẫu được AI tạo tự động (Mock Data) vì bạn chưa cấu hình Gemini API Key. Tuy nhiên, nó vẫn hiển thị hoàn hảo trên giao diện!

### Ngày 1: Khám phá vẻ đẹp thiên nhiên
* **Sáng (08:00):** Khởi hành và di chuyển đến trung tâm {destination}. Nhận phòng khách sạn, nghỉ ngơi.
* **Trưa (12:00):** Thưởng thức đặc sản địa phương tại nhà hàng nổi tiếng nhất khu vực.
* **Chiều (14:30):** Bắt đầu tham quan các danh lam thắng cảnh chính. Đừng quên mang theo máy ảnh!
* **Tối (19:00):** Dạo quanh phố đi bộ, thưởng thức ẩm thực đường phố và mua đồ lưu niệm.

### Ngày 2: Trải nghiệm văn hóa và thư giãn
* **Sáng (07:30):** Ăn sáng nhẹ nhàng với cà phê địa phương. Sau đó tham quan bảo tàng hoặc các di tích lịch sử.
* **Trưa (12:30):** Ăn trưa tại nhà hàng sinh thái, thử các món ăn dân dã.
* **Chiều (15:00):** Tham gia các hoạt động ngoài trời (chèo thuyền, leo núi hoặc đạp xe quanh khu vực).
* **Tối (18:30):** Ăn tối và nghỉ ngơi tự do tại khách sạn. Cùng nhóm tổng kết chi phí trong ngày!

> **Mẹo nhỏ từ AI:** Nhớ mang theo áo khoác nhẹ và dù dự phòng vì thời tiết tại {destination} có thể thay đổi thất thường. Chúc bạn có một chuyến đi tuyệt vời!";
            }

            var prompt = $"Create a detailed {days}-day travel itinerary for {destination}. Include places to visit and recommended food.";
            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}", content);

            if (!response.IsSuccessStatusCode)
            {
                return "Failed to generate itinerary from AI.";
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            try
            {
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();
                return text ?? "No content returned.";
            }
            catch
            {
                return "Error parsing AI response.";
            }
        }
    }
}
