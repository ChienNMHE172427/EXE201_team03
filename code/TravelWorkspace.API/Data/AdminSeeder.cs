using Microsoft.EntityFrameworkCore;
using TravelWorkspace.API.Models;

namespace TravelWorkspace.API.Data
{
    public static class AdminSeeder
    {
        public static async Task SeedAdminReportingDataAsync(AppDbContext context)
        {
            var random = new Random(42);

            // =========================================================================
            // 1. SEED USERS ĐẠT CHÍNH XÁC 193 NGƯỜI DÙNG
            // =========================================================================
            var targetUsers = 193;
            var currentUsersCount = await context.Users.IgnoreQueryFilters().CountAsync();

            if (currentUsersCount < targetUsers)
            {
                var neededUsers = targetUsers - currentUsersCount;
                Console.WriteLine($"[AdminSeeder] Hiện có {currentUsersCount} người dùng. Đang tạo thêm {neededUsers} người dùng để đạt mốc {targetUsers}...");

                // Mã hóa password "111" 1 lần duy nhất để tối ưu hiệu năng
                var fixedPasswordHash = BCrypt.Net.BCrypt.HashPassword("111");

                var lastNames = new[] { "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Đoàn" };
                var middleNames = new[] { "Văn", "Thị", "Minh", "Quang", "Đức", "Tuấn", "Hoàng", "Thanh", "Thu", "Ngọc", "Hữu", "Phương", "Khánh", "Hải", "Quốc", "Anh" };
                var firstNames = new (string Name, string Slug)[]
                {
                    ("Hoàng", "hoang"), ("Tuấn", "tuan"), ("Huy", "huy"), ("Nam", "nam"),
                    ("Long", "long"), ("Hùng", "hung"), ("Linh", "linh"), ("Trang", "trang"),
                    ("Mai", "mai"), ("Lan", "lan"), ("Anh", "anh"), ("Dũng", "dung"),
                    ("Đạt", "dat"), ("Quân", "quan"), ("Thảo", "thao"), ("Hương", "huong"),
                    ("Hiếu", "hieu"), ("Sơn", "son"), ("Phong", "phong"), ("Phúc", "phuc"),
                    ("Thịnh", "thinh"), ("Kiên", "kien"), ("Toàn", "toan"), ("Khoa", "khoa"),
                    ("Bách", "bach"), ("Trí", "tri"), ("Việt", "viet"), ("Đăng", "dang"),
                    ("Tùng", "tung"), ("Cường", "cuong"), ("Giang", "giang"), ("Hà", "ha"),
                    ("Ngân", "ngan"), ("Yến", "yen"), ("My", "my"), ("Ngọc", "ngoc")
                };

                var existingEmails = (await context.Users.IgnoreQueryFilters().Select(u => u.Email.ToLower()).ToListAsync()).ToHashSet();
                var newUsers = new List<User>();

                for (int i = 0; i < neededUsers; i++)
                {
                    var lastName = lastNames[random.Next(lastNames.Length)];
                    var middleName = middleNames[random.Next(middleNames.Length)];
                    var firstNameObj = firstNames[random.Next(firstNames.Length)];
                    var fullName = $"{lastName} {middleName} {firstNameObj.Name}";

                    // Tạo email theo định dạng: {ten_khong_dau}09{so_ngau_nhien}@gmail.com
                    string email;
                    int attempts = 0;
                    do
                    {
                        var randNumber = random.Next(1000, 9999);
                        email = $"{firstNameObj.Slug}09{randNumber}@gmail.com";
                        attempts++;
                        if (attempts > 20)
                        {
                            email = $"{firstNameObj.Slug}09{random.Next(10000, 99999)}@gmail.com";
                        }
                    } while (existingEmails.Contains(email.ToLower()));

                    existingEmails.Add(email.ToLower());

                    var daysAgo = random.Next(1, 25);
                    var createdAt = DateTime.UtcNow.AddDays(-daysAgo).AddMinutes(random.Next(0, 1440));

                    newUsers.Add(new User
                    {
                        FullName = fullName,
                        Email = email,
                        PasswordHash = fixedPasswordHash,
                        Role = "Traveler",
                        IsActive = true,
                        IsDeleted = false,
                        IsEmailConfirmed = true,
                        CreatedAt = createdAt,
                        AvatarUrl = $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(email)}"
                    });
                }

                await context.Users.AddRangeAsync(newUsers);
                await context.SaveChangesAsync();
                Console.WriteLine($"[AdminSeeder] Đã thêm thành công {newUsers.Count} người dùng. Tổng người dùng hiện tại = {await context.Users.IgnoreQueryFilters().CountAsync()}");
            }
            else
            {
                Console.WriteLine($"[AdminSeeder] Người dùng đã đạt hoặc vượt mốc {targetUsers} ({currentUsersCount} users). Không cần thêm mới.");
            }

            // =========================================================================
            // 2. SEED TRIPS / PLANS ĐẠT CHÍNH XÁC 130 KẾ HOẠCH
            // =========================================================================
            var targetTrips = 130;
            var currentTripsCount = await context.Trips.CountAsync();

            if (currentTripsCount < targetTrips)
            {
                var neededTrips = targetTrips - currentTripsCount;
                Console.WriteLine($"[AdminSeeder] Hiện có {currentTripsCount} chuyến đi. Đang tạo thêm {neededTrips} kế hoạch để đạt mốc {targetTrips}...");

                // Lấy danh sách ID người dùng để phân bổ chủ chuyến đi (OwnerId)
                var userIds = await context.Users.Select(u => u.Id).ToListAsync();
                if (userIds.Count == 0)
                {
                    Console.WriteLine("[AdminSeeder] Không tìm thấy user nào để gán chuyến đi.");
                    return;
                }

                var tripTemplates = new (string Dest, string Title, string Pref, decimal Budget, string Img)[]
                {
                    ("Hà Giang", "Du lịch Hà Giang - Săn mây Đèo Mã Pì Lèng", "Phượt xe máy, Ngắm cảnh đèo, Chụp ảnh hoa tam giác mạch", 3200000, "https://images.unsplash.com/photo-1628107773229-23f03b2909be?q=80&w=1200&auto=format&fit=crop"),
                    ("Sapa", "Khám phá Sapa mùa lúa chín & Chinh phục Fansipan", "Leo núi, Trekking bản Cát Cát, Check-in đỉnh Fansipan, Thưởng thức lẩu cá tầm", 4500000, "https://images.unsplash.com/photo-1549474720-333e61f22e86?q=80&w=1200&auto=format&fit=crop"),
                    ("Ninh Bình", "Tour Ninh Bình Tràng An - Hang Múa 2N1Đ", "Chèo thuyền Tràng An, Leo đỉnh Hang Múa, Thăm Cố đô Hoa Lư", 1800000, "https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1200&auto=format&fit=crop"),
                    ("Đà Nẵng", "Kỳ nghỉ Đà Nẵng - Hội An cùng bạn thân", "Check-in Cầu Rồng, Tắm biển Mỹ Khê, Phố cổ Hội An, Ăn mì Quảng", 5200000, "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80"),
                    ("Tà Xùa", "Săn mây Tà Xùa - Chạm đỉnh gió 2N1Đ", "Phượt xe máy, Check-in Sống lưng khủng long, Đón bình minh mây luồn", 1600000, "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop"),
                    ("Mộc Châu", "Du lịch Mộc Châu - Mùa hoa mận & Đồi chè trái tim", "Thăm đồi chè, Hái mận tại thung lũng Nà Ka, Thác Dải Yếm", 2200000, "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?q=80&w=1200&auto=format&fit=crop"),
                    ("Cát Bà", "Khám phá Đảo Cát Bà & Du thuyền Vịnh Lan Hạ", "Tắm biển Bãi Cháy, Chèo thuyền Kayak Vịnh Lan Hạ, Thăm Làng chài Cái Bèo", 2800000, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop"),
                    ("Quy Nhơn", "Hành trình Quy Nhơn - Kỳ Co - Eo Gió", "Tắm biển Kỳ Co, Đi dạo Eo Gió, Thăm Tháp Bánh Ít, Ăn hải sản đường Xuân Diệu", 4800000, "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1200&auto=format&fit=crop"),
                    ("Phú Quốc", "Nghỉ dưỡng Đảo Ngọc Phú Quốc 4N3Đ", "Sunset Sanato ngắm hoàng hôn, Tour 4 đảo cáp treo Hòn Thơm, Chợ đêm Phú Quốc", 7500000, "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200&auto=format&fit=crop"),
                    ("Đà Lạt", "Check-in Đà Lạt xứ sở ngàn hoa", "Săn mây Đồi Đa Phú, Cà phê ngắm hoàng hôn, Chợ đêm Đà Lạt, Ăn bánh tráng nướng", 3800000, "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop"),
                    ("Huế", "Khám phá Cố đô Huế mộng mơ 3N2Đ", "Thăm Đại Nội, Lăng Khải Định, Nghe ca Huế trên sông Hương, Ăn bún bò Huế", 2900000, "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?q=80&w=1200&auto=format&fit=crop"),
                    ("Cao Bằng", "Du lịch Thác Bản Giốc & Động Ngườm Ngao", "Chiêm ngưỡng Thác Bản Giốc, Thăm Suối Lê-nin, Hang Pác Bó", 3100000, "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200&auto=format&fit=crop"),
                    ("Hải Phòng", "Food Tour Hải Phòng 2N1Đ cùng nhóm bạn", "Bánh đa cua, Bánh mì que cay, Ốc Thủy Dương, Dừa dầm Lạch Tray", 1200000, "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop"),
                    ("Hạ Long", "Trải nghiệm Vịnh Hạ Long & Ngủ đêm trên Du thuyền", "Tham quan Hang Sửng Sốt, Đảo Ti Tốp, Chèo thuyền Nan Hang Luồn", 3900000, "https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1200&auto=format&fit=crop")
                };

                var origins = new[] { "Hà Nội", "Hà Nội", "Hà Nội", "Hải Phòng", "Bắc Ninh", "Đà Nẵng", "TP. Hồ Chí Minh" };
                var newTrips = new List<Trip>();

                for (int i = 0; i < neededTrips; i++)
                {
                    var tpl = tripTemplates[random.Next(tripTemplates.Length)];
                    var origin = origins[random.Next(origins.Length)];
                    var daysOffset = random.Next(-10, 40);
                    var duration = random.Next(2, 5); // 2-4 ngày
                    var startDate = DateTime.UtcNow.Date.AddDays(daysOffset);
                    var endDate = startDate.AddDays(duration);
                    var budgetVariance = (decimal)(random.Next(-3, 4) * 200000);
                    var budget = Math.Max(1000000, tpl.Budget + budgetVariance);
                    var participants = random.Next(2, 7);
                    var ownerId = userIds[random.Next(userIds.Count)];
                    var daysAgo = random.Next(1, 22);

                    newTrips.Add(new Trip
                    {
                        Title = $"{tpl.Title} #{i + 1}",
                        Origin = origin,
                        Destination = tpl.Dest,
                        StartDate = startDate,
                        EndDate = endDate,
                        Budget = budget,
                        NumberOfParticipants = participants,
                        Preferences = tpl.Pref,
                        OwnerId = ownerId,
                        IsPublic = random.Next(0, 2) == 1,
                        CloneCount = random.Next(2, 85),
                        ImageUrl = tpl.Img,
                        CreatedAt = DateTime.UtcNow.AddDays(-daysAgo).AddMinutes(random.Next(0, 1440))
                    });
                }

                await context.Trips.AddRangeAsync(newTrips);
                await context.SaveChangesAsync();
                Console.WriteLine($"[AdminSeeder] Đã thêm thành công {newTrips.Count} chuyến đi. Tổng chuyến đi hiện tại = {await context.Trips.CountAsync()}");
            }
            else
            {
                Console.WriteLine($"[AdminSeeder] Chuyến đi đã đạt hoặc vượt mốc {targetTrips} ({currentTripsCount} trips). Không cần thêm mới.");
            }
        }
    }
}

