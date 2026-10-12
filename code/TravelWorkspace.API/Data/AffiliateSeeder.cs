using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TravelWorkspace.API.Models;

namespace TravelWorkspace.API.Data
{
    public static class AffiliateSeeder
    {
        public static async Task SeedAffiliateServicesAsync(AppDbContext context)
        {
            // Xóa dữ liệu mẫu cũ nếu có
            if (await context.AffiliateDestinationServices.AnyAsync())
            {
                var existingDemo = await context.AffiliateDestinationServices
                    .Where(s => !s.AffiliateUrl.Contains("shorten.asia"))
                    .ToListAsync();
                if (existingDemo.Any())
                {
                    context.AffiliateDestinationServices.RemoveRange(existingDemo);
                    await context.SaveChangesAsync();
                }
            }

            var existingNames = await context.AffiliateDestinationServices
                .Select(s => s.Name)
                .ToListAsync();

            var realServices = new List<AffiliateDestinationService>
            {
                // ==========================================
                // 1. QUẢNG NINH - VỊNH HẠ LONG & BÃI CHÁY
                // ==========================================
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Vịnh Hạ Long & Bãi Cháy",
                    Category = "hotel",
                    Name = "Halios Hotel Halong",
                    AffiliateUrl = "https://shorten.asia/JcA53PgX",
                    Notes = "Khách sạn trung tâm Bãi Cháy, gần bãi tắm và công viên Sun World.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Vịnh Hạ Long & Bãi Cháy",
                    Category = "hotel",
                    Name = "Halong Lavender Hotel",
                    AffiliateUrl = "https://shorten.asia/S3JcJAZ6",
                    Notes = "Không gian nghỉ dưỡng hiện đại, view nhìn ra Vịnh Hạ Long thoáng mát.",
                    Rating = 4.7,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Vịnh Hạ Long & Bãi Cháy",
                    Category = "hotel",
                    Name = "Halong Boutique Hotel",
                    AffiliateUrl = "https://shorten.asia/z6CQVMef",
                    Notes = "Khách sạn phong cách Boutique sang trọng, dịch vụ chuyên nghiệp.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Vịnh Hạ Long & Bãi Cháy",
                    Category = "hotel",
                    Name = "Bảo Ngọc Hotel 2",
                    AffiliateUrl = "https://shorten.asia/KqEEGVvj",
                    Notes = "Khách sạn tiện nghi, giá hợp lý, thuận tiện di chuyển ra bến tàu.",
                    Rating = 4.6,
                    IsActive = true
                },

                // ==========================================
                // 1B. QUẢNG NINH - YÊN TỬ
                // ==========================================
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Yên Tử",
                    Category = "hotel",
                    Name = "Legacy Yen Tu Hotel - MGallery Collection",
                    AffiliateUrl = "https://shorten.asia/429ha1PE",
                    Notes = "Khu nghỉ dưỡng 5 sao đẳng cấp quốc tế dưới chân núi Yên Tử, kiến trúc cung đình thời Trần.",
                    Rating = 4.9,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Yên Tử",
                    Category = "hotel",
                    Name = "Yen Tu Village",
                    AffiliateUrl = "https://shorten.asia/ezkBASAC",
                    Notes = "Làng hành hương Yên Tử mang phong cách truyền thống yên bình, mộc mạc.",
                    Rating = 4.7,
                    IsActive = true
                },

                // ==========================================
                // 1C. QUẢNG NINH - ĐẢO CÔ TÔ
                // ==========================================
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Đảo Cô Tô",
                    Category = "hotel",
                    Name = "Coto Center Homestay",
                    AffiliateUrl = "https://shorten.asia/TADrDdnM",
                    Notes = "Homestay ngay trung tâm thị trấn Cô Tô, gần chợ hải sản và bãi biển.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Đảo Cô Tô",
                    Category = "hotel",
                    Name = "Coto Eco Lodge",
                    AffiliateUrl = "https://shorten.asia/aJNpXRf4",
                    Notes = "Khu nhà gỗ sinh thái độc đáo bên bãi biển Hồng Vàn, không gian yên tĩnh.",
                    Rating = 4.8,
                    IsActive = true
                },

                // ==========================================
                // 1D. QUẢNG NINH - QUAN LẠN & MINH CHÂU
                // ==========================================
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Quan Lạn - Minh Châu",
                    Category = "hotel",
                    Name = "Angsana Quan Lan Ha Long Bay",
                    AffiliateUrl = "https://shorten.asia/h6kTTSe3",
                    Notes = "Resort cao cấp bên bờ biển Quan Lạn hoang sơ, hồ bơi và tiện ích 5 sao.",
                    Rating = 4.9,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Quan Lạn - Minh Châu",
                    Category = "hotel",
                    Name = "Khách sạn Paloma",
                    AffiliateUrl = "https://shorten.asia/DuUjQJBt",
                    Notes = "Khách sạn sạch sẽ, đầy đủ tiện nghi gần bãi tắm Minh Châu cát trắng mịn.",
                    Rating = 4.6,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Quảng Ninh",
                    Destination = "Quan Lạn - Minh Châu",
                    Category = "hotel",
                    Name = "Minh Châu Riverside",
                    AffiliateUrl = "https://shorten.asia/86955uGQ",
                    Notes = "Không gian thoáng mát ven sông, thuận tiện tắm biển và ăn hải sản.",
                    Rating = 4.7,
                    IsActive = true
                },

                // ==========================================
                // 2. LÀO CAI / SA PA - TRUNG TÂM SA PA
                // ==========================================
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Trung tâm Thị trấn Sa Pa",
                    Category = "hotel",
                    Name = "DeLaSol Sapa Hotel",
                    AffiliateUrl = "https://shorten.asia/qruA6GRK",
                    Notes = "Khách sạn tiện nghi trung tâm Sa Pa, view thung lũng mây bồng bềnh.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Trung tâm Thị trấn Sa Pa",
                    Category = "hotel",
                    Name = "KK Sapa Hotel",
                    AffiliateUrl = "https://shorten.asia/4mUeh5BN",
                    Notes = "Khách sạn 5 sao sang trọng nhìn thẳng ra Thung Lũng Mường Hoa và Fansipan.",
                    Rating = 4.9,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Trung tâm Thị trấn Sa Pa",
                    Category = "hotel",
                    Name = "Pao's Sapa Leisure Hotel",
                    AffiliateUrl = "https://shorten.asia/6pfAt6qB",
                    Notes = "Khách sạn 5 sao đẳng cấp ôm trọn triền đồi, hồ bơi nước nóng trong nhà.",
                    Rating = 4.9,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Trung tâm Thị trấn Sa Pa",
                    Category = "hotel",
                    Name = "Ville De Mont Mountain Resort",
                    AffiliateUrl = "https://shorten.asia/myJrNyWG",
                    Notes = "Khu nghỉ dưỡng biệt thự đỉnh núi cao cấp bậc nhất Sa Pa giữa rừng thông.",
                    Rating = 5.0,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Trung tâm Thị trấn Sa Pa",
                    Category = "hotel",
                    Name = "Sapa House Hotel Halal Certified",
                    AffiliateUrl = "https://shorten.asia/f4A5neZa",
                    Notes = "Khách sạn ấm cúng ngay gần Nhà Thờ Đá Sa Pa, dịch vụ thân thiện.",
                    Rating = 4.7,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Trung tâm Thị trấn Sa Pa",
                    Category = "hotel",
                    Name = "Nomadtrails Boutique Hotel",
                    AffiliateUrl = "https://shorten.asia/gBMqS1D4",
                    Notes = "Phong cách Boutique độc đáo, vị trí trung tâm thuận tiện dạo phố đêm.",
                    Rating = 4.7,
                    IsActive = true
                },

                // ==========================================
                // 2B. LÀO CAI / SA PA - ĐÈO Ô QUY HỒ & FANSIPAN
                // ==========================================
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Đèo Ô Quy Hồ & Fansipan",
                    Category = "hotel",
                    Name = "Heaven Gate Hotel O Quy Ho",
                    AffiliateUrl = "https://shorten.asia/kC4X5VmV",
                    Notes = "Khách sạn ngay Cổng Trời Ô Quy Hồ, điểm săn mây và hoàng hôn ngoạn mục nhất Sa Pa.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Đèo Ô Quy Hồ & Fansipan",
                    Category = "hotel",
                    Name = "Fansipan View Hotel",
                    AffiliateUrl = "https://shorten.asia/YHdteHQb",
                    Notes = "Tầm nhìn bao quát đỉnh Fansipan hùng vĩ, gần ga cáp treo Sun World.",
                    Rating = 4.7,
                    IsActive = true
                },

                // ==========================================
                // 2C. LÀO CAI - BẮC HÀ
                // ==========================================
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Bắc Hà",
                    Category = "hotel",
                    Name = "Bình Bản Liền Homestay",
                    AffiliateUrl = "https://shorten.asia/mN1edBR2",
                    Notes = "Trải nghiệm nhà sàn truyền thống giữa những đồi chè shan tuyết cổ thụ Bản Liền.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Bắc Hà",
                    Category = "hotel",
                    Name = "Sa House Bắc Hà",
                    AffiliateUrl = "https://shorten.asia/v91VFBmc",
                    Notes = "Homestay xinh xắn tại cao nguyên trắng Bắc Hà, gần Dinh Hoàng A Tưởng.",
                    Rating = 4.7,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Sa Pa / Lào Cai",
                    Destination = "Bắc Hà",
                    Category = "hotel",
                    Name = "Ngan Nga Legend",
                    AffiliateUrl = "https://shorten.asia/NhPsy688",
                    Notes = "Khách sạn trung tâm thị trấn Bắc Hà, thuận tiện tham quan chợ phiên cuối tuần.",
                    Rating = 4.6,
                    IsActive = true
                },

                // ==========================================
                // 3. HẢI PHÒNG - ĐẢO CÁT BÀ
                // ==========================================
                new AffiliateDestinationService
                {
                    Region = "Hải Phòng",
                    Destination = "Đảo Cát Bà",
                    Category = "hotel",
                    Name = "Khách sạn Giấc Mơ Cát Bà",
                    AffiliateUrl = "https://shorten.asia/bVfmwTFr",
                    Notes = "Khách sạn view vịnh Lan Hạ, thuận tiện đón tàu tham quan vịnh và đảo khỉ.",
                    Rating = 4.7,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Hải Phòng",
                    Destination = "Đảo Cát Bà",
                    Category = "hotel",
                    Name = "CatBa BackPackers Hostel & Pool Bar",
                    AffiliateUrl = "https://shorten.asia/s8QFsSzn",
                    Notes = "Hostel phong cách trẻ trung năng động có hồ bơi ngoài trời và quầy bar.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Hải Phòng",
                    Destination = "Đảo Cát Bà",
                    Category = "hotel",
                    Name = "Cat Ba Wonder Hotel",
                    AffiliateUrl = "https://shorten.asia/pGCwVAfK",
                    Notes = "Khách sạn hiện đại ngay mặt đường chính thị trấn Cát Bà, gần bãi tắm Cát Cò.",
                    Rating = 4.7,
                    IsActive = true
                },

                // ==========================================
                // 4. NINH BÌNH - TAM CỐC & TRÀNG AN & TP NINH BÌNH
                // ==========================================
                new AffiliateDestinationService
                {
                    Region = "Ninh Bình",
                    Destination = "Tam Cốc - Bích Động",
                    Category = "hotel",
                    Name = "Ninh Binh Hidden Charm Hotel & Resort",
                    AffiliateUrl = "https://shorten.asia/JcA53PgX",
                    Notes = "Khách sạn nghỉ dưỡng 4 sao phong cách trang nhã bên bến thuyền Tam Cốc, hồ bơi ngoài trời.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Ninh Bình",
                    Destination = "Tam Cốc - Bích Động",
                    Category = "hotel",
                    Name = "Tam Coc Rice Fields Resort",
                    AffiliateUrl = "https://shorten.asia/S3JcJAZ6",
                    Notes = "Resort view cánh đồng lúa bát ngát và rặng núi đá vôi nguyên sơ tuyệt đẹp.",
                    Rating = 4.7,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Ninh Bình",
                    Destination = "Quần thể Tràng An",
                    Category = "hotel",
                    Name = "Trang An Retreat",
                    AffiliateUrl = "https://shorten.asia/z6CQVMef",
                    Notes = "Khu bungalow mộc mạc ẩn mình giữa thung lũng Tràng An thanh bình, có hồ bơi nhìn ra núi.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Ninh Bình",
                    Destination = "Đầm Vân Long - Gia Viễn",
                    Category = "hotel",
                    Name = "Emeralda Resort Ninh Binh",
                    AffiliateUrl = "https://shorten.asia/429ha1PE",
                    Notes = "Resort 5 sao mang đậm kiến trúc cung đình và làng quê Bắc Bộ cổ kính cạnh khu bảo tồn Vân Long.",
                    Rating = 4.9,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Ninh Bình",
                    Destination = "TP. Ninh Bình & Điểm du lịch",
                    Category = "transport",
                    Name = "Xe Limousine Tràng An VIP (Hà Nội - Ninh Bình)",
                    AffiliateUrl = "https://shorten.asia/bVfmwTFr",
                    Notes = "Xe Limousine 9-11 chỗ ghế massage cao cấp, đón trả tận nơi tại Hà Nội và các điểm du lịch Tam Cốc, Tràng An.",
                    Rating = 4.9,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Ninh Bình",
                    Destination = "TP. Ninh Bình & Điểm du lịch",
                    Category = "transport",
                    Name = "Xe Limousine Ninh Bình Excursion Transport",
                    AffiliateUrl = "https://shorten.asia/pGCwVAfK",
                    Notes = "Tuyến xe du lịch chất lượng cao hàng ngày, đưa đón tận khách sạn khu phố cổ Hà Nội và Ninh Bình.",
                    Rating = 4.8,
                    IsActive = true
                },
                new AffiliateDestinationService
                {
                    Region = "Ninh Bình",
                    Destination = "TP. Ninh Bình & Điểm du lịch",
                    Category = "transport",
                    Name = "Nhà xe Duy Khang Limousine",
                    AffiliateUrl = "https://shorten.asia/s8QFsSzn",
                    Notes = "Tần suất 60 phút/chuyến, wifi máy lạnh miễn phí, chuyên tuyến Hà Nội - Ninh Bình trả tận điểm lưu trú.",
                    Rating = 4.7,
                    IsActive = true
                }
            };

            var toAdd = realServices.Where(s => !existingNames.Contains(s.Name)).ToList();
            if (toAdd.Any())
            {
                await context.AffiliateDestinationServices.AddRangeAsync(toAdd);
                await context.SaveChangesAsync();
            }
        }
    }
}
