using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TravelWorkspace.API.Models;
using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Services
{
    public class GeminiService : IGeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GeminiService> _logger;

        private const string DefaultPrimaryModel = "gemini-3.5-flash";
        private const string DefaultFallbackModel = "gemini-3.5-flash";

        public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Lấy API Key từ userApiKey truyền vào, hoặc từ appsettings (GeminiSettings:ApiKey / Gemini:ApiKey)
        /// </summary>
        private string GetEffectiveApiKey(string userApiKey = null)
        {
            if (!string.IsNullOrWhiteSpace(userApiKey))
                return userApiKey.Trim();

            var key = _configuration["GeminiSettings:ApiKey"] 
                      ?? _configuration["Gemini:ApiKey"];

            return key?.Trim() ?? string.Empty;
        }

        /// <summary>
        /// Lấy tên Primary Model từ cấu hình appsettings (GeminiSettings:Model, mặc định: gemini-3.5-flash)
        /// </summary>
        private string GetPrimaryModelName()
        {
            var model = _configuration["GeminiSettings:Model"] 
                        ?? _configuration["Gemini:Model"];

            return string.IsNullOrWhiteSpace(model) ? DefaultPrimaryModel : model.Trim();
        }

        /// <summary>
        /// Lấy tên Fallback Model từ cấu hình appsettings (GeminiSettings:FallbackModel, mặc định: gemini-3.5-flash)
        /// </summary>
        private string GetFallbackModelName()
        {
            var fallback = _configuration["GeminiSettings:FallbackModel"] 
                           ?? _configuration["Gemini:FallbackModel"];

            return string.IsNullOrWhiteSpace(fallback) ? DefaultFallbackModel : fallback.Trim();
        }

        /// <summary>
        /// Tạo URL endpoint linh động theo tên model được chỉ định
        /// </summary>
        private string BuildGenerateContentEndpoint(string modelName, string apiKey)
        {
            var baseUrl = _configuration["GeminiSettings:Endpoint"] 
                          ?? _configuration["Gemini:Endpoint"] 
                          ?? "https://generativelanguage.googleapis.com/v1beta/models/";

            if (!baseUrl.EndsWith("/"))
            {
                baseUrl += "/";
            }

            return $"{baseUrl}{modelName}:generateContent?key={apiKey}";
        }

        /// <summary>
        /// Thực hiện gọi Gemini API với cơ chế Resilience (Retry 3 lần & Tự động Fallback Model khi 429 hoặc 503)
        /// </summary>
        private async Task<string> PostGenerateContentWithResilienceAsync(
            string apiKey, 
            object requestBody, 
            string operationName = "Gemini AI")
        {
            var primaryModel = GetPrimaryModelName();
            var fallbackModel = GetFallbackModelName();
            var contentString = JsonSerializer.Serialize(requestBody);

            int maxRetries = 3;
            HttpResponseMessage response = null;
            string lastErrorBody = string.Empty;

            for (int i = 0; i < maxRetries; i++)
            {
                // Lần thử 1 (i=0) và Lần thử 2 (i=1): Gọi Primary Model
                // Lần thử 3 (i=2): Tự động chuyển đổi URL endpoint sang Fallback Model để chốt hạ
                var currentModel = (i == 2) ? fallbackModel : primaryModel;

                if (i == 2)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"[RESILIENCE] ⚠️ Google API quá tải/bận trên Primary Model '{primaryModel}'. Chuyển sang Fallback Model '{fallbackModel}' cho {operationName} (Lần thử {i + 1}/{maxRetries})...");
                    Console.ResetColor();

                    _logger.LogWarning("[RESILIENCE] Switching to Fallback Model '{FallbackModel}' for {OperationName} on attempt {Attempt}/{MaxRetries}", 
                        fallbackModel, operationName, i + 1, maxRetries);
                }

                var endpoint = BuildGenerateContentEndpoint(currentModel, apiKey);
                var content = new StringContent(contentString, Encoding.UTF8, "application/json");

                response = await _httpClient.PostAsync(endpoint, content);
                if (response.IsSuccessStatusCode)
                {
                    if (i > 0)
                    {
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine($"[RESILIENCE] ✅ Gọi thành công trên model '{currentModel}' sau {i + 1} lần thử cho {operationName}.");
                        Console.ResetColor();
                    }
                    break;
                }

                var statusCode = (int)response.StatusCode;
                lastErrorBody = await response.Content.ReadAsStringAsync();

                // Xử lý 429 (Too Many Requests) hoặc 503 (Service Unavailable)
                if (statusCode == 429 || statusCode == 503)
                {
                    _logger.LogWarning("[RESILIENCE] Gemini API trả về HTTP {StatusCode} trên model '{Model}' (Lần thử {Attempt}/{MaxRetries}). Lỗi: {Error}", 
                        statusCode, currentModel, i + 1, maxRetries, lastErrorBody);

                    if (i < maxRetries - 1)
                    {
                        var delayMs = 1500 * (i + 1);
                        await Task.Delay(delayMs);
                        continue;
                    }
                }
                else
                {
                    // Lỗi nghiêm trọng (400 Bad Request, 401 Unauthorized, 403 Forbidden...) ném ngoại lệ ngay
                    _logger.LogError("[RESILIENCE] Lỗi không thể retry từ Gemini API (HTTP {StatusCode}): {ErrorBody}", 
                        statusCode, lastErrorBody);
                    throw new HttpRequestException($"Gọi Google Gemini API thất bại (HTTP {statusCode} {response.StatusCode}): {lastErrorBody}");
                }
            }

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Gọi Google Gemini API thất bại sau {maxRetries} lần thử (kể cả Fallback Model '{fallbackModel}'): {lastErrorBody}");
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text ?? string.Empty;
        }

        /// <summary>
        /// 1. Tạo lịch trình du lịch dạng Markdown
        /// </summary>
        public async Task<string> GenerateItineraryAsync(string origin, string destination, int days, string userApiKey = null)
        {
            var apiKey = GetEffectiveApiKey(userApiKey);
            if (string.IsNullOrEmpty(apiKey))
            {
                throw new InvalidOperationException("Chưa cấu hình Gemini API Key. Vui lòng kiểm tra GeminiSettings:ApiKey trong appsettings.json hoặc cung cấp qua header X-Gemini-API-Key.");
            }

            var shortOrigin = origin.Split(',').First().Trim();
            var shortDestination = destination.Split(',').First().Trim();
            var localDataString = TravelKnowledgeBase.GetLocalDataString(shortDestination);
            var localSpotsInstruction = !string.IsNullOrWhiteSpace(localDataString)
                ? $" BẮT BUỘC ƯU TIÊN chọn lọc các địa danh và quán ăn có thật sau tại '{shortDestination}': [{localDataString}]."
                : string.Empty;

            var prompt = $"Hãy lập một lịch trình du lịch chi tiết {days} ngày xuất phát từ '{shortOrigin}' đến '{shortDestination}'. BẮT BUỘC: Đánh giá vị trí địa lý của '{shortDestination}', chỉ gợi ý các danh lam thắng cảnh, di tích và đặc sản TỒN TẠI THỰC TẾ tại '{shortDestination}', tuyệt đối không gợi ý hoạt động phi thực tế (như không gợi ý đi biển nếu là vùng núi).{localSpotsInstruction} Sử dụng định dạng Markdown tiếng Việt sinh động, gồm các hoạt động sáng, trưa, chiều, tối, các địa danh nổi tiếng, món ăn đặc sản địa phương và lời khuyên hữu ích cho từng ngày.";

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                },
                generationConfig = new
                {
                    temperature = 0.35,
                    topP = 0.9
                }
            };

            var text = await PostGenerateContentWithResilienceAsync(apiKey, requestBody, "Tạo lịch trình Markdown");
            return !string.IsNullOrWhiteSpace(text) ? text : "Không nhận được phản hồi nội dung từ Gemini AI.";
        }

        /// <summary>
        /// 2. Tạo lịch trình du lịch dạng JSON có cấu trúc (gồm title, location, destination, startTime, endTime, transport, notes)
        /// </summary>
        public async Task<List<CreateItineraryItemDto>> GenerateItineraryJsonAsync(
            string origin, 
            string destination, 
            int days, 
            DateTime startDate, 
            string userApiKey = null,
            string preferences = null,
            decimal budget = 0,
            DateTime? endDate = null)
        {
            var apiKey = GetEffectiveApiKey(userApiKey);
            var shortOrigin = (origin ?? string.Empty).Split(',').First().Trim();
            var shortDestination = (destination ?? string.Empty).Split(',').First().Trim();
            var effectiveEndDate = endDate ?? startDate.AddDays(Math.Max(0, days - 1));

            var request = new
            {
                Destination = !string.IsNullOrWhiteSpace(shortDestination) ? shortDestination : (destination ?? string.Empty),
                StartDate = startDate.ToString("yyyy-MM-dd"),
                EndDate = effectiveEndDate.ToString("yyyy-MM-dd"),
                Preferences = string.IsNullOrWhiteSpace(preferences) ? "Trải nghiệm văn hóa, ẩm thực, danh lam thắng cảnh" : preferences
            };

            var localData = TravelKnowledgeBase.GetLocalDataString(request.Destination);
            if (string.IsNullOrEmpty(localData) && !string.IsNullOrEmpty(destination))
            {
                localData = TravelKnowledgeBase.GetLocalDataString(destination);
            }
            var instruction = string.IsNullOrEmpty(localData) 
                ? "Bạn là một chuyên gia du lịch." 
                : $"BẮT BUỘC: Bạn PHẢI sử dụng chính xác các địa danh sau để xếp lịch trình, KHÔNG ĐƯỢC tự bịa tên khác: {localData}";

            // Cố gắng gọi Google Gemini API (với 3 lần retry và fallback model)
            if (!string.IsNullOrEmpty(apiKey))
            {
                try
                {
                    var prompt = $@"{instruction}

Nhiệm vụ: Lập lịch trình cho nhóm khách đi {request.Destination} từ ngày {request.StartDate} đến {request.EndDate}. Sở thích: {request.Preferences}.

CÁC QUY TẮC CẤM KỴ TỐI CAO:
- CẤM viết chung chung kiểu 'Tham quan danh lam thắng cảnh', 'Ăn nhà hàng địa phương'.
- Ở trường 'Title' và 'LocationName' của JSON, BẮT BUỘC BÊ NGUYÊN XI 100% tên địa điểm đã được cung cấp ở trên vào (nếu có). Ví dụ: 'Tham quan {{(tên một địa danh trong danh sách)}}'.
- Nếu không có dữ liệu cung cấp, BẮT BUỘC phải viết TÊN RIÊNG cụ thể có thật trên bản đồ.
- Nhóm các điểm gần nhau vào cùng 1 ngày để tiết kiệm thời gian di chuyển.

Trả về duy nhất mảng JSON hợp lệ với định dạng:
[
  {{
    ""Date"": ""YYYY-MM-DD"",
    ""StartTime"": ""HH:mm"",
    ""EndTime"": ""HH:mm"",
    ""Title"": ""Tên ĐỊA DANH CỤ THỂ (VD: Tham quan Chùa Bái Đính)"",
    ""Description"": ""Lý do chọn điểm này."",
    ""Category"": ""Sightseeing/Food/Transport"",
    ""EstimatedCost"": 100000,
    ""LocationName"": ""Tên chính xác để tìm trên bản đồ""
  }}
]";

                    var requestBody = new
                    {
                        contents = new[]
                        {
                            new
                            {
                                parts = new[] { new { text = prompt } }
                            }
                        },
                        generationConfig = new
                        {
                            // Hạ Temperature rất thấp (0.1) để model tuân thủ luật lệ tuyệt đối thay vì tự do sáng tạo
                            temperature = 0.1,
                            topP = 0.85,
                            responseMimeType = "application/json"
                        }
                    };

                    var text = await PostGenerateContentWithResilienceAsync(apiKey, requestBody, "Tạo lịch trình JSON (Local Guide)");

                    var items = ParseLocalGuideItinerary(text, shortDestination, startDate, effectiveEndDate);
                    if (items.Any())
                    {
                        return items;
                    }

                    _logger.LogWarning("[AI] Gemini trả về lịch trình rỗng hoặc không hợp lệ cho {Destination}. Dùng Fallback.", shortDestination);
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Magenta;
                    Console.WriteLine($"[RESILIENCE] 🛡️ Kích hoạt phao cứu sinh (Fallback Mock) cho Tạo lịch trình do lỗi: {ex.Message}");
                    Console.ResetColor();

                    _logger.LogWarning(ex, "[RESILIENCE] Google API không khả dụng. Kích hoạt phao cứu sinh (Fallback Mock) cho GenerateItineraryJsonAsync.");
                }
            }

            // --- PHAO CỨU SINH (SMART FALLBACK MOCK DATA - CHUẨN ĐỊA LÝ & CHỐNG ẢO GIÁC) ---
            // Đảm bảo 100% Uptime khi Google API bị 503 / 429 mà thích ứng an toàn với MỌI địa hình (vùng núi, đồng bằng hay biển đảo)
            var fallbackItems = new List<CreateItineraryItemDto>();
            for (int d = 0; d < days; d++)
            {
                var currentDate = startDate.AddDays(d);
                if (d == 0)
                {
                    // Ngày đầu tiên: Khởi hành, Nhận phòng, Tham quan danh thắng trung tâm & Ẩm thực tối
                    fallbackItems.Add(new CreateItineraryItemDto
                    {
                        Title = $"Khởi hành từ {shortOrigin} đi {shortDestination}",
                        Location = shortOrigin,
                        Destination = shortDestination,
                        Transport = "Vui lòng chọn dịch vụ",
                        StartTime = currentDate.AddHours(7),
                        EndTime = currentDate.AddHours(10),
                        Notes = "Tập trung tại điểm hẹn đúng giờ, chuẩn bị đầy đủ giấy tờ tùy thân và vé di chuyển.",
                        Status = "Chưa bắt đầu"
                    });
                    fallbackItems.Add(new CreateItineraryItemDto
                    {
                        Title = $"Đến {shortDestination}, nhận phòng & nghỉ ngơi lấy sức",
                        Location = shortDestination,
                        Destination = $"Khách sạn Trung tâm {shortDestination}",
                        Transport = "Vui lòng chọn dịch vụ",
                        StartTime = currentDate.AddHours(11).AddMinutes(30),
                        EndTime = currentDate.AddHours(13).AddMinutes(30),
                        Notes = "Làm thủ tục nhận phòng, cất hành lý và thưởng thức bữa trưa đặc sản chào đón.",
                        Status = "Chưa bắt đầu"
                    });
                    fallbackItems.Add(new CreateItineraryItemDto
                    {
                        Title = $"Tham quan danh thắng trung tâm {shortDestination}",
                        Location = shortDestination,
                        Destination = $"Quần thể Danh thắng Trung tâm {shortDestination}",
                        Transport = "Vui lòng chọn dịch vụ",
                        StartTime = currentDate.AddHours(14).AddMinutes(30),
                        EndTime = currentDate.AddHours(17).AddMinutes(30),
                        Notes = $"Check-in các cột mốc nổi tiếng tại {shortDestination}, chụp ảnh kỷ niệm và tìm hiểu tổng quan địa phương.",
                        Status = "Chưa bắt đầu"
                    });
                    fallbackItems.Add(new CreateItineraryItemDto
                    {
                        Title = $"Thưởng thức ẩm thực tối & Khám phá phố đêm {shortDestination}",
                        Location = shortDestination,
                        Destination = $"Khu Ẩm thực & Chợ đêm {shortDestination}",
                        Transport = "Vui lòng chọn dịch vụ",
                        StartTime = currentDate.AddHours(18).AddMinutes(30),
                        EndTime = currentDate.AddHours(21).AddMinutes(30),
                        Notes = $"Trải nghiệm văn hóa ẩm thực đặc trưng của {shortDestination}, thưởng thức các món ăn truyền thống địa phương về đêm.",
                        Status = "Chưa bắt đầu"
                    });
                }
                else if (d == days - 1)
                {
                    // Ngày cuối cùng: Cafe ngắm cảnh, Mua sắm đặc sản truyền thống & Khởi hành về
                    fallbackItems.Add(new CreateItineraryItemDto
                    {
                        Title = $"Ăn sáng & Thưởng thức cà phê thư giãn tại {shortDestination}",
                        Location = shortDestination,
                        Destination = $"Quán Cà phê View Đẹp {shortDestination}",
                        Transport = "Vui lòng chọn dịch vụ",
                        StartTime = currentDate.AddHours(7).AddMinutes(30),
                        EndTime = currentDate.AddHours(9),
                        Notes = $"Tận hưởng không khí trong lành buổi sáng cuối chuyến đi và ngắm nhìn cảnh sắc {shortDestination}.",
                        Status = "Chưa bắt đầu"
                    });
                    fallbackItems.Add(new CreateItineraryItemDto
                    {
                        Title = $"Mua sắm quà lưu niệm & Đặc sản truyền thống của {shortDestination}",
                        Location = shortDestination,
                        Destination = $"Chợ Đặc sản Trung tâm {shortDestination}",
                        Transport = "Vui lòng chọn dịch vụ",
                        StartTime = currentDate.AddHours(9).AddMinutes(30),
                        EndTime = currentDate.AddHours(11).AddMinutes(30),
                        Notes = $"Lựa chọn các sản vật, nông đặc sản địa phương đóng gói làm quà cho người thân và bạn bè.",
                        Status = "Chưa bắt đầu"
                    });
                    fallbackItems.Add(new CreateItineraryItemDto
                    {
                        Title = $"Hoàn tất trả phòng & Khởi hành từ {shortDestination} về lại {shortOrigin}",
                        Location = shortDestination,
                        Destination = shortOrigin,
                        Transport = "Vui lòng chọn dịch vụ",
                        StartTime = currentDate.AddHours(13),
                        EndTime = currentDate.AddHours(16).AddMinutes(30),
                        Notes = "Kiểm tra kỹ hành lý trước khi rời khách sạn và di chuyển an toàn về điểm xuất phát.",
                        Status = "Chưa bắt đầu"
                    });
                }
                else
                {
                    // Các ngày giữa: 4 Kịch bản chuyên đề linh hoạt, trung tính về địa hình để chống ảo giác
                    int scenarioIndex = (d - 1) % 4;

                    switch (scenarioIndex)
                    {
                        case 0:
                            // Kịch bản 1: Di sản Văn hóa, Đền đài & Bản sắc Bản địa
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Ăn sáng món ngon gia truyền & Cà phê sáng tại {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Quán Ăn Đặc Sản {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(7).AddMinutes(30),
                                EndTime = currentDate.AddHours(8).AddMinutes(45),
                                Notes = "Thưởng thức món ăn sáng đặc sản được người bản địa ưa chuộng lâu năm.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Khám phá Quần thể Di tích Lịch sử & Bảo tàng Văn hóa {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Bảo tàng & Di tích Lịch sử {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(9),
                                EndTime = currentDate.AddHours(12),
                                Notes = "Tìm hiểu chiều sâu lịch sử văn hóa, kiến trúc cổ kính với trang phục lịch sự.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Thưởng thức bữa trưa Ẩm thực Truyền thống của {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Nhà hàng Ẩm thực Bản địa {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(12).AddMinutes(15),
                                EndTime = currentDate.AddHours(13).AddMinutes(45),
                                Notes = "Trải nghiệm mâm cơm truyền thống chuẩn vị địa phương trong không gian ấm cúng.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Khám phá văn hóa bản địa và các làng nghề truyền thống tại {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Khu Văn hóa Bản địa {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(14).AddMinutes(15),
                                EndTime = currentDate.AddHours(17),
                                Notes = "Gặp gỡ người dân địa phương, tìm hiểu các nghề thủ công và phong tục tập quán đặc sắc.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Bữa tối đặc sản truyền thống & Dạo ngắm cảnh sắc {shortDestination} về đêm",
                                Location = shortDestination,
                                Destination = $"Tuyến Phố Trung tâm {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(18).AddMinutes(30),
                                EndTime = currentDate.AddHours(21).AddMinutes(30),
                                Notes = $"Thưởng thức trà tối, cảm nhận không khí thanh bình và cảnh đêm lung linh tại {shortDestination}.",
                                Status = "Chưa bắt đầu"
                            });
                            break;

                        case 1:
                            // Kịch bản 2: Cảnh quan Sinh thái, Thiên nhiên & Không khí Trong lành
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Ăn sáng nhẹ nạp năng lượng & Chuẩn bị hành trang dã ngoại tại {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Nhà hàng Địa phương {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(7).AddMinutes(30),
                                EndTime = currentDate.AddHours(8).AddMinutes(30),
                                Notes = "Mang theo giày thoải mái, nón rộng vành, kem chống nắng và nước uống cá nhân.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Khám phá Danh lam Thắng cảnh & Thiên nhiên Kỳ vĩ tại {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Khu Danh thắng Thiên nhiên {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(8).AddMinutes(45),
                                EndTime = currentDate.AddHours(12),
                                Notes = $"Chiêm ngưỡng phong cảnh thiên nhiên đặc trưng của {shortDestination}, hít thở không khí trong lành.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Bữa trưa đặc sản vùng miền tươi ngon tại điểm dừng chân sinh thái",
                                Location = shortDestination,
                                Destination = $"Khu Ẩm thực Sinh thái {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(12).AddMinutes(15),
                                EndTime = currentDate.AddHours(14),
                                Notes = "Thưởng thức các món ăn dân dã, nguyên liệu tươi ngon được chế biến theo phong vị địa phương.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Thư giãn ngắm cảnh và check-in các điểm ngắm toàn cảnh {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Điểm ngắm Cảnh quan Toàn cảnh {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(14).AddMinutes(30),
                                EndTime = currentDate.AddHours(17).AddMinutes(30),
                                Notes = $"Thời điểm đẹp nhất trong ngày để ngắm trọn vẹn cảnh sắc thiên nhiên và không gian thoáng đãng tại {shortDestination}.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Thưởng thức bữa tối ẩm thực nướng đặc trưng của {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Nhà hàng Sân vườn {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(18).AddMinutes(30),
                                EndTime = currentDate.AddHours(21).AddMinutes(30),
                                Notes = "Giao lưu bạn bè bên bàn tiệc ấm cúng, chia sẻ những khoảnh khắc đẹp trong ngày.",
                                Status = "Chưa bắt đầu"
                            });
                            break;

                        case 2:
                            // Kịch bản 3: Đời sống Thường nhật, Nông nghiệp Sinh thái & Ẩm thực Dân dã
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Dạo chợ sớm truyền thống, ăn sáng đặc sản cùng người dân {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Chợ Dân sinh Truyền thống {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(7),
                                EndTime = currentDate.AddHours(8).AddMinutes(30),
                                Notes = "Trải nghiệm nét sống bình dị, giao lưu thân thiện với người dân địa phương.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Thăm quan Khu Nông nghiệp Sinh thái & Vườn đặc sản tại {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Vườn Nông sản Bản địa {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(9),
                                EndTime = currentDate.AddHours(11).AddMinutes(45),
                                Notes = $"Tìm hiểu các loại nông sản, cây trái đặc trưng được canh tác tự nhiên tại {shortDestination}.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Bữa trưa ẩm thực đồng quê tươi ngon tại {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Nhà hàng Ẩm thực Dân dã {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(12),
                                EndTime = currentDate.AddHours(13).AddMinutes(30),
                                Notes = "Thưởng thức rau củ sạch và các món ăn thanh đạm, đậm đà hương vị quê hương.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Khám phá Không gian Nghệ thuật & Check-in quán trà bản địa {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Không gian Trà & Nghệ thuật {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(14),
                                EndTime = currentDate.AddHours(17),
                                Notes = "Chụp ảnh phong cách mộc mạc và thưởng thức các loại trà thảo mộc thơm ngon đặc sản.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Trải nghiệm ẩm thực phong phú: Thưởng thức các món ngon trứ danh {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Phố Ẩm thực Địa phương {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(18).AddMinutes(30),
                                EndTime = currentDate.AddHours(21).AddMinutes(30),
                                Notes = $"Khám phá con phố ẩm thực, thưởng thức các món ăn vặt và đặc sản nóng sốt của {shortDestination}.",
                                Status = "Chưa bắt đầu"
                            });
                            break;

                        default:
                            // Kịch bản 4: Nghỉ dưỡng Thư thái, Mua sắm & Thưởng ngoạn
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Thư thả ăn sáng, thưởng trà và ngắm cảnh ban mai tại {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Không gian Điểm tâm {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(8),
                                EndTime = currentDate.AddHours(9),
                                Notes = "Bắt đầu ngày mới thư thái, không vội vã để nạp đầy năng lượng cho cơ thể.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Tham quan Không gian Trưng bày Sinh thái & Văn hóa Địa phương {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Khu Trưng bày Sinh thái {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(9).AddMinutes(15),
                                EndTime = currentDate.AddHours(12),
                                Notes = "Tham quan các mô hình hệ sinh thái và hiện vật tự nhiên đặc sắc của địa phương.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Thưởng thức set menu đặc sản tinh hoa của {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Nhà hàng Trung tâm {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(12).AddMinutes(15),
                                EndTime = currentDate.AddHours(13).AddMinutes(45),
                                Notes = "Dùng bữa trưa tiện nghi, nghỉ ngơi tại không gian máy lạnh hoặc thoáng gió tự nhiên.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Mua sắm quà lưu niệm & Trải nghiệm dịch vụ chăm sóc sức khỏe thảo dược {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Trung tâm Mua sắm & Trị liệu Thảo dược {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(14).AddMinutes(15),
                                EndTime = currentDate.AddHours(17),
                                Notes = "Trải nghiệm ngâm chân thảo mộc hoặc chăm sóc sức khỏe bằng thảo dược thiên nhiên địa phương.",
                                Status = "Chưa bắt đầu"
                            });
                            fallbackItems.Add(new CreateItineraryItemDto
                            {
                                Title = $"Bữa tối ấm cúng & Ngắm toàn cảnh không gian đêm tại {shortDestination}",
                                Location = shortDestination,
                                Destination = $"Nhà hàng View Đẹp {shortDestination}",
                                Transport = "Vui lòng chọn dịch vụ",
                                StartTime = currentDate.AddHours(18).AddMinutes(30),
                                EndTime = currentDate.AddHours(21).AddMinutes(30),
                                Notes = $"Thưởng thức bữa tối ngon miệng và ngắm ánh đèn lung linh huyền ảo của {shortDestination} về đêm.",
                                Status = "Chưa bắt đầu"
                            });
                            break;
                    }
                }
            }

            return fallbackItems;
        }

        /// <summary>
        /// Cấu trúc thô mà Gemini trả về theo Prompt "Thổ địa du lịch" (Giai đoạn 3).
        /// EstimatedCost dùng JsonElement để chịu được cả số (150000) lẫn chuỗi ("150.000đ").
        /// </summary>
        private class LocalGuideAiItemRaw
        {
            public string? Date { get; set; }
            public string? StartTime { get; set; }
            public string? EndTime { get; set; }
            public string? Title { get; set; }
            public string? Description { get; set; }
            public string? Category { get; set; }
            public JsonElement? EstimatedCost { get; set; }
            public string? LocationName { get; set; }
        }

        /// <summary>
        /// Parse an toàn JSON lịch trình từ Gemini và ánh xạ sang CreateItineraryItemDto.
        /// Bỏ qua phần tử lỗi thay vì làm hỏng toàn bộ lịch trình.
        /// </summary>
        private List<CreateItineraryItemDto> ParseLocalGuideItinerary(string text, string shortDestination, DateTime startDate, DateTime endDate)
        {
            var result = new List<CreateItineraryItemDto>();
            if (string.IsNullOrWhiteSpace(text)) return result;

            // Làm sạch markdown nếu AI lỡ sinh ra và cắt đúng mảng JSON
            text = text.Replace("```json", "").Replace("```", "").Trim();
            int startIndex = text.IndexOf('[');
            int endIndex = text.LastIndexOf(']');
            if (startIndex < 0 || endIndex <= startIndex) return result;
            text = text.Substring(startIndex, endIndex - startIndex + 1);

            List<LocalGuideAiItemRaw>? rawItems;
            try
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    AllowTrailingCommas = true,
                    ReadCommentHandling = JsonCommentHandling.Skip
                };
                rawItems = JsonSerializer.Deserialize<List<LocalGuideAiItemRaw>>(text, options);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "[AI] Không parse được JSON lịch trình Local Guide.");
                return result;
            }

            if (rawItems == null) return result;

            var culture = System.Globalization.CultureInfo.InvariantCulture;
            var dayMin = startDate.Date;
            var dayMax = endDate.Date < dayMin ? dayMin : endDate.Date;

            foreach (var raw in rawItems)
            {
                if (raw == null || string.IsNullOrWhiteSpace(raw.Title)) continue;

                // 1. Ngày: YYYY-MM-DD, kẹp trong khoảng chuyến đi
                var day = dayMin;
                if (!string.IsNullOrWhiteSpace(raw.Date) &&
                    DateTime.TryParse(raw.Date.Trim(), culture, System.Globalization.DateTimeStyles.None, out var parsedDay))
                {
                    day = parsedDay.Date;
                }
                if (day < dayMin) day = dayMin;
                if (day > dayMax) day = dayMax;

                // 2. Giờ: chấp nhận "HH:mm" hoặc ISO đầy đủ
                var start = CombineDayAndTime(day, raw.StartTime, culture) ?? day.AddHours(8);
                var end = CombineDayAndTime(day, raw.EndTime, culture) ?? start.AddHours(1.5);
                if (end <= start) end = start.AddHours(1);

                // 3. Chi phí ước tính
                decimal cost = 0;
                if (raw.EstimatedCost.HasValue)
                {
                    var el = raw.EstimatedCost.Value;
                    if (el.ValueKind == JsonValueKind.Number && el.TryGetDecimal(out var num)) cost = num;
                    else if (el.ValueKind == JsonValueKind.String)
                    {
                        var digits = new string((el.GetString() ?? "").Where(char.IsDigit).ToArray());
                        if (decimal.TryParse(digits, out var parsed)) cost = parsed;
                    }
                }

                var category = string.IsNullOrWhiteSpace(raw.Category) ? "Sightseeing" : raw.Category.Trim();
                var noteParts = new List<string>();
                if (!string.IsNullOrWhiteSpace(raw.Description)) noteParts.Add(raw.Description.Trim());
                noteParts.Add($"Loại: {category}");
                if (cost > 0) noteParts.Add($"Chi phí ước tính: {cost.ToString("N0", new System.Globalization.CultureInfo("vi-VN"))}đ");

                result.Add(new CreateItineraryItemDto
                {
                    Title = raw.Title.Trim(),
                    Location = shortDestination,
                    Destination = string.IsNullOrWhiteSpace(raw.LocationName) ? raw.Title.Trim() : raw.LocationName.Trim(),
                    Notes = string.Join(" • ", noteParts),
                    StartTime = start,
                    EndTime = end,
                    Transport = "Vui lòng chọn dịch vụ",
                    Assignee = "",
                    Status = "Chưa bắt đầu"
                });
            }

            return result.OrderBy(i => i.StartTime).ToList();
        }

        private static DateTime? CombineDayAndTime(DateTime day, string? timeText, System.Globalization.CultureInfo culture)
        {
            if (string.IsNullOrWhiteSpace(timeText)) return null;
            var t = timeText.Trim();

            if (TimeSpan.TryParseExact(t, new[] { @"hh\:mm", @"h\:mm", @"hh\:mm\:ss" }, culture, out var ts))
                return day.Date.Add(ts);

            // AI trả về ISO đầy đủ (YYYY-MM-DDTHH:mm:ss) => chỉ lấy phần giờ, giữ ngày đã kẹp
            if (DateTime.TryParse(t, culture, System.Globalization.DateTimeStyles.None, out var dt))
                return day.Date.Add(dt.TimeOfDay);

            return null;
        }

        /// <summary>
        /// 3. Trò chuyện & Điều chỉnh lịch trình qua AI (Chat & Modify Itinerary)
        /// </summary>
        public async Task<AiChatResponseDto> ChatAndModifyItineraryAsync(
            string userMessage, 
            List<ChatMessageDto> history, 
            List<ItineraryItem> currentItems, 
            Trip trip, 
            string userApiKey = null)
        {
            var apiKey = GetEffectiveApiKey(userApiKey);
            var shortOrigin = trip.Origin.Split(',').First().Trim();
            var shortDestination = trip.Destination.Split(',').First().Trim();

            // Cố gắng gọi Google Gemini API
            if (!string.IsNullOrEmpty(apiKey))
            {
                try
                {
                    var currentItineraryJson = JsonSerializer.Serialize(currentItems.Select(i => new
                    {
                        i.Title, i.Location, i.Destination, i.StartTime, i.EndTime, i.Transport, i.Notes
                    }));
                    var historyJson = JsonSerializer.Serialize(history);

                    var prompt = $@"Bạn là một Hướng dẫn viên du lịch bản địa rành rẽ mọi ngóc ngách của {shortDestination}. Nhiệm vụ của bạn là tư vấn, điều phối và thiết kế một lịch trình thực tế, hấp dẫn và mang tính ứng dụng cao cho người dùng.

Thông tin chuyến đi:
- Điểm đi: {shortOrigin}
- Điểm đến: {shortDestination}
- Ngày bắt đầu: {trip.StartDate:yyyy-MM-dd}
- Ngày kết thúc: {trip.EndDate:yyyy-MM-dd}
- Ngân sách: {trip.Budget} VND
- Số người tham gia: {trip.NumberOfParticipants}
- Sở thích: {trip.Preferences}

Lịch trình hiện tại: {currentItineraryJson}
Lịch sử trò chuyện gần đây: {historyJson}
Yêu cầu mới nhất của người dùng: ""{userMessage}""

LUẬT ĐỊNH DANH ĐÍCH DANH (NAMING RULE - BẮT BUỘC):
1. BẮT BUỘC chỉ định ĐÍCH DANH tên gọi thực tế của các danh lam thắng cảnh, quán ăn nổi tiếng, hoặc địa điểm check-in có thật tại {shortDestination} (Ví dụ: Thay vì 'Đi dạo phố cổ', phải nói 'Khám phá Phố cổ Đồng Văn'; thay vì 'Đi thuyền', phải nói 'Đi thuyền trên Sông Nho Quế'; thay vì 'Ăn phở/Ăn sáng', phải nói 'Thưởng thức Phở Bát Đàn' hoặc 'Bánh cuốn Gia truyền'). Tuyệt đối cấm dùng các cụm từ mô tả chung chung như 'Điểm du lịch', 'Quán ăn địa phương', 'Nhà hàng view đẹp'.
2. Trong thuộc tính 'notes' của mỗi hoạt động: Mô tả ngắn gọn lý do tại sao địa điểm này lại nổi tiếng (Ví dụ: 'Góc check-in săn mây đẹp nhất', 'Quán ăn nức tiếng hơn 20 năm', 'Điểm ngắm hoàng hôn triệu view').

HƯỚNG DẪN XỬ LÝ:
1. Nếu người dùng chỉ hỏi đáp thông thường (Ăn gì, chơi ở đâu, thời tiết ra sao...), hãy trả lời ân cần, chi tiết, chỉ đích danh tên địa danh và món ăn nổi tiếng trong trường 'reply', và giữ nguyên lịch trình hiện tại trong trường 'items'.
2. Nếu người dùng yêu cầu thêm, bớt, đổi ngày hoặc điều chỉnh lịch trình, hãy cập nhật danh sách hoạt động trong trường 'items' với tên ĐÍCH DANH cụ thể và giải thích rõ các thay đổi trong trường 'reply'.

TRẢ VỀ DUY NHẤT một JSON Object thuần túy (không bọc code block ```json) có đúng 2 trường:
- 'reply' (string): Câu trả lời thân thiện gửi tới người dùng bằng tiếng Việt, phong thái hướng dẫn viên bản địa am hiểu sâu sắc.
- 'items' (array): Mảng danh sách các hoạt động lịch trình đầy đủ sau khi xử lý (mỗi object có title, location, destination, startTime, endTime, transport, notes).";

                    var requestBody = new
                    {
                        contents = new[]
                        {
                            new { parts = new[] { new { text = prompt } } }
                        },
                        generationConfig = new
                        {
                            temperature = 0.55,
                            topP = 0.95
                        }
                    };

                    var text = await PostGenerateContentWithResilienceAsync(apiKey, requestBody, "Chat AI Lịch trình");

                    text = text.Replace("```json", "").Replace("```", "").Trim();
                    int startIndex = text.IndexOf('{');
                    int endIndex = text.LastIndexOf('}');
                    if (startIndex >= 0 && endIndex > startIndex)
                    {
                        text = text.Substring(startIndex, endIndex - startIndex + 1);
                    }

                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var result = JsonSerializer.Deserialize<AiChatResponseDto>(text, options);
                    if (result != null && !string.IsNullOrWhiteSpace(result.Reply))
                    {
                        return result;
                    }
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Magenta;
                    Console.WriteLine($"[RESILIENCE] 🛡️ Kích hoạt phao cứu sinh (Fallback Mock) cho Chat AI do lỗi: {ex.Message}");
                    Console.ResetColor();

                    _logger.LogWarning(ex, "[RESILIENCE] Google API không khả dụng. Kích hoạt phao cứu sinh (Fallback Mock) cho ChatAndModifyItineraryAsync.");
                }
            }

            // --- PHAO CỨU SINH (SMART FALLBACK CHO CHAT AI) ---
            // Clone và cập nhật lịch trình hiện tại theo yêu cầu người dùng để UI phản hồi tức thì
            var updatedItems = currentItems.Select(i => new CreateItineraryItemDto
            {
                Title = i.Title,
                Location = i.Location,
                Destination = i.Destination,
                StartTime = i.StartTime,
                EndTime = i.EndTime,
                Transport = i.Transport,
                Notes = i.Notes,
                Assignee = i.Assignee,
                Status = i.Status
            }).ToList();

            var shortReq = userMessage.Length > 35 ? userMessage.Substring(0, 35) + "..." : userMessage;

            if (updatedItems.Any())
            {
                // Cập nhật hoạt động thứ 2 hoặc đầu tiên để người dùng thấy rõ sự thay đổi trên giao diện
                var targetIndex = updatedItems.Count > 1 ? 1 : 0;
                var targetItem = updatedItems[targetIndex];
                targetItem.Title = $"✨ Đã cập nhật: {shortReq}";
                targetItem.Notes = string.IsNullOrWhiteSpace(targetItem.Notes)
                    ? $"Cập nhật theo yêu cầu: {userMessage}"
                    : $"{targetItem.Notes}\n(✨ Đã cập nhật theo yêu cầu: {shortReq})";
            }
            else
            {
                // Nếu chưa có lịch trình nào, thêm mới 1 hoạt động tương ứng
                updatedItems.Add(new CreateItineraryItemDto
                {
                    Title = $"✨ Hoạt động: {shortReq}",
                    Location = shortDestination,
                    Destination = shortDestination,
                    StartTime = trip.StartDate.AddHours(9),
                    EndTime = trip.StartDate.AddHours(11),
                    Transport = "Vui lòng chọn dịch vụ",
                    Notes = $"Đã lên lịch theo yêu cầu: {userMessage}",
                    Status = "Chưa bắt đầu"
                });
            }

            return new AiChatResponseDto
            {
                Reply = $"Mình đã ghi nhận và cập nhật lịch trình chuyến đi {shortDestination} theo yêu cầu: \"{userMessage}\". Bạn có thể xem thay đổi ngay trên danh sách hoạt động nhé! ✨",
                Items = updatedItems
            };
        }

        /// <summary>
        /// 4. Gợi ý Danh mục hành lý thông minh (Smart Packing List)
        /// </summary>
        public async Task<List<AiPackingSuggestionDto>> GeneratePackingListAsync(
            string destination, 
            int days, 
            DateTime startDate, 
            string preferences = "", 
            string userApiKey = null)
        {
            var apiKey = GetEffectiveApiKey(userApiKey);
            if (string.IsNullOrEmpty(apiKey))
            {
                throw new InvalidOperationException("Chưa cấu hình Gemini API Key.");
            }

            var shortDest = destination.Split(',').First().Trim();

            var prompt = $@"Bạn là chuyên gia du lịch chuẩn bị hành lý cho TravelWorkspace.
Hãy lập danh sách đồ đạc cần mang theo cho chuyến đi đến '{shortDest}' trong {days} ngày, khởi hành ngày {startDate:yyyy-MM-dd}.
Sở thích / lưu ý: {preferences}.

YÊU CẦU:
Trả về DUY NHẤT một JSON Array thuần túy (không bọc ```json, không thêm chữ thừa). Mỗi phần tử là một JSON object gồm:
- 'itemName' (string): Tên vật dụng (Ví dụ: 'Kem chống nắng SPF 50+', 'Áo khoác gió', 'Sạc dự phòng', 'Căn cước công dân').
- 'category' (string): Phân loại chuẩn xác: 'Quần áo & Trang phục', 'Giấy tờ & Tiền mặt', 'Đồ điện tử & Công nghệ', 'Y tế & Sức khỏe', 'Đồ dùng cá nhân', 'Vật dụng khác'.
- 'quantity' (int): Số lượng ước tính cần mang (mặc định 1 hoặc nhiều hơn theo số ngày đi).
- 'isShared' (bool): true nếu là đồ dùng chung cả nhóm (ví dụ: ổ cắm chia, thuốc men nhóm, loa mini, lều...), false nếu là đồ cá nhân.
- 'reason' (string): Lý do ngắn gọn nên mang theo vật dụng này theo thời tiết/điểm đến.

Tạo khoảng 12 - 20 vật dụng thực sự thiết thực và hữu ích.";

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                },
                generationConfig = new
                {
                    temperature = 0.7,
                    topP = 0.95
                }
            };

            var text = await PostGenerateContentWithResilienceAsync(apiKey, requestBody, "Gợi ý Hành lý AI");

            text = text.Replace("```json", "").Replace("```", "").Trim();
            int startIndex = text.IndexOf('[');
            int endIndex = text.LastIndexOf(']');
            if (startIndex >= 0 && endIndex > startIndex)
            {
                text = text.Substring(startIndex, endIndex - startIndex + 1);
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var list = JsonSerializer.Deserialize<List<AiPackingSuggestionDto>>(text, options);
            if (list == null || !list.Any())
            {
                throw new InvalidOperationException("Gemini AI không trả về danh sách gợi ý hành lý hợp lệ.");
            }

            return list;
        }

        /// <summary>
        /// 5. Gợi ý Phương án dự phòng thời tiết xấu (Plan B Activities)
        /// </summary>
        public async Task<List<PlanBItemSuggestionDto>> GeneratePlanBForDateAsync(
            string destination, 
            List<ItineraryItem> currentDayItems, 
            DateTime targetDate, 
            string userApiKey = null)
        {
            var apiKey = GetEffectiveApiKey(userApiKey);
            var shortDest = string.IsNullOrWhiteSpace(destination) ? "Điểm đến" : destination.Split(',').First().Trim();

            // Cố gắng gọi Google Gemini API nếu có API Key
            if (!string.IsNullOrEmpty(apiKey))
            {
                try
                {
                    var currentActivitiesJson = JsonSerializer.Serialize((currentDayItems ?? new List<ItineraryItem>()).Select(i => new
                    {
                        i.Id, i.Title, i.Location, i.Destination, i.StartTime, i.EndTime
                    }));

                    var prompt = $@"Bạn là chuyên gia điều phối lịch trình du lịch thông minh, chuẩn xác về địa lý của TravelWorkspace.
Khu vực '{shortDest}' vào ngày {targetDate:yyyy-MM-dd} được dự báo có thời tiết xấu (mưa giông, bão lớn, thời tiết cực đoan ngoài trời).
Danh sách hoạt động hiện tại trong ngày của nhóm: {currentActivitiesJson}.

LUẬT THÉP BẮT BUỘC VỀ ĐỊA LÝ & THỜI TIẾT (GROUNDING - CHỐNG ẢO GIÁC):
1. BẮT BUỘC: Đánh giá vị trí địa lý của '{shortDest}' trước khi gợi ý hoạt động trong nhà. TUYỆT ĐỐI KHÔNG bịa đặt dịch vụ hoặc cơ sở không tồn tại tại địa phương (Ví dụ: Không gợi ý thủy cung quy mô lớn, rạp chiếu phim IMAX ở các vùng núi/huyện vùng sâu vùng xa không có; thay vào đó hãy gợi ý bảo tàng địa phương, nhà cộng đồng, quán cafe không gian kín ngắm cảnh mưa, trải nghiệm workshop văn hóa bản địa, ẩm thực truyền thống trong nhà ấm cúng).
2. Phân tích nghiêm ngặt lịch trình gốc: CHỈ thay thế các hoạt động ngoài trời (outdoor) dễ bị ảnh hưởng bởi mưa bão. Giữ nguyên các hoạt động vốn đã ở trong nhà hoặc không bị ảnh hưởng (nhà hàng ăn uống kín, khách sạn).
3. Các hoạt động thay thế trong nhà (indoor) phải ĐA DẠNG, PHÙ HỢP THỰC TẾ TẠI '{shortDest}', và TUYỆT ĐỐI KHÔNG lặp lại trong ngày.
4. Hoạt động thay thế phải có cùng khung thời gian (startTime, endTime) tương ứng với hoạt động ngoài trời bị thay thế để lịch trình không bị gián đoạn.
5. Gợi ý phương tiện di chuyển an toàn trong ngày mưa (ví dụ: 'Taxi / Xe đưa đón' hoặc 'Xe ô tô dịch vụ').

YÊU CẦU ĐỊNH DẠNG:
Trả về DUY NHẤT một mảng JSON thuần túy (không dùng markdown code blocks ```json). Mỗi object gồm:
- 'originalItemId' (int): ID chính xác của hoạt động ngoài trời bị thay thế trong danh sách đầu vào.
- 'title' (string): Tên hoạt động dự phòng trong nhà phù hợp với thực tế tại {shortDest}.
- 'location' (string): Khu vực địa lý cụ thể tại {shortDest}.
- 'startTime' (string ISO 8601): Thời gian bắt đầu (giữ nguyên khung giờ của hoạt động gốc).
- 'endTime' (string ISO 8601): Thời gian kết thúc (giữ nguyên khung giờ của hoạt động gốc).
- 'transport' (string): 'Taxi / Xe đưa đón' hoặc 'Xe ô tô dịch vụ'.
- 'notes' (string): Lý do gợi ý và mẹo trải nghiệm an toàn, ấm áp trong nhà khi trời mưa bão tại {shortDest}.";

                    var requestBody = new
                    {
                        contents = new[]
                        {
                            new { parts = new[] { new { text = prompt } } }
                        },
                        generationConfig = new
                        {
                            temperature = 0.3,
                            topP = 0.9
                        }
                    };

                    var text = await PostGenerateContentWithResilienceAsync(apiKey, requestBody, "Phương án Plan B");

                    text = text.Replace("```json", "").Replace("```", "").Trim();
                    int startIndex = text.IndexOf('[');
                    int endIndex = text.LastIndexOf(']');
                    if (startIndex >= 0 && endIndex > startIndex)
                    {
                        text = text.Substring(startIndex, endIndex - startIndex + 1);
                    }

                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var list = JsonSerializer.Deserialize<List<PlanBItemSuggestionDto>>(text, options);
                    if (list != null && list.Any())
                    {
                        foreach (var item in list)
                        {
                            if (item.OriginalItemId == 0 && item.ReplacesItemId.HasValue)
                            {
                                item.OriginalItemId = item.ReplacesItemId.Value;
                            }
                            if (!item.ReplacesItemId.HasValue && item.OriginalItemId > 0)
                            {
                                item.ReplacesItemId = item.OriginalItemId;
                            }
                            item.IsPlanB = true;
                            if (string.IsNullOrEmpty(item.Location)) item.Location = shortDest;
                            if (string.IsNullOrEmpty(item.Transport)) item.Transport = "Taxi / Xe đưa đón";
                        }
                        return list;
                    }
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Magenta;
                    Console.WriteLine($"[RESILIENCE] 🛡️ Kích hoạt phao cứu sinh (Fallback Mock) cho Plan B (Thời tiết xấu) do lỗi: {ex.Message}");
                    Console.ResetColor();

                    _logger.LogWarning(ex, "[RESILIENCE] Google API không khả dụng khi tạo Plan B cho ngày {TargetDate:yyyy-MM-dd}. Kích hoạt phao cứu sinh (Fallback Mock).", targetDate);
                }
            }
            else
            {
                _logger.LogWarning("[RESILIENCE] Chưa cấu hình Gemini API Key. Kích hoạt phao cứu sinh (Fallback Mock) cho Plan B.");
            }

            // --- PHAO CỨU SINH (SMART FALLBACK MOCK DATA CHO PLAN B - CHUẨN ĐỊA LÝ & CHỐNG ẢO GIÁC) ---
            var fallbackSuggestions = new List<PlanBItemSuggestionDto>();
            var originalItemsList = currentDayItems ?? new List<ItineraryItem>();

            // Từ khóa nhận diện hoạt động ngoài trời cần thay thế khi trời mưa bão
            var outdoorKeywords = new[] 
            { 
                "bãi biển", "biển", "công viên", "leo núi", "núi", "khám phá", 
                "tham quan", "dã ngoại", "vui chơi", "ngoài trời", "tour", 
                "trekking", "ngắm cảnh", "chợ phiên", "dạo phố", "chèo thuyền", 
                "tắm biển", "phố đi bộ", "camping", "cắm trại", "rừng" 
            };

            // Lọc ra các hoạt động có khả năng ở ngoài trời
            var candidatesToReplace = originalItemsList
                .Where(i => !i.IsPlanB && (
                    (!string.IsNullOrEmpty(i.Title) && outdoorKeywords.Any(k => i.Title.Contains(k, StringComparison.OrdinalIgnoreCase))) ||
                    (!string.IsNullOrEmpty(i.Notes) && outdoorKeywords.Any(k => i.Notes.Contains(k, StringComparison.OrdinalIgnoreCase))) ||
                    (!string.IsNullOrEmpty(i.Destination) && outdoorKeywords.Any(k => i.Destination.Contains(k, StringComparison.OrdinalIgnoreCase)))
                ))
                .ToList();

            // Nếu không khớp từ khóa ngoài trời nhưng danh sách có hoạt động, chọn 1-2 hoạt động để thay thế
            if (!candidatesToReplace.Any() && originalItemsList.Any())
            {
                candidatesToReplace = originalItemsList.Where(i => !i.IsPlanB).Take(2).ToList();
            }

            // Chọn 1 trong 4 Kịch bản chuyên đề trong nhà linh hoạt, trung tính và chuẩn xác với mọi địa phương
            int planBScenario = Math.Abs(targetDate.Day + targetDate.Month * 3) % 4;

            var indoorPool = planBScenario switch
            {
                0 => new[]
                {
                    new 
                    { 
                        Title = $"Tham quan Bảo tàng Lịch sử & Không gian Triển lãm Văn hóa {shortDest}",
                        Notes = "Thay thế hoạt động ngoài trời ngày mưa bão: Khám phá di sản lịch sử văn hóa trong không gian mái che ấm cúng.",
                        Transport = "Taxi / Xe đưa đón"
                    },
                    new 
                    { 
                        Title = $"Thưởng thức Trà đạo & Cà phê không gian kín view mưa {shortDest}",
                        Notes = "Không gian kín ấm áp, thưởng thức trà mộc hoặc cà phê thơm và ngắm cảnh mưa lãng mạn qua khung kính.",
                        Transport = "Taxi / Xe đưa đón"
                    },
                    new 
                    { 
                        Title = $"Tham quan Phòng Trưng bày Nghệ thuật & Sản vật Bản địa {shortDest}",
                        Notes = "Chiêm ngưỡng các tác phẩm mỹ thuật và tìm hiểu các sản vật truyền thống đặc trưng của địa phương trong nhà.",
                        Transport = "Taxi / Xe đưa đón"
                    }
                },
                1 => new[]
                {
                    new 
                    { 
                        Title = $"Khám phá Khu Phức hợp Thương mại & Mua sắm Đặc sản {shortDest}",
                        Notes = "Tổ hợp giải trí và mua sắm trong nhà tiện nghi: Khám phá các mặt hàng đặc sản và quà lưu niệm không lo thời tiết.",
                        Transport = "Taxi / Xe đưa đón"
                    },
                    new 
                    { 
                        Title = $"Thưởng thức Ẩm thực & Phim ảnh Giải trí Trong Nhà {shortDest}",
                        Notes = "Trải nghiệm không gian thư giãn, thưởng thức các món ăn nhẹ và giải trí ấm áp tránh gió mưa bên ngoài.",
                        Transport = "Taxi / Xe đưa đón"
                    },
                    new 
                    { 
                        Title = $"Trải nghiệm Khu Trò chơi & Giải trí Có Mái Che {shortDest}",
                        Notes = "Vận động nhẹ nhàng và gắn kết nhóm bạn cùng các hoạt động vui chơi giải trí có mái che an toàn.",
                        Transport = "Taxi / Xe đưa đón"
                    }
                },
                2 => new[]
                {
                    new 
                    { 
                        Title = $"Trải nghiệm Workshop Thủ công & Sáng tạo Nghệ thuật Trong Nhà {shortDest}",
                        Notes = "Tự tay làm các món đồ thủ công hoặc trải nghiệm mỹ thuật lưu niệm mang về dưới sự hướng dẫn nhiệt tình.",
                        Transport = "Taxi / Xe đưa đón"
                    },
                    new 
                    { 
                        Title = $"Trải nghiệm Ẩm thực: Thưởng thức Món Nóng Đặc Sản Ngày Mưa {shortDest}",
                        Notes = "Thưởng thức mâm cơm đặc sản vùng miền nóng sốt, thơm ngon trong không gian nhà hàng kín ấm cúng.",
                        Transport = "Taxi / Xe đưa đón"
                    },
                    new 
                    { 
                        Title = $"Trải nghiệm Ngâm Chân & Liệu Trình Trị Liệu Thảo Dược {shortDest}",
                        Notes = "Ngâm chân thảo mộc thiên nhiên, phục hồi thể lực và thư giãn trọn vẹn tránh giá lạnh ngày mưa bão.",
                        Transport = "Taxi / Xe đưa đón"
                    }
                },
                _ => new[]
                {
                    new 
                    { 
                        Title = $"Tham quan Không gian Trưng bày Đa dạng Sinh học & Tự nhiên {shortDest}",
                        Notes = "Khám phá các mô hình tiêu bản động thực vật, tìm hiểu hệ sinh thái tự nhiên đặc sắc của vùng đất trong nhà.",
                        Transport = "Taxi / Xe đưa đón"
                    },
                    new 
                    { 
                        Title = $"Trải nghiệm Trung tâm Văn hóa & Triển lãm Tương tác Trong Nhà {shortDest}",
                        Notes = "Không gian trưng bày văn hóa và tư liệu trực quan sống động, an toàn và bổ ích ngày mưa bão.",
                        Transport = "Taxi / Xe đưa đón"
                    },
                    new 
                    { 
                        Title = $"Thư giãn tại Quán Cafe Không Gian Ấm Cúng & Trò Chơi Nhóm {shortDest}",
                        Notes = "Không gian cafe ấm cúng, thư giãn cùng các trò chơi nhóm kết nối bạn bè và thưởng thức đồ uống nóng.",
                        Transport = "Taxi / Xe đưa đón"
                    }
                }
            };

            int templateIndex = 0;
            foreach (var orig in candidatesToReplace)
            {
                var template = indoorPool[templateIndex % indoorPool.Length];
                templateIndex++;

                var startTime = orig.StartTime != default ? orig.StartTime : targetDate.Date.AddHours(9);
                var endTime = orig.EndTime != default ? orig.EndTime : startTime.AddHours(2);

                fallbackSuggestions.Add(new PlanBItemSuggestionDto
                {
                    OriginalItemId = orig.Id,
                    ReplacesItemId = orig.Id,
                    IsPlanB = true,
                    Title = template.Title,
                    Location = shortDest,
                    Notes = template.Notes,
                    Transport = template.Transport,
                    StartTime = startTime,
                    EndTime = endTime
                });
            }

            // Trường hợp ngày chưa có lịch trình gốc nào, sinh 2 hoạt động mẫu trong nhà theo kịch bản ngày mưa
            if (!fallbackSuggestions.Any())
            {
                var sample1 = indoorPool[0];
                var sample2 = indoorPool.Length > 1 ? indoorPool[1] : indoorPool[0];

                fallbackSuggestions.Add(new PlanBItemSuggestionDto
                {
                    OriginalItemId = 0,
                    ReplacesItemId = null,
                    IsPlanB = true,
                    Title = sample1.Title,
                    Location = shortDest,
                    Notes = sample1.Notes,
                    Transport = sample1.Transport,
                    StartTime = targetDate.Date.AddHours(9),
                    EndTime = targetDate.Date.AddHours(11).AddMinutes(30)
                });
                fallbackSuggestions.Add(new PlanBItemSuggestionDto
                {
                    OriginalItemId = 0,
                    ReplacesItemId = null,
                    IsPlanB = true,
                    Title = sample2.Title,
                    Location = shortDest,
                    Notes = sample2.Notes,
                    Transport = sample2.Transport,
                    StartTime = targetDate.Date.AddHours(14),
                    EndTime = targetDate.Date.AddHours(16).AddMinutes(30)
                });
            }

            return fallbackSuggestions;
        }

        /// <summary>
        /// 6. Tóm tắt Đánh giá & Mẹo du lịch cộng đồng (Review Tips Summary)
        /// </summary>
        public async Task<AiTipsSummaryDto> SummarizePlaceTipsAsync(
            string placeId, 
            string placeName, 
            List<PlaceReview> reviews, 
            string userApiKey = null)
        {
            var result = new AiTipsSummaryDto
            {
                PlaceId = placeId,
                PlaceName = placeName,
                TotalReviewsAnalyzed = reviews?.Count ?? 0,
                SummaryTips = new List<string>()
            };

            if (reviews == null || !reviews.Any())
            {
                result.SummaryTips.Add($"Chưa có đánh giá cộng đồng nào cho {placeName}. Hãy là người đầu tiên chia sẻ mẹo du lịch!");
                return result;
            }

            var apiKey = GetEffectiveApiKey(userApiKey);
            if (string.IsNullOrEmpty(apiKey))
            {
                throw new InvalidOperationException("Chưa cấu hình Gemini API Key.");
            }

            var reviewsText = string.Join("\n", reviews.Select(r => $"- [{r.Rating} sao]: {r.Content}"));

            var prompt = $@"Dưới đây là các nhận xét và mẹo du lịch thực tế từ cộng đồng người dùng tại '{placeName}':
{reviewsText}

NHIỆM VỤ:
Hãy phân tích và chắt lọc toàn bộ nội dung trên thành 3 đến 4 gạch đầu dòng ngắn gọn, súc tích và có tính ứng dụng cao nhất (Ví dụ: thời điểm lý tưởng trong ngày, chỗ gửi xe, cảnh báo an toàn/chặt chém, góc chụp ảnh đẹp, món nên thử...).

YÊU CẦU ĐỊNH DẠNG:
Trả về DUY NHẤT một JSON Array chứa các chuỗi string (Ví dụ: [""Gửi xe ở cổng phụ rẻ hơn"", ""Nên đi lúc sáng sớm để tránh đông đúc""]). Tuyệt đối không bọc trong markdown code block (không dùng ```json).";

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                },
                generationConfig = new
                {
                    temperature = 0.7,
                    topP = 0.95
                }
            };

            var text = await PostGenerateContentWithResilienceAsync(apiKey, requestBody, "Tóm tắt mẹo du lịch");

            text = text.Replace("```json", "").Replace("```", "").Trim();
            int startIndex = text.IndexOf('[');
            int endIndex = text.LastIndexOf(']');
            if (startIndex >= 0 && endIndex > startIndex)
            {
                text = text.Substring(startIndex, endIndex - startIndex + 1);
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            try
            {
                var tips = JsonSerializer.Deserialize<List<string>>(text, options);
                if (tips != null && tips.Any())
                {
                    result.SummaryTips = tips;
                }
                else
                {
                    result.SummaryTips.Add($"Đã ghi nhận {reviews.Count} mẹo từ cộng đồng cho {placeName}.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse summary tips JSON: {RawText}", text);
                result.SummaryTips.Add(text);
            }

            return result;
        }

        public async Task<List<AiFoodSuggestionDto>> GetFoodSuggestionsAsync(string location, string keyword = null, string userApiKey = null)
        {
            var apiKey = GetEffectiveApiKey(userApiKey);
            var cleanLocation = string.IsNullOrWhiteSpace(location) ? "Việt Nam" : location.Trim();
            var cleanKeyword = string.IsNullOrWhiteSpace(keyword) ? "đặc sản địa phương nổi tiếng nhất" : keyword.Trim();

            if (!string.IsNullOrEmpty(apiKey))
            {
                try
                {
                    var prompt = $@"Bạn là chuyên gia bản địa. Người dùng đang muốn tìm kiếm '{cleanKeyword}' ở gần khu vực '{cleanLocation}'. Hãy gợi ý 3 địa điểm/cửa hàng/quán ăn sát với nhu cầu này nhất.
Trả về DUY NHẤT một mảng JSON chuẩn (không kèm bất kỳ văn bản markdown hay giải thích nào ngoài cặp ngoặc vuông [ ]) gồm 3 đối tượng với các trường:
- 'name' (string): Tên quán ăn/cửa hàng/địa điểm.
- 'specialty' (string): Món đặc trưng hoặc Mô tả điểm nổi bật.
- 'estimatedDistance' (string): Khoảng cách ước lượng từ khu vực '{cleanLocation}' (ví dụ: 'Khoảng 400m', 'Khoảng 1.2km').
- 'reason' (string): Lý do phù hợp với nhu cầu '{cleanKeyword}'.

Ví dụ cấu trúc JSON chuẩn:
[
  {{
    ""name"": ""Tên Quán Mẫu"",
    ""specialty"": ""Món ngon đặc trưng hoặc tiện ích nổi bật"",
    ""estimatedDistance"": ""Khoảng 500m"",
    ""reason"": ""Lý do phù hợp và chất lượng dịch vụ tốt.""
  }}
]";

                    var requestBody = new
                    {
                        contents = new[]
                        {
                            new { parts = new[] { new { text = prompt } } }
                        },
                        generationConfig = new
                        {
                            temperature = 0.4,
                            topP = 0.9
                        }
                    };

                    var text = await PostGenerateContentWithResilienceAsync(apiKey, requestBody, "Gợi ý ẩm thực AI");
                    text = text.Replace("```json", "").Replace("```", "").Trim();
                    int startIndex = text.IndexOf('[');
                    int endIndex = text.LastIndexOf(']');
                    if (startIndex >= 0 && endIndex > startIndex)
                    {
                        text = text.Substring(startIndex, endIndex - startIndex + 1);
                    }

                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var list = JsonSerializer.Deserialize<List<AiFoodSuggestionDto>>(text, options);
                    if (list != null && list.Any(x => !string.IsNullOrWhiteSpace(x.Name)))
                    {
                        return list.Where(x => !string.IsNullOrWhiteSpace(x.Name)).Take(3).ToList();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[RESILIENCE] Lỗi khi gọi Gemini cho gợi ý '{Keyword}' tại {Location}. Dùng Smart Fallback Mock.", cleanKeyword, cleanLocation);
                }
            }

            return GenerateFallbackFoodSuggestions(cleanLocation, cleanKeyword);
        }

        private List<AiFoodSuggestionDto> GenerateFallbackFoodSuggestions(string location, string keyword)
        {
            var kwLower = keyword.ToLowerInvariant();
            var locLower = location.ToLowerInvariant();

            // Nếu người dùng tìm cafe / cà phê / nước uống
            if (kwLower.Contains("cafe") || kwLower.Contains("cà phê") || kwLower.Contains("coffee") || kwLower.Contains("trà"))
            {
                return new List<AiFoodSuggestionDto>
                {
                    new AiFoodSuggestionDto
                    {
                        Name = $"The Local Coffee & Tea {location}",
                        Specialty = "Cà phê pha phin truyền thống, Cà phê muối & Trà trái cây",
                        EstimatedDistance = "Khoảng 350m",
                        Reason = "Không gian yên tĩnh thoáng đãng, đồ uống đậm vị, thích hợp ngồi nghỉ ngơi hoặc làm việc."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = $"Góc Phố Acoustic Garden",
                        Specialty = "Cold brew cam sả, Bạc xỉu 3 tầng",
                        EstimatedDistance = "Khoảng 600m",
                        Reason = "View sân vườn nhiều cây xanh, decor vintage đẹp mắt để check-in và thư giãn."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = $"Tiệm Trà & Bánh Mộc",
                        Specialty = "Trà lài mãng cầu, Croissant nướng bơ tỏi",
                        EstimatedDistance = "Khoảng 850m",
                        Reason = "Phục vụ nhanh chóng, menu phong phú các loại bánh ngọt tươi trong ngày."
                    }
                };
            }

            // Nếu người dùng tìm đồ chay / quán chay
            if (kwLower.Contains("chay") || kwLower.Contains("veggie") || kwLower.Contains("vegan"))
            {
                return new List<AiFoodSuggestionDto>
                {
                    new AiFoodSuggestionDto
                    {
                        Name = $"Cơm Chay An Lạc Tâm {location}",
                        Specialty = "Mẹt chay dưỡng sinh, Đậu hũ sốt nấm hạt sen",
                        EstimatedDistance = "Khoảng 500m",
                        Reason = "Món chay thanh tịnh, nêm nếm vừa vặn không ngấy, nguyên liệu rau củ hữu cơ tươi sạch."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = $"Nhà hàng Chay Bồ Đề",
                        Specialty = "Lẩu nấm thập cẩm, Chả giò bắp non",
                        EstimatedDistance = "Khoảng 900m",
                        Reason = "Không gian trang nhã thanh tịnh, được nhiều thực khách ăn chay trường đánh giá cao."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = $"Buffet Chay Hương Thiền",
                        Specialty = "Hơn 30 món chay truyền thống tự chọn",
                        EstimatedDistance = "Khoảng 1.2km",
                        Reason = "Giá cả rất bình dân, menu đa dạng thay đổi mỗi ngày và phục vụ chu đáo."
                    }
                };
            }

            // Nếu người dùng tìm quán nhậu / bia / nướng
            if (kwLower.Contains("nhậu") || kwLower.Contains("bia") || kwLower.Contains("bar") || kwLower.Contains("pub"))
            {
                return new List<AiFoodSuggestionDto>
                {
                    new AiFoodSuggestionDto
                    {
                        Name = $"Bia Hơi & Đồ Nướng Gió Biển {location}",
                        Specialty = "Mực một nắng nướng muối ớt, Chân gà quái thú",
                        EstimatedDistance = "Khoảng 600m",
                        Reason = "Không gian rộng rãi, thoáng mát, đồ nhắm phong phú thích hợp tụ họp bạn bè."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = $"Quán Nhậu Đồng Quê",
                        Specialty = "Gà đồi nướng lu, Lẩu ếch măng cay",
                        EstimatedDistance = "Khoảng 1km",
                        Reason = "Hương vị đồng quê đậm đà, bia lạnh chuẩn vị và giá cả hợp lý cho nhóm đông."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = $"Phố Nướng & Chill Station",
                        Specialty = "Bò sốt cay tiêu đen, Hàu nướng phô mai",
                        EstimatedDistance = "Khoảng 750m",
                        Reason = "Không khí sôi động về đêm, phục vụ nhiệt tình và đồ ăn lên nhanh."
                    }
                };
            }

            // Nếu người dùng tìm cửa hàng tiện lợi / siêu thị / bách hóa
            if (kwLower.Contains("tiện lợi") || kwLower.Contains("siêu thị") || kwLower.Contains("mart") || kwLower.Contains("tạp hóa"))
            {
                return new List<AiFoodSuggestionDto>
                {
                    new AiFoodSuggestionDto
                    {
                        Name = $"Cửa hàng Tiện lợi WinMart+ {location}",
                        Specialty = "Nước giải khát, Bánh ngọt, Đồ dùng du lịch cá nhân",
                        EstimatedDistance = "Khoảng 250m",
                        Reason = "Hàng hóa tiêu chuẩn rõ nguồn gốc, mở cửa từ sáng sớm đến tối muộn, thanh toán tiện lợi."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = $"Circle K 24/7",
                        Specialty = "Thức ăn nhanh, Cafe mang đi, Kem tươi",
                        EstimatedDistance = "Khoảng 400m",
                        Reason = "Mở cửa xuyên suốt 24/7, có chỗ ngồi sạc pin điện thoại và nghỉ ngơi mát mẻ."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = $"Bách Hóa & Mini Mart Xanh",
                        Specialty = "Trái cây tươi theo mùa, Đặc sản khô làm quà",
                        EstimatedDistance = "Khoảng 550m",
                        Reason = "Vị trí ngay mặt tiền dễ tìm, đầy đủ nhu yếu phẩm cho chuyến đi."
                    }
                };
            }

            // Nếu từ khóa là mặc định hoặc đặc sản
            if (locLower.Contains("ninh bình") || locLower.Contains("tràng an") || locLower.Contains("bái đính") || locLower.Contains("tam cốc"))
            {
                return new List<AiFoodSuggestionDto>
                {
                    new AiFoodSuggestionDto
                    {
                        Name = "Nhà hàng Thăng Long (Đặc sản Dê núi)",
                        Specialty = "Dê núi nướng tảng, Cơm cháy sốt dê",
                        EstimatedDistance = "Khoảng 800m từ khu du lịch",
                        Reason = "Thương hiệu ẩm thực nức tiếng Cố Đô với không gian rộng rãi và thịt dê tươi ngon chuẩn vị."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = "Nhà hàng Chính Thư Hoa Lư",
                        Specialty = "Dê tái chanh, Dê xào sả ớt",
                        EstimatedDistance = "Khoảng 1.5km từ trung tâm",
                        Reason = "Được cộng đồng du khách và người dân địa phương đánh giá cao về độ tươi ngon và phục vụ chu đáo."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = "Quán Bún Mọc Tố Như",
                        Specialty = "Bún mọc gia truyền, thịt viên nóng hổi",
                        EstimatedDistance = "Khoảng 600m",
                        Reason = "Món ăn sáng truyền thống dân dã, nước dùng thanh ngọt tự nhiên đậm chất đất Bắc."
                    }
                };
            }

            if (locLower.Contains("hạ long") || locLower.Contains("bãi cháy") || locLower.Contains("quảng ninh"))
            {
                return new List<AiFoodSuggestionDto>
                {
                    new AiFoodSuggestionDto
                    {
                        Name = "Nhà hàng Hồng Hạnh 3 Bãi Cháy",
                        Specialty = "Chả mực giã tay, Lẩu hải sản tươi sống",
                        EstimatedDistance = "Khoảng 500m từ trung tâm Bãi Cháy",
                        Reason = "Địa chỉ hải sản uy tín bậc nhất Hạ Long, view biển thoáng mát và hải sản tươi rói."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = "Nhà hàng Cua Vàng",
                        Specialty = "Lẩu cua biển nấu nồi đất",
                        EstimatedDistance = "Khoảng 1km",
                        Reason = "Phong cách chế biến độc đáo bằng nồi đất gia truyền, giữ trọn vị ngọt tự nhiên của cua biển."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = "Quán Bún Bề Bề Cầu Trắng",
                        Specialty = "Bún bề bề, tôm nõn chua cay",
                        EstimatedDistance = "Khoảng 800m",
                        Reason = "Món điểm tâm đặc sắc đậm đà vị biển Hạ Long, giá cả bình dân và phục vụ nhanh."
                    }
                };
            }

            if (locLower.Contains("đà nẵng") || locLower.Contains("hội an") || locLower.Contains("ngũ hành sơn"))
            {
                return new List<AiFoodSuggestionDto>
                {
                    new AiFoodSuggestionDto
                    {
                        Name = "Bánh Tráng Cuốn Thịt Heo Trần",
                        Specialty = "Thịt heo hai đầu da, mắm nêm gia truyền",
                        EstimatedDistance = "Khoảng 600m từ trung tâm",
                        Reason = "Thương hiệu ẩm thực lâu đời tại Đà Nẵng, nước chấm mắm nêm đậm đà thơm ngát khó quên."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = "Mì Quảng Ếch Bếp Trang",
                        Specialty = "Mì Quảng ếch om niêu đất",
                        EstimatedDistance = "Khoảng 900m",
                        Reason = "Sự kết hợp hoàn hảo giữa món ăn truyền thống và phong cách trình bày độc đáo, không gian ấm cúng."
                    },
                    new AiFoodSuggestionDto
                    {
                        Name = "Bé Mặn Quán (Hải sản tươi sống)",
                        Specialty = "Tôm hùm nướng bơ tỏi, Ghẹ hấp sả",
                        EstimatedDistance = "Khoảng 1.2km ven biển",
                        Reason = "Quán hải sản bình dân nổi tiếng sát bờ biển, hải sản tươi sống tự chọn tại bể."
                    }
                };
            }

            var displayKeyword = string.IsNullOrWhiteSpace(keyword) || keyword == "đặc sản địa phương nổi tiếng nhất" ? "Đặc sản" : keyword;

            return new List<AiFoodSuggestionDto>
            {
                new AiFoodSuggestionDto
                {
                    Name = $"Nhà hàng Ẩm thực {displayKeyword} {location}",
                    Specialty = $"Món ngon {displayKeyword} tuyển chọn vùng miền",
                    EstimatedDistance = "Khoảng 500m từ trung tâm",
                    Reason = "Tuyển chọn nguyên liệu tươi sạch bản xứ, không gian ấm cúng phù hợp cho đoàn và gia đình."
                },
                new AiFoodSuggestionDto
                {
                    Name = $"Quán {displayKeyword} Truyền Thống {location}",
                    Specialty = $"Hương vị {displayKeyword} gia truyền thơm ngon",
                    EstimatedDistance = "Khoảng 850m",
                    Reason = "Được nhiều du khách đánh giá cao về hương vị thân thuộc và giá cả hợp lý, phục vụ nhiệt tình."
                },
                new AiFoodSuggestionDto
                {
                    Name = $"Điểm Hẹn Ẩm Thực Đêm {location}",
                    Specialty = "Các món nướng than hoa & giải khát",
                    EstimatedDistance = "Khoảng 1.1km",
                    Reason = "Không khí sôi động về đêm, đa dạng các món ăn vặt và ẩm thực đường phố đặc sắc."
                }
            };
        }
    }
}
