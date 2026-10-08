using Microsoft.EntityFrameworkCore;
using TravelWorkspace.API.Models;

namespace TravelWorkspace.API.Data
{
    public static class TripSeeder
    {
        public static async Task SeedTripsAsync(AppDbContext context)
        {
            // 1. Tìm hoặc khởi tạo Admin làm Owner cho các chuyến đi mẫu
            var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Role == "Admin" || u.Email == "admin@travelworkspace.com");
            if (adminUser == null)
            {
                adminUser = new User
                {
                    Email = "admin@travelworkspace.com",
                    FullName = "Administrator",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    Role = "Admin",
                    CreatedAt = DateTime.UtcNow
                };
                context.Users.Add(adminUser);
                await context.SaveChangesAsync();
            }

            int adminId = adminUser.Id;
            var baseDate = DateTime.UtcNow.Date.AddDays(7); // Bắt đầu sau 7 ngày kể từ hiện tại

            // Ảnh đại diện chuẩn xác theo danh lam thắng cảnh Việt Nam
            const string haGiangImg = "https://images.unsplash.com/photo-1628107773229-23f03b2909be?q=80&w=1200&auto=format&fit=crop"; // Núi đồi hùng vĩ / Đèo Mã Pì Lèng
            const string daNangImg = "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80";  // Sun World Bà Nà Hills & Cầu Vàng
            const string sapaImg = "https://images.unsplash.com/photo-1549474720-333e61f22e86?q=80&w=1200&auto=format&fit=crop";    // Ruộng bậc thang / Núi Sapa chuẩn xác

            // =========================================================================
            // TEMPLATE 1: "Khám phá Hà Giang - Mùa hoa Tam Giác Mạch" (3 ngày 2 đêm)
            // =========================================================================
            const string title1 = "Khám phá Hà Giang - Mùa hoa Tam Giác Mạch";
            if (!await context.Trips.AnyAsync(t => t.Title == title1))
            {
                var trip1Start = baseDate;
                var trip1End = trip1Start.AddDays(2); // 3 ngày 2 đêm

                var trip1 = new Trip
                {
                    Title = title1,
                    Origin = "Hà Nội",
                    Destination = "Hà Giang",
                    StartDate = trip1Start,
                    EndDate = trip1End,
                    Budget = 3500000,
                    NumberOfParticipants = 2,
                    Preferences = "Phượt xe máy, Ngắm cảnh hùng vĩ, Chụp ảnh hoa tam giác mạch, Khám phá văn hóa bản địa H'Mông",
                    OwnerId = adminId,
                    IsPublic = true,
                    CloneCount = 128,
                    ImageUrl = haGiangImg,
                    CreatedAt = DateTime.UtcNow
                };

                // Ngày 1: Hà Nội - Quản Bạ - Phố cổ Đồng Văn
                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Khởi hành từ Hà Nội đi TP. Hà Giang bằng xe Limousine",
                    Location = "Bến xe Mỹ Đình, Hà Nội -> TP. Hà Giang",
                    Destination = "Hà Giang",
                    StartTime = trip1Start.AddHours(6),
                    EndTime = trip1Start.AddHours(11).AddMinutes(30),
                    Transport = "Xe Limousine giường nằm",
                    Assignee = "Trưởng nhóm",
                    Status = "Chưa bắt đầu",
                    Notes = "Nghỉ ngơi trên xe, ngắm cảnh trung du Bắc Bộ. Đến TP. Hà Giang làm thủ tục nhận xe máy phượt."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Thưởng thức Phở chua Hà Giang & Cơm lam vùng cao",
                    Location = "Số 12 Bạch Đằng, Phường Trần Phú, TP. Hà Giang",
                    Destination = "Hà Giang",
                    StartTime = trip1Start.AddHours(11).AddMinutes(45),
                    EndTime = trip1Start.AddHours(13),
                    Transport = "Đi bộ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Nạp năng lượng với món phở chua trứ danh trước khi bắt đầu hành trình vượt dốc Bắc Sum."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Chinh phục Dốc Bắc Sum & Check-in Cổng trời Quản Bạ",
                    Location = "Cổng trời Quản Bạ, Quốc lộ 4C, Tam Sơn, Quản Bạ, Hà Giang",
                    Destination = "Quản Bạ",
                    StartTime = trip1Start.AddHours(13).AddMinutes(30),
                    EndTime = trip1Start.AddHours(15).AddMinutes(30),
                    Transport = "Xe máy",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Dừng chân tại Cổng trời ngắm nhìn Núi Đôi Cô Tiên tuyệt đẹp trong làn sương mờ cao nguyên đá."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Dạo bước Phố cổ Đồng Văn & Check-in Nhà cổ vùng cao",
                    Location = "Phố cổ Đồng Văn, Thị trấn Đồng Văn, Huyện Đồng Văn, Hà Giang",
                    Destination = "Đồng Văn",
                    StartTime = trip1Start.AddHours(16).AddMinutes(30),
                    EndTime = trip1Start.AddHours(18).AddMinutes(30),
                    Transport = "Xe máy / Đi bộ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Khám phá kiến trúc nhà trình tường mái ngói âm dương có tuổi đời trên 100 năm của người Hoa và H'Mông."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Thưởng thức Lẩu gà đen, Thắng cố & Nhâm nhi Rượu ngô Men lá",
                    Location = "Chợ đêm Phố cổ Đồng Văn, Hà Giang",
                    Destination = "Đồng Văn",
                    StartTime = trip1Start.AddHours(19),
                    EndTime = trip1Start.AddHours(21).AddMinutes(30),
                    Transport = "Đi bộ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Giao lưu văn nghệ cùng đồng bào vùng cao, ghé quán Cà phê Phố Cổ thưởng thức trà gừng ấm nóng."
                });

                // Ngày 2: Cột cờ Lũng Cú - Đèo Mã Pì Lèng - Sông Nho Quế
                var d2 = trip1Start.AddDays(1);
                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Ăn sáng Bánh cuốn trứng Đồng Văn & Khởi hành đi Lũng Cú",
                    Location = "Khu ẩm thực Phố cổ Đồng Văn, Hà Giang",
                    Destination = "Đồng Văn",
                    StartTime = d2.AddHours(7),
                    EndTime = d2.AddHours(8).AddMinutes(15),
                    Transport = "Đi bộ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Bánh cuốn trứng tráng mỏng mềm mướt chấm cùng nước hầm xương đậm đà ngát hương tiêu ớt."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Chinh phục Cột cờ Lũng Cú - Điểm cực Bắc thiêng liêng Tổ quốc",
                    Location = "Cột cờ Lũng Cú, Xã Lũng Cú, Huyện Đồng Văn, Hà Giang",
                    Destination = "Lũng Cú",
                    StartTime = d2.AddHours(9),
                    EndTime = d2.AddHours(11).AddMinutes(30),
                    Transport = "Xe máy",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Vượt 839 bậc đá lên đỉnh núi Rồng, ngắm lá cờ đỏ sao vàng 54m2 tung bay kiêu hãnh trên bầu trời biên cương."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Ăn trưa & Ngắm đồng hoa tam giác mạch tại Bản Lô Lô Chải",
                    Location = "Làng văn hóa Lô Lô Chải, Dưới chân núi Rồng, Lũng Cú, Hà Giang",
                    Destination = "Lũng Cú",
                    StartTime = d2.AddHours(11).AddMinutes(45),
                    EndTime = d2.AddHours(13).AddMinutes(15),
                    Transport = "Xe máy",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Chụp ảnh tại cánh đồng hoa tam giác mạch nở rộ hồng tím ven các bờ rào đá cổ kính."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Chinh phục Đèo Mã Pì Lèng - Vua của Tứ đại đỉnh đèo miền Bắc",
                    Location = "Đèo Mã Pì Lèng, Quốc lộ 4C, Huyện Mèo Vạc, Hà Giang",
                    Destination = "Mã Pì Lèng",
                    StartTime = d2.AddHours(14),
                    EndTime = d2.AddHours(16),
                    Transport = "Xe máy",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Dừng chân tại Trạm dừng Panorama ngắm hẻm vực Tu Sản sâu nhất Đông Nam Á giữa mây trời trập trùng."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Đi thuyền máy trên Sông Nho Quế & Chiêm ngưỡng Hẻm Tu Sản",
                    Location = "Bến thuyền Tà Làng, Sông Nho Quế, Xã Pải Lủng, Mèo Vạc, Hà Giang",
                    Destination = "Sông Nho Quế",
                    StartTime = d2.AddHours(16).AddMinutes(15),
                    EndTime = d2.AddHours(18),
                    Transport = "Thuyền máy",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Lướt trên làn nước xanh ngọc bích phẳng lặng giữa hai vách đá vôi dựng đứng kỳ vĩ."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Nghỉ đêm và đốt lửa trại tại Làng văn hóa du lịch cộng đồng Pả Vi",
                    Location = "Làng văn hóa Pả Vi Hạ, Xã Pả Vi, Huyện Mèo Vạc, Hà Giang",
                    Destination = "Mèo Vạc",
                    StartTime = d2.AddHours(19),
                    EndTime = d2.AddHours(22),
                    Transport = "Xe máy",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Thưởng thức thịt lợn đen cắp nách nướng than hồng, giao lưu lửa trại cùng bà con bản địa."
                });

                // Ngày 3: Dinh Vua Mèo - Rừng thông Yên Minh - Trở về Hà Nội
                var d3 = trip1Start.AddDays(2);
                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Tham quan Dinh thự Vua Mèo (Khu di tích Dinh họ Vương)",
                    Location = "Dinh Vua Mèo, Thung lũng Sà Phìn, Huyện Đồng Văn, Hà Giang",
                    Destination = "Sà Phìn",
                    StartTime = d3.AddHours(8),
                    EndTime = d3.AddHours(10),
                    Transport = "Xe máy",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Tìm hiểu dinh thự kiên cố của thủ lĩnh Vương Chính Đức kết hợp tinh hoa kiến trúc Pháp, Hoa và H'Mông."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Dạo bước Rừng thông Yên Minh & Ăn trưa đặc sản vùng cao",
                    Location = "Rừng thông Yên Minh, Quốc lộ 4C, Huyện Yên Minh, Hà Giang",
                    Destination = "Yên Minh",
                    StartTime = d3.AddHours(10).AddMinutes(30),
                    EndTime = d3.AddHours(13),
                    Transport = "Xe máy",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Tận hưởng không khí se lạnh trong lành tựa 'Đà Lạt thu nhỏ' giữa lòng miền đá Tây Bắc."
                });

                trip1.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Về lại TP. Hà Giang, trả xe máy và lên xe Limousine về Hà Nội",
                    Location = "TP. Hà Giang -> Bến xe Mỹ Đình, Hà Nội",
                    Destination = "Hà Nội",
                    StartTime = d3.AddHours(15).AddMinutes(30),
                    EndTime = d3.AddHours(21).AddMinutes(30),
                    Transport = "Xe Limousine",
                    Assignee = "Trưởng nhóm",
                    Status = "Chưa bắt đầu",
                    Notes = "Mua trà Shan tuyết cổ thụ và mật ong hoa bạc hà làm quà. Kết thúc hành trình Hà Giang trọn vẹn."
                });

                context.Trips.Add(trip1);
            }

            // =========================================================================
            // TEMPLATE 2: "Đà Nẵng & Hội An - Hành trình Di sản" (4 ngày 3 đêm)
            // =========================================================================
            const string title2 = "Đà Nẵng & Hội An - Hành trình Di sản";
            if (!await context.Trips.AnyAsync(t => t.Title == title2))
            {
                var trip2Start = baseDate.AddDays(4);
                var trip2End = trip2Start.AddDays(3); // 4 ngày 3 đêm

                var trip2 = new Trip
                {
                    Title = title2,
                    Origin = "Hà Nội",
                    Destination = "Đà Nẵng",
                    StartDate = trip2Start,
                    EndDate = trip2End,
                    Budget = 5800000,
                    NumberOfParticipants = 2,
                    Preferences = "Nghỉ dưỡng biển, Khám phá di sản UNESCO, Ẩm thực miền Trung, Check-in kiến trúc nổi tiếng",
                    OwnerId = adminId,
                    IsPublic = true,
                    CloneCount = 256,
                    ImageUrl = daNangImg,
                    CreatedAt = DateTime.UtcNow
                };

                // Ngày 1: Đến Đà Nẵng - Quán Mì Quảng Bếp Trang - Chùa Linh Ứng Sơn Trà
                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Đáp chuyến bay đến Đà Nẵng & Nhận phòng khách sạn Mỹ Khê",
                    Location = "Sân bay Quốc tế Đà Nẵng -> Bãi biển Mỹ Khê, Sơn Trà, Đà Nẵng",
                    Destination = "Đà Nẵng",
                    StartTime = trip2Start.AddHours(8).AddMinutes(30),
                    EndTime = trip2Start.AddHours(10).AddMinutes(30),
                    Transport = "Máy bay / Taxi",
                    Assignee = "Trưởng nhóm",
                    Status = "Chưa bắt đầu",
                    Notes = "Check-in khách sạn hướng biển Mỹ Khê, cất hành lý và nghỉ ngơi nhẹ nhàng."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Thưởng thức ẩm thực trứ danh tại Quán Mì Quảng Bếp Trang",
                    Location = "Quán Mì Quảng Bếp Trang, 441 Ông Ích Khiêm, Hải Châu, Đà Nẵng",
                    Destination = "Đà Nẵng",
                    StartTime = trip2Start.AddHours(11).AddMinutes(30),
                    EndTime = trip2Start.AddHours(13),
                    Transport = "Taxi / Grab",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Thưởng thức Mì Quảng ếch om niêu đất nóng hổi trứ danh cùng rau sống Trà Quế và bánh tráng mè nướng."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Chiêm bái Chùa Linh Ứng Sơn Trà & Chiêm ngưỡng Tượng Phật Bà 67m",
                    Location = "Chùa Linh Ứng Bãi Bụt, Bán đảo Sơn Trà, TP. Đà Nẵng",
                    Destination = "Sơn Trà",
                    StartTime = trip2Start.AddHours(14).AddMinutes(30),
                    EndTime = trip2Start.AddHours(17),
                    Transport = "Ô tô / Taxi",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Ngắm trọn vịnh Đà Nẵng tuyệt đẹp từ trên cao và chiêm bái tượng Phật Quan Thế Âm cao nhất Việt Nam."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Ăn tối hải sản Năm Đảnh & Ngắm Cầu Rồng phun lửa phun nước",
                    Location = "Cầu Rồng, Đường Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
                    Destination = "Đà Nẵng",
                    StartTime = trip2Start.AddHours(18).AddMinutes(30),
                    EndTime = trip2Start.AddHours(21).AddMinutes(30),
                    Transport = "Taxi / Đi bộ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Thưởng thức ghẹ hấp, mực một nắng nướng sa tế và đón xem biểu diễn Cầu Rồng phun lửa lúc 21:00."
                });

                // Ngày 2: Sun World Bà Nà Hills - Cầu Vàng - Di chuyển Phố cổ Hội An
                var t2d2 = trip2Start.AddDays(1);
                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Chinh phục Sun World Bà Nà Hills & Check-in Cầu Vàng kỳ quan",
                    Location = "Sun World Bà Nà Hills, Thôn An Sơn, Xã Hòa Ninh, Huyện Hòa Vang, Đà Nẵng",
                    Destination = "Bà Nà Hills",
                    StartTime = t2d2.AddHours(8),
                    EndTime = t2d2.AddHours(15).AddMinutes(30),
                    Transport = "Cáp treo Bà Nà Hills",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Trải nghiệm cáp treo đạt nhiều kỷ lục thế giới, dạo bước trên Cầu Vàng bàn tay khổng lồ, thăm Làng Pháp và Hầm rượu Debay."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Di chuyển về Phố cổ Hội An & Nhận phòng boutique resort",
                    Location = "Bà Nà Hills -> Phố cổ Hội An, Tỉnh Quảng Nam",
                    Destination = "Hội An",
                    StartTime = t2d2.AddHours(16),
                    EndTime = t2d2.AddHours(17).AddMinutes(30),
                    Transport = "Xe đưa đón",
                    Assignee = "Trưởng nhóm",
                    Status = "Chưa bắt đầu",
                    Notes = "Đi dọc cung đường ven biển vào trung tâm Hội An, check-in resort thanh bình ven sông Hoài."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Dạo chơi Phố cổ Hội An, Thả hoa đăng Sông Hoài & Ngắm đèn lồng",
                    Location = "Phố cổ Hội An, Đường Bạch Đằng, Minh An, Hội An",
                    Destination = "Hội An",
                    StartTime = t2d2.AddHours(18).AddMinutes(30),
                    EndTime = t2d2.AddHours(21).AddMinutes(45),
                    Transport = "Đi bộ / Thuyền gỗ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Thưởng thức Cao lầu Bá Lễ, chèo thuyền hoa đăng ước nguyện và thưởng thức nước Mót thảo mộc sả chanh thanh mát."
                });

                // Ngày 3: Rừng dừa Bảy Mẫu - Trà Mót - Ký ức Hội An
                var t2d3 = trip2Start.AddDays(2);
                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Khám phá Rừng dừa Bảy Mẫu & Trải nghiệm lắc thuyền thúng độc đáo",
                    Location = "Khu du lịch sinh thái Rừng dừa Bảy Mẫu, Xã Cẩm Thanh, Hội An",
                    Destination = "Cẩm Thanh",
                    StartTime = t2d3.AddHours(8).AddMinutes(30),
                    EndTime = t2d3.AddHours(11).AddMinutes(30),
                    Transport = "Thuyền thúng",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Thử cảm giác múa thúng xoay vòng cảm giác mạnh, câu cua đá trong rừng dừa nước bạt ngàn."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Ăn trưa Cơm gà Bà Buội nức tiếng Hội An",
                    Location = "22 Phan Châu Trinh, Phường Minh An, TP. Hội An",
                    Destination = "Hội An",
                    StartTime = t2d3.AddHours(12),
                    EndTime = t2d3.AddHours(13).AddMinutes(30),
                    Transport = "Đi bộ / Taxi",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Cơm gà xé vàng óng ả thơm dẻo nấu bằng nước luộc gà, ăn kèm nộm đu đủ giòn ngọt đậm vị cổ truyền."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Thưởng thức Trà Mót thảo mộc & Check-in Chùa Cầu di sản",
                    Location = "Mót Hội An (150 Trần Phú) & Chùa Cầu Hội An (Đường Nguyễn Thị Minh Khai)",
                    Destination = "Hội An",
                    StartTime = t2d3.AddHours(15),
                    EndTime = t2d3.AddHours(17).AddMinutes(30),
                    Transport = "Đi bộ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Thăm biểu tượng di sản Chùa Cầu cổ kính hàng trăm năm tuổi giao thoa kiến trúc Nhật - Việt."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Xem Đại show diễn thực cảnh 'Ký Ức Hội An'",
                    Location = "Công viên Ấn tượng Hội An, Cồn Hến, Cẩm Nam, Hội An",
                    Destination = "Hội An",
                    StartTime = t2d3.AddHours(19),
                    EndTime = t2d3.AddHours(21).AddMinutes(30),
                    Transport = "Xe điện",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Mãn nhãn với sân khấu ngoài trời 25.000m2 tái hiện sống động thương cảng phồn hoa Faifo thế kỷ 16-17."
                });

                // Ngày 4: Chợ Hội An - Mua sắm đặc sản - Trở về
                var t2d4 = trip2Start.AddDays(3);
                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Đạp xe ngắm đồng quê Cẩm Châu & Thưởng thức cà phê Roastery",
                    Location = "Làng Cẩm Châu & Hội An Roastery, Phố cổ Hội An",
                    Destination = "Hội An",
                    StartTime = t2d4.AddHours(7).AddMinutes(30),
                    EndTime = t2d4.AddHours(9).AddMinutes(30),
                    Transport = "Xe đạp",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Hít thở gió sớm trong lành trên những cánh đồng lúa xanh mướt trước khi trả phòng."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Mua đặc sản Bánh dừa nướng, Mắm nêm Dì Cẩn & Check-out",
                    Location = "Chợ Hàn, Đường Trần Phú, Hải Châu, Đà Nẵng",
                    Destination = "Đà Nẵng",
                    StartTime = t2d4.AddHours(10).AddMinutes(30),
                    EndTime = t2d4.AddHours(12).AddMinutes(30),
                    Transport = "Taxi",
                    Assignee = "Trưởng nhóm",
                    Status = "Chưa bắt đầu",
                    Notes = "Ghé chợ Hàn mua chả bò Đà Nẵng, mực rim me và bánh khô mè Bà Liễu làm quà biếu."
                });

                trip2.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Ra Sân bay Quốc tế Đà Nẵng, bay về Hà Nội",
                    Location = "Sân bay Quốc tế Đà Nẵng -> Sân bay Nội Bài, Hà Nội",
                    Destination = "Hà Nội",
                    StartTime = t2d4.AddHours(13).AddMinutes(30),
                    EndTime = t2d4.AddHours(16),
                    Transport = "Máy bay",
                    Assignee = "Trưởng nhóm",
                    Status = "Chưa bắt đầu",
                    Notes = "Kết thúc hành trình Đà Nẵng - Hội An đong đầy kỷ niệm và những thước phim đẹp mắt."
                });

                context.Trips.Add(trip2);
            }

            // =========================================================================
            // TEMPLATE 3: "Sapa Mờ Sương & Chinh phục Fansipan" (2 ngày 1 đêm)
            // =========================================================================
            const string title3 = "Sapa Mờ Sương & Chinh phục Fansipan";
            if (!await context.Trips.AnyAsync(t => t.Title == title3))
            {
                var trip3Start = baseDate.AddDays(8);
                var trip3End = trip3Start.AddDays(1); // 2 ngày 1 đêm

                var trip3 = new Trip
                {
                    Title = title3,
                    Origin = "Hà Nội",
                    Destination = "Sapa",
                    StartDate = trip3Start,
                    EndDate = trip3End,
                    Budget = 2800000,
                    NumberOfParticipants = 2,
                    Preferences = "Săn mây, Leo núi cáp treo, Chụp ảnh bản làng Tây Bắc, Ẩm thực lẩu cá hồi sapa",
                    OwnerId = adminId,
                    IsPublic = true,
                    CloneCount = 184,
                    ImageUrl = sapaImg,
                    CreatedAt = DateTime.UtcNow
                };

                // Ngày 1: Hà Nội - Sapa - Bản Cát Cát - Đèo Ô Quy Hồ - Lẩu cá hồi
                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Di chuyển Limousine cao tốc Hà Nội - Lào Cai lên Sa Pa",
                    Location = "Hà Nội -> Thị xã Sa Pa, Tỉnh Lào Cai",
                    Destination = "Sa Pa",
                    StartTime = trip3Start.AddHours(6),
                    EndTime = trip3Start.AddHours(11).AddMinutes(30),
                    Transport = "Xe Limousine VIP",
                    Assignee = "Trưởng nhóm",
                    Status = "Chưa bắt đầu",
                    Notes = "Chạy thẳng cao tốc Nội Bài - Lào Cai êm ái, nhận phòng khách sạn trung tâm Sa Pa ngắm thung lũng."
                });

                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Thưởng thức Lẩu cá hồi Sapa đặc sản nóng hổi",
                    Location = "Nhà hàng A Phủ, Số 15 Fansipan, Sa Pa, Lào Cai",
                    Destination = "Sa Pa",
                    StartTime = trip3Start.AddHours(12),
                    EndTime = trip3Start.AddHours(13).AddMinutes(30),
                    Transport = "Đi bộ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Nồi lẩu cá hồi nuôi lạnh tươi rói kèm các loại rau rừng Tây Bắc giòn ngọt trong tiết trời se lạnh."
                });

                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Khám phá Bản Cát Cát - Bản làng cổ tích của người H'Mông",
                    Location = "Bản Cát Cát, Xã Hoàng Liên, Thị xã Sa Pa, Lào Cai",
                    Destination = "Cát Cát",
                    StartTime = trip3Start.AddHours(14),
                    EndTime = trip3Start.AddHours(16).AddMinutes(30),
                    Transport = "Đi bộ / Xe máy",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Thuê váy áo thổ cẩm dân tộc check-in Thác Tiên Sa, guồng nước gỗ khổng lồ và nhà gỗ trình tường pơ mu."
                });

                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Săn hoàng hôn biển mây ngoạn mục trên đỉnh Đèo Ô Quy Hồ",
                    Location = "Đèo Ô Quy Hồ & Cổng trời Sa Pa, Ranh giới Lào Cai - Lai Châu",
                    Destination = "Ô Quy Hồ",
                    StartTime = trip3Start.AddHours(17),
                    EndTime = trip3Start.AddHours(19),
                    Transport = "Xe máy / Ô tô",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Chiêm ngưỡng 'Tứ đại đỉnh đèo' Tây Bắc với biển mây bồng bềnh nhuộm vàng rực rỡ trong ánh chiều tà."
                });

                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Thưởng thức đồ nướng than hoa Sa Pa & Dạo phố Nhà thờ Đá cổ",
                    Location = "Phố nướng Cầu Mây & Quảng trường Nhà thờ Đá Sa Pa",
                    Destination = "Sa Pa",
                    StartTime = trip3Start.AddHours(19).AddMinutes(30),
                    EndTime = trip3Start.AddHours(22),
                    Transport = "Đi bộ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Thịt xiên cuốn cải mèo, nấm hương nướng phô mai, hạt dẻ nướng thơm lừng trong tiết trời 15 độ C."
                });

                // Ngày 2: Đỉnh Fansipan - Mua đặc sản - Trở về Hà Nội
                var t3d2 = trip3Start.AddDays(1);
                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Ăn sáng buffet & Cà phê ngắm mây thung lũng Mường Hoa",
                    Location = "Trung tâm Thị xã Sa Pa, Lào Cai",
                    Destination = "Sa Pa",
                    StartTime = t3d2.AddHours(7),
                    EndTime = t3d2.AddHours(8),
                    Transport = "Đi bộ",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Nhâm nhi tách cà phê nóng ngắm sương sớm lãng đãng tràn qua những nếp nhà sàn."
                });

                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Chinh phục Đỉnh Fansipan 3.143m - Nóc nhà Đông Dương kỳ vĩ",
                    Location = "Quần thể Sun World Fansipan Legend, Đường Nguyễn Chí Thanh, Sa Pa",
                    Destination = "Fansipan",
                    StartTime = t3d2.AddHours(8).AddMinutes(30),
                    EndTime = t3d2.AddHours(12).AddMinutes(30),
                    Transport = "Tàu hỏa leo núi Mường Hoa & Cáp treo Fansipan",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Vượt biển mây bồng bềnh bằng cáp treo 3 dây hiện đại, chiêm bái Đại tượng Phật A Di Đà và chạm tay vào cột mốc 3.143m linh thiêng."
                });

                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Ăn trưa & Thưởng thức đặc sản lợn bản cắp nách",
                    Location = "Nhà hàng Đỗ Quyên, Khu du lịch Fansipan Legend",
                    Destination = "Fansipan",
                    StartTime = t3d2.AddHours(12).AddMinutes(45),
                    EndTime = t3d2.AddHours(14),
                    Transport = "Cáp treo",
                    Assignee = "Tất cả",
                    Status = "Chưa bắt đầu",
                    Notes = "Nghỉ ngơi lấy lại sức sau khi leo các bậc thang đá trên đỉnh núi cao."
                });

                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Mua đặc sản Hạt dẻ Sapa, Thịt trâu gác bếp & Check-out khách sạn",
                    Location = "Chợ Sa Pa, Đường Lương Đình Của, Sa Pa, Lào Cai",
                    Destination = "Sa Pa",
                    StartTime = t3d2.AddHours(14).AddMinutes(30),
                    EndTime = t3d2.AddHours(15).AddMinutes(45),
                    Transport = "Đi bộ",
                    Assignee = "Trưởng nhóm",
                    Status = "Chưa bắt đầu",
                    Notes = "Ghé chợ mua nấm hương rừng, mắc khén, hạt dẻ nóng hổi và trà thảo mộc atiso làm quà."
                });

                trip3.ItineraryItems.Add(new ItineraryItem
                {
                    Title = "Lên xe Limousine trở về Hà Nội",
                    Location = "Thị xã Sa Pa -> Bến xe Mỹ Đình, Hà Nội",
                    Destination = "Hà Nội",
                    StartTime = t3d2.AddHours(16),
                    EndTime = t3d2.AddHours(21).AddMinutes(30),
                    Transport = "Xe Limousine",
                    Assignee = "Trưởng nhóm",
                    Status = "Chưa bắt đầu",
                    Notes = "Khép lại hành trình săn mây và chinh phục Nóc nhà Đông Dương đầy cảm xúc."
                });

                context.Trips.Add(trip3);
            }

            // =========================================================================
            // FORCE UPDATE: Tìm đích danh các Trip mẫu (theo Title hoặc Destination)
            // Bỏ qua các điều kiện chặn, gán cứng lại ImageUrl chuẩn xác và SaveChanges
            // =========================================================================
            var sapaTrip = await context.Trips.FirstOrDefaultAsync(t => t.Title.Contains("Sapa") || t.Destination.Contains("Sapa"));
            if (sapaTrip != null)
            {
                sapaTrip.ImageUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFmJ_6MmXJRegOqgi4ut2oe_kWnv1IVu6-IeT-sPVXtA&s=10";
                sapaTrip.IsPublic = true;
            }

            var hgTrip = await context.Trips.FirstOrDefaultAsync(t => t.Title.Contains("Hà Giang") || t.Destination.Contains("Hà Giang"));
            if (hgTrip != null)
            {
                hgTrip.ImageUrl = "https://bizweb.dktcdn.net/100/101/075/files/ha-giang-cc7ce472-6210-4228-b37c-dafb1892310a.jpg?v=1759288094322";
                hgTrip.IsPublic = true;
            }

            var daNangTrip = await context.Trips.FirstOrDefaultAsync(t => t.Title.Contains("Đà Nẵng") || t.Destination.Contains("Đà Nẵng"));
            if (daNangTrip != null)
            {
                daNangTrip.ImageUrl = daNangImg;
                daNangTrip.IsPublic = true;
            }

            // Đồng thời ép cập nhật cho tất cả bản ghi Trip khác có liên quan đến Sapa / Hà Giang / Đà Nẵng
            var allSapa = await context.Trips.Where(t => t.Title.Contains("Sapa") || t.Destination.Contains("Sapa") || t.Destination.Contains("Sa Pa")).ToListAsync();
            foreach (var t in allSapa)
            {
                t.ImageUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFmJ_6MmXJRegOqgi4ut2oe_kWnv1IVu6-IeT-sPVXtA&s=10";
            }

            var allHg = await context.Trips.Where(t => t.Title.Contains("Hà Giang") || t.Destination.Contains("Hà Giang")).ToListAsync();
            foreach (var t in allHg)
            {
                t.ImageUrl = "https://bizweb.dktcdn.net/100/101/075/files/ha-giang-cc7ce472-6210-4228-b37c-dafb1892310a.jpg?v=1759288094322";
            }

            var allDn = await context.Trips.Where(t => t.Title.Contains("Đà Nẵng") || t.Destination.Contains("Đà Nẵng")).ToListAsync();
            foreach (var t in allDn)
            {
                t.ImageUrl = daNangImg;
            }

            // Các bản ghi cloned của người dùng hoặc chuyến đi riêng tư không hiển thị trên kho public mẫu
            var privateOrCloned = await context.Trips
                .Where(t => !t.Title.Contains("Hà Giang") && !t.Title.Contains("Đà Nẵng") && !t.Title.Contains("Sapa"))
                .ToListAsync();
            foreach (var t in privateOrCloned)
            {
                t.IsPublic = false;
            }

            // Xóa triệt để bản ghi "Private Trip Demo" khỏi Database nếu vẫn còn
            var privateDemos = await context.Trips
                .Where(t => t.Title.Contains("Private Trip Demo"))
                .ToListAsync();
            if (privateDemos.Any())
            {
                context.Trips.RemoveRange(privateDemos);
            }

            // Gọi context.SaveChangesAsync(); để chọc thẳng xuống Database
            await context.SaveChangesAsync();
        }
    }
}
