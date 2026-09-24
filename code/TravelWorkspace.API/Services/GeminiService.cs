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

        public async Task<string> GenerateItineraryAsync(string origin, string destination, int days, string userApiKey = null)
        {
            var apiKey = !string.IsNullOrEmpty(userApiKey) ? userApiKey : _configuration["Gemini:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                // Trả về dữ liệu giả lập (Mock data) nếu chưa có API Key
                return $@"## Lịch trình gợi ý đi {destination} từ {origin} ({days} ngày) 🌟

Đây là lịch trình mẫu được AI tạo tự động (Mock Data) vì bạn chưa cấu hình Gemini API Key. Tuy nhiên, nó vẫn hiển thị hoàn hảo trên giao diện!

### Ngày 1: Khởi hành và Khám phá
* **Sáng (08:00):** Khởi hành từ {origin} và di chuyển đến trung tâm {destination}. Nhận phòng khách sạn, nghỉ ngơi.
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

            var shortOrigin = origin.Split(',').First().Trim();
            var shortDestination = destination.Split(',').First().Trim();
            var prompt = $"Create a detailed {days}-day travel itinerary departing from {shortOrigin} to {shortDestination}. Include realistic transportation methods from {shortOrigin} to {shortDestination}, places to visit, and recommended food.";
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

            var contentString = JsonSerializer.Serialize(requestBody);
            HttpResponseMessage response = null;
            int maxRetries = 3;
            for (int i = 0; i < maxRetries; i++)
            {
                var content = new StringContent(contentString, Encoding.UTF8, "application/json");
                response = await _httpClient.PostAsync($"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}", content);
                if (response.IsSuccessStatusCode) break;
                if ((int)response.StatusCode == 503 || (int)response.StatusCode == 429)
                {
                    if (i < maxRetries - 1) await Task.Delay(2000 * (i + 1));
                    else break;
                }
                else break;
            }

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

        public async Task<List<TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto>> GenerateItineraryJsonAsync(string origin, string destination, int days, DateTime startDate, string userApiKey = null)
        {
            var shortOrigin = origin.Split(',').First().Trim();
            var shortDestination = destination.Split(',').First().Trim();
            
            var mockData = new List<TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto>();
            for (int d = 0; d < days; d++)
            {
                var currentDate = startDate.AddDays(d);
                if (d == 0)
                {
                    mockData.Add(new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto { Title = $"Khởi hành từ {shortOrigin} đi {shortDestination}", Location = shortOrigin, Destination = shortDestination, Transport = "Vui lòng chọn dịch vụ", StartTime = currentDate.AddHours(7), EndTime = currentDate.AddHours(9), Status = "Chưa bắt đầu" });
                    mockData.Add(new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto { Title = $"Đến {shortDestination}, nhận phòng & nghỉ ngơi", Location = shortDestination, Destination = "Vui lòng chọn dịch vụ", Transport = "Vui lòng chọn dịch vụ", StartTime = currentDate.AddHours(12), EndTime = currentDate.AddHours(14), Status = "Chưa bắt đầu" });
                    mockData.Add(new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto { Title = "Ăn tối đặc sản địa phương", Location = shortDestination, Destination = "Vui lòng chọn dịch vụ", Transport = "Vui lòng chọn dịch vụ", StartTime = currentDate.AddHours(18).AddMinutes(30), EndTime = currentDate.AddHours(20), Status = "Chưa bắt đầu" });
                }
                else if (d == days - 1)
                {
                    mockData.Add(new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto { Title = $"Mua sắm đặc sản {shortDestination} làm quà", Location = shortDestination, Destination = "Chợ địa phương", Transport = "Vui lòng chọn dịch vụ", StartTime = currentDate.AddHours(9), EndTime = currentDate.AddHours(11), Status = "Chưa bắt đầu" });
                    mockData.Add(new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto { Title = $"Khởi hành từ {shortDestination} về {shortOrigin}", Location = shortDestination, Destination = shortOrigin, Transport = "Vui lòng chọn dịch vụ", StartTime = currentDate.AddHours(14), EndTime = currentDate.AddHours(16), Status = "Chưa bắt đầu" });
                }
                else
                {
                    mockData.Add(new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto { Title = $"Vui chơi, tham quan các điểm nổi tiếng tại {shortDestination}", Location = shortDestination, Destination = "Vui lòng chọn dịch vụ", Transport = "Vui lòng chọn dịch vụ", StartTime = currentDate.AddHours(8), EndTime = currentDate.AddHours(11), Status = "Chưa bắt đầu" });
                    mockData.Add(new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto { Title = "Ăn trưa, nghỉ ngơi", Location = shortDestination, Destination = "Vui lòng chọn dịch vụ", Transport = "Vui lòng chọn dịch vụ", StartTime = currentDate.AddHours(12), EndTime = currentDate.AddHours(13), Status = "Chưa bắt đầu" });
                    mockData.Add(new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto { Title = "Khám phá văn hóa & ẩm thực đường phố", Location = shortDestination, Destination = "Vui lòng chọn dịch vụ", Transport = "Vui lòng chọn dịch vụ", StartTime = currentDate.AddHours(15), EndTime = currentDate.AddHours(18), Status = "Chưa bắt đầu" });
                }
            }

            var apiKey = !string.IsNullOrEmpty(userApiKey) ? userApiKey : _configuration["Gemini:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                return mockData;
            }

            var prompt = $"Create a detailed {days}-day travel itinerary departing from {shortOrigin} and traveling to {shortDestination} starting from {startDate:yyyy-MM-dd}. Return ONLY a raw JSON array of objects. Each object must have exactly these keys: 'title' (string, e.g. 'Từ {shortOrigin} đi {shortDestination}', representing origin to destination or activity. ALWAYS make titles SHORT and concise, NEVER use full addresses), 'location' (string, the general geographic location, ALWAYS use exactly '{shortDestination}' or '{shortOrigin}'), 'destination' (string, the specific place to visit, e.g. 'Hải đăng Cô Tô', 'Nhà hàng ABC', 'Biển Hồng Vàn'. DO NOT append city or country names. Keep it short. If the activity requires booking like a flight or hotel, set it exactly to 'Vui lòng chọn dịch vụ'), 'startTime' (ISO 8601 string), 'endTime' (ISO 8601 string), 'transport' (string, ALWAYS set this exactly to 'Vui lòng chọn dịch vụ' so the user can choose their own service later), 'notes' (string, can be empty). Provide roughly 3-5 activities per day.\nIMPORTANT GUIDELINE: When generating activities, you MUST prioritize suggesting the following test locations if they match the destination: Vịnh Hạ Long, Yên Tử, Đảo Cô Tô, Bình Liêu, Đảo Quan Lạn, Đỉnh Fansipan, Bản Cát Cát, Đèo Ô Quy Hồ, Thung lũng Mường Hoa, Dinh Hoàng A Tưởng (Bắc Hà), Quần thể Tràng An, Tam Cốc - Bích Động, Chùa Bái Đính, Cố đô Hoa Lư, Hang Múa.";
            
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

            var contentString = JsonSerializer.Serialize(requestBody);
            HttpResponseMessage response = null;
            int maxRetries = 3;
            for (int i = 0; i < maxRetries; i++)
            {
                var content = new StringContent(contentString, Encoding.UTF8, "application/json");
                response = await _httpClient.PostAsync($"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}", content);
                if (response.IsSuccessStatusCode) break;
                if ((int)response.StatusCode == 503 || (int)response.StatusCode == 429)
                {
                    if (i < maxRetries - 1) await Task.Delay(2000 * (i + 1));
                    else break;
                }
                else break;
            }

            if (!response.IsSuccessStatusCode)
            {
                return mockData;
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
                    .GetString() ?? "[]";

                text = text.Replace("```json", "").Replace("```", "").Trim();
                int startIndex = text.IndexOf('[');
                int endIndex = text.LastIndexOf(']');
                if (startIndex >= 0 && endIndex > startIndex)
                {
                    text = text.Substring(startIndex, endIndex - startIndex + 1);
                }
                
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var items = JsonSerializer.Deserialize<List<TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto>>(text, options);
                
                if (items != null && items.Any())
                {
                    foreach (var item in items)
                    {
                        item.Status = "Chưa bắt đầu";
                        item.Transport = "Vui lòng chọn dịch vụ";
                        if (string.IsNullOrEmpty(item.Assignee)) item.Assignee = "";
                        if (item.Location == "Vui lòng chọn dịch vụ" || item.Location.Contains("Khách sạn") || item.Location.Contains("Nhà hàng") || item.Location.Contains("Chợ"))
                        {
                            item.Location = destination;
                        }
                        if (string.IsNullOrEmpty(item.Destination))
                        {
                            item.Destination = "Vui lòng chọn dịch vụ";
                        }
                    }
                    return items;
                }
                return mockData;
            }
            catch
            {
                return mockData;
            }
        }

        public async Task<TravelWorkspace.API.Models.DTOs.AiChatResponseDto> ChatAndModifyItineraryAsync(string userMessage, List<TravelWorkspace.API.Models.DTOs.ChatMessageDto> history, List<TravelWorkspace.API.Models.ItineraryItem> currentItems, TravelWorkspace.API.Models.Trip trip, string userApiKey = null)
        {
            var apiKey = !string.IsNullOrEmpty(userApiKey) ? userApiKey : _configuration["Gemini:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                var mockReply = new TravelWorkspace.API.Models.DTOs.AiChatResponseDto
                {
                    Reply = "Đây là trả lời mẫu vì chưa có API Key. Mình đã tiếp nhận yêu cầu: '" + userMessage + "'.",
                    Items = currentItems.Select(i => new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto
                    {
                        Title = i.Title,
                        Location = i.Location,
                        StartTime = i.StartTime,
                        EndTime = i.EndTime,
                        Transport = i.Transport,
                        Notes = i.Notes,
                        Assignee = i.Assignee,
                        Status = i.Status
                    }).ToList()
                };
                return mockReply;
            }

            var currentItineraryJson = JsonSerializer.Serialize(currentItems.Select(i => new
            {
                i.Title, i.Location, i.StartTime, i.EndTime, i.Transport, i.Notes
            }));

            var historyJson = JsonSerializer.Serialize(history);

            var shortOrigin = trip.Origin.Split(',').First().Trim();
            var shortDestination = trip.Destination.Split(',').First().Trim();

            var prompt = $@"You are an AI travel assistant. The user is asking a question or wants to change their itinerary.
Here is the context of their trip:
- Origin: {shortOrigin} (Full: {trip.Origin})
- Destination: {shortDestination} (Full: {trip.Destination})
- Start Date: {trip.StartDate:yyyy-MM-dd}
- End Date: {trip.EndDate:yyyy-MM-dd}
- Budget: {trip.Budget} VND
- Number of Participants: {trip.NumberOfParticipants}
- Preferences: {trip.Preferences}

Their current itinerary is: {currentItineraryJson}
Their recent chat history is: {historyJson}
Their latest request is: ""{userMessage}""

If the user is asking a general question (e.g., ""What to eat?"", ""Where to go?"", ""Is the budget enough?""), answer it helpfully in the 'reply' field and return the original itinerary unchanged in 'items'.
If the user is asking to modify the itinerary, make the changes in 'items' and confirm the changes in 'reply'.

Respond with ONLY a raw JSON object containing EXACTLY two keys:
1. 'reply': A friendly string responding to the user in Vietnamese.
2. 'items': A JSON array of the fully updated itinerary objects in the same format: title, location, destination, startTime, endTime, transport, notes. 
CRITICAL RULES for generating items:
- 'title' must be SHORT and concise (e.g. 'Khởi hành từ {shortOrigin} đi {shortDestination}', 'Tham quan Hải đăng Cô Tô'). NEVER use full addresses with commas.
- 'location' must be EXACTLY '{shortOrigin}' or '{shortDestination}'.
- 'destination' must be the specific place (e.g. 'Hải đăng Cô Tô', 'Nhà hàng ABC'). Keep it short, DO NOT append city/country names. If it requires booking (hotel, flight), set it to 'Vui lòng chọn dịch vụ'.

Do NOT use markdown code blocks like ```json. Just return the raw JSON object.";

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

            var contentString = JsonSerializer.Serialize(requestBody);
            HttpResponseMessage response = null;
            int maxRetries = 3;
            for (int i = 0; i < maxRetries; i++)
            {
                var content = new StringContent(contentString, Encoding.UTF8, "application/json");
                response = await _httpClient.PostAsync($"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}", content);
                if (response.IsSuccessStatusCode) break;
                if ((int)response.StatusCode == 503 || (int)response.StatusCode == 429)
                {
                    if (i < maxRetries - 1) await Task.Delay(2000 * (i + 1));
                    else break;
                }
                else break;
            }

            var fallbackResponse = new TravelWorkspace.API.Models.DTOs.AiChatResponseDto
            {
                Reply = "Xin lỗi, mình gặp lỗi khi kết nối với AI.",
                Items = currentItems.Select(i => new TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto
                {
                    Title = i.Title, Location = i.Location, Destination = i.Destination, StartTime = i.StartTime, EndTime = i.EndTime, Transport = i.Transport, Notes = i.Notes, Assignee = i.Assignee, Status = i.Status
                }).ToList()
            };

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Gemini API Error: {response.StatusCode} - {errorContent}");
                
                if ((int)response.StatusCode == 429)
                {
                    fallbackResponse.Reply = "Rất xin lỗi, hệ thống AI hiện tại đã hết lượt sử dụng miễn phí. Vui lòng thử lại sau ít phút nhé!";
                }
                else if ((int)response.StatusCode == 503)
                {
                    fallbackResponse.Reply = "Hệ thống AI đang quá tải do có quá nhiều yêu cầu. Bạn vui lòng chờ một lát rồi thử lại nha.";
                }
                else
                {
                    fallbackResponse.Reply = $"Lỗi kết nối AI: {response.StatusCode} - {errorContent}";
                }
                
                return fallbackResponse;
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
                    .GetString() ?? "{}";

                text = text.Replace("```json", "").Replace("```", "").Trim();
                int startIndex = text.IndexOf('{');
                int endIndex = text.LastIndexOf('}');
                if (startIndex >= 0 && endIndex > startIndex)
                {
                    text = text.Substring(startIndex, endIndex - startIndex + 1);
                }
                
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<TravelWorkspace.API.Models.DTOs.AiChatResponseDto>(text, options);
                
                if (result != null && result.Items != null)
                {
                    foreach (var item in result.Items)
                    {
                        if (string.IsNullOrEmpty(item.Status)) item.Status = "Chưa bắt đầu";
                        if (string.IsNullOrEmpty(item.Assignee)) item.Assignee = "";
                    }
                    return result;
                }
                return fallbackResponse;
            }
            catch
            {
                return fallbackResponse;
            }
        }
    }
}
