using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

namespace TravelWorkspace.API.Services
{
    /// <summary>
    /// Kho dữ liệu tri thức địa phương tĩnh (Local Knowledge Base) phục vụ Context Injection cho AI.
    /// Tra cứu O(1) qua Dictionary và hỗ trợ chuẩn hóa địa danh có/không dấu.
    /// </summary>
    public static class TravelKnowledgeBase
    {
        private static readonly Dictionary<string, List<string>> Destinations = new(StringComparer.OrdinalIgnoreCase);

        static TravelKnowledgeBase()
        {
            // 1. Ninh Bình
            var ninhBinhSpots = new List<string>
            {
                "Khu du lịch sinh thái Tràng An",
                "Chùa Bái Đính",
                "Hang Múa",
                "Tam Cốc - Bích Động",
                "Cố đô Hoa Lư",
                "Động Am Tiên (Tuyệt Tình Cốc)",
                "Vườn quốc gia Cúc Phương",
                "Đầm Vân Long",
                "Nhà hàng Dê núi Chính Thư",
                "Nhà hàng Thăng Long (Đặc sản Dê núi & Cơm cháy)",
                "Miến Lươn Bà Phấn",
                "Quán Bún chả quạt Cố Đô"
            };
            AddDestinationWithAliases(new[] { "ninh bình", "ninh binh" }, ninhBinhSpots);

            // 2. Hà Nội
            var haNoiSpots = new List<string>
            {
                "Hồ Hoàn Kiếm & Đền Ngọc Sơn",
                "Phố Cổ Hà Nội (36 Phố Phường)",
                "Văn Miếu - Quốc Tử Giám",
                "Lăng Chủ tịch Hồ Chí Minh & Chùa Một Cột",
                "Hoàng Thành Thăng Long",
                "Hồ Tây & Chùa Trấn Quốc",
                "Nhà hát Lớn Hà Nội",
                "Cầu Long Biên",
                "Phở Gia Truyền Bát Đàn",
                "Bún Chả Hương Liên (Bún chả Obama)",
                "Chả Cá Lã Vọng (14 Chả Cá)",
                "Bánh cuốn Thanh Vân Hàng Gà",
                "Cà phê Giảng (Cà phê Trứng Nguyễn Hữu Huân)"
            };
            AddDestinationWithAliases(new[] { "hà nội", "ha noi", "hanoi" }, haNoiSpots);

            // 3. Sa Pa / Sapa
            var saPaSpots = new List<string>
            {
                "Đỉnh Fansipan & Sun World Fansipan Legend",
                "Bản Cát Cát",
                "Bản Tả Van & Thung lũng Mường Hoa",
                "Núi Hàm Rồng & Vườn hoa Hàm Rồng",
                "Đèo Ô Quy Hồ & Cổng trời Sa Pa",
                "Thác Bạc & Thác Tình Yêu",
                "Nhà thờ Đá Sa Pa & Quảng trường",
                "Bản Sín Chải",
                "Nhà hàng Thắng Cố A Quỳnh (phố Thạch Sơn)",
                "Nhà hàng Cá Hồi Sapa Vua Sapa",
                "Lẩu Cá Tầm Sapa Khám Phá",
                "Quán Đồ Nướng Ngói Sa Pa phố Cầu Mây"
            };
            AddDestinationWithAliases(new[] { "sa pa", "sapa", "lào cai", "lao cai" }, saPaSpots);

            // 4. Đà Lạt
            var daLatSpots = new List<string>
            {
                "Hồ Xuân Hương & Quảng trường Lâm Viên",
                "Ga Đà Lạt",
                "Dinh III Bảo Đại",
                "Thiền viện Trúc Lâm & Hồ Tuyền Lâm",
                "Chùa Linh Phước (Chùa Ve Chai)",
                "Đồi chè Cầu Đất",
                "Thác Datanla (Trải nghiệm máng trượt)",
                "Thung lũng Tình Yêu",
                "Chợ Đêm Đà Lạt (Chợ Âm Phủ)",
                "Lẩu Gà Lá É Tao Ngộ (đường 3/4)",
                "Bánh Căn Lệ Yersin",
                "Lẩu Bò Ba Toa (Quán Gỗ chính gốc)",
                "Nem Nướng Bà Hùng",
                "Tiệm bánh Cối Xay Gió"
            };
            AddDestinationWithAliases(new[] { "đà lạt", "da lat", "dalat", "lâm đồng", "lam dong" }, daLatSpots);

            // 5. Đà Nẵng
            var daNangSpots = new List<string>
            {
                "Sun World Ba Na Hills & Cầu Vàng",
                "Bán đảo Sơn Trà & Chùa Linh Ứng",
                "Danh thắng Ngũ Hành Sơn",
                "Cầu Rồng & Cầu Tình Yêu",
                "Bãi biển Mỹ Khê",
                "Chợ Cồn (Khu ẩm thực dân dã)",
                "Bảo tàng Điêu khắc Chăm Đà Nẵng",
                "Bánh tráng cuốn thịt heo Quán Trần (Lê Duẩn)",
                "Mì Quảng Bếp Trang",
                "Hải sản Bé Mặn (đường Võ Nguyên Giáp)",
                "Bún chả cá Bà Phiến (đường Nguyễn Chí Thanh)"
            };
            AddDestinationWithAliases(new[] { "đà nẵng", "da nang", "danang" }, daNangSpots);
        }

        private static void AddDestinationWithAliases(string[] aliases, List<string> spots)
        {
            foreach (var alias in aliases)
            {
                Destinations[alias] = spots;
                var unaccented = RemoveDiacritics(alias).ToLowerInvariant();
                Destinations[unaccented] = spots;
            }
        }

        /// <summary>
        /// Tra cứu danh sách các địa danh có thật theo điểm đến (O(1)).
        /// Nếu không tìm thấy chính xác, thử tìm theo từ khóa xuất hiện trong chuỗi địa điểm.
        /// </summary>
        public static IReadOnlyList<string>? FindKnownSpots(string? destination)
        {
            if (string.IsNullOrWhiteSpace(destination)) return null;

            var raw = destination.Trim();
            // Lấy phần đầu tiên nếu dạng "Ninh Bình, Việt Nam"
            var primary = raw.Split(',')[0].Trim();

            // 1. Thử tra cứu trực tiếp O(1)
            if (Destinations.TryGetValue(primary, out var spots))
            {
                return spots;
            }

            // 2. Thử với bản chuẩn hóa không dấu
            var unaccentedPrimary = RemoveDiacritics(primary).ToLowerInvariant();
            if (Destinations.TryGetValue(unaccentedPrimary, out spots))
            {
                return spots;
            }

            // 3. Tìm kiếm theo từ khóa chứa trong tên
            foreach (var kvp in Destinations)
            {
                if (primary.IndexOf(kvp.Key, StringComparison.OrdinalIgnoreCase) >= 0 ||
                    unaccentedPrimary.IndexOf(kvp.Key, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return kvp.Value;
                }
            }

            return null;
        }

        /// <summary>
        /// Trả về chuỗi địa danh định dạng ngăn cách dấu phẩy, hoặc rỗng nếu không có dữ liệu.
        /// </summary>
        public static string GetLocalDataString(string? destination)
        {
            var spots = FindKnownSpots(destination);
            if (spots == null || spots.Count == 0) return string.Empty;

            return string.Join(", ", spots.Select(s => $"\"{s}\""));
        }

        private static string RemoveDiacritics(string text)
        {
            if (string.IsNullOrEmpty(text)) return text;
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder();

            foreach (var c in normalizedString)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }

            return stringBuilder.ToString().Normalize(NormalizationForm.FormC).Replace('đ', 'd').Replace('Đ', 'D');
        }
    }
}
