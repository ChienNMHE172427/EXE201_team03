# BÁO CÁO TỔNG QUAN TÍNH NĂNG VÀ TÌNH TRẠNG MÃ NGUỒN DỰ ÁN TRAVEL WORKSPACE

> **Ngày thực hiện:** 07/10/2026  
> **Phạm vi khảo sát:** Toàn bộ mã nguồn dự án gồm Back-end (`TravelWorkspace.API`) và Front-end (`TravelWorkspace.Web`).  
> **Mục tiêu:** Rà soát cấu trúc mã nguồn, đối chiếu giữa tài liệu đặc tả và thực tế triển khai, phân loại tính năng theo các nhóm module cốt lõi và đánh giá chính xác trạng thái kỹ thuật (End-to-End, Thiếu logic/Giao diện chỉ có vỏ, hoặc Đang code dở).

---

## 📌 BẢNG TỔNG KẾT TRẠNG THÁI TÍNH NĂNG TOÀN HỆ THỐNG

| STT | Nhóm Module | Tính năng | Trạng thái thực tế | Bằng chứng mã nguồn / Logic kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Core & Auth** | Đăng ký & Xác thực Email | 🟢 **Hoàn thiện End-to-End** | `AuthController.cs`, `AuthService.cs`, `EmailService.cs` (MailKit), `ConfirmEmailPage.jsx` |
| | | Đăng nhập Email/Password & JWT | 🟢 **Hoàn thiện End-to-End** | `BCrypt.Net`, JWT Bearer Token, kiểm tra trạng thái kích hoạt `IsActive` & `IsEmailConfirmed` |
| | | Đăng nhập Google OAuth | 🟢 **Hoàn thiện End-to-End** | `Google.Apis.Auth` (`ValidateAsync`), `@react-oauth/google` |
| | | Quản lý Profile, Avatar & Mật khẩu | 🟢 **Hoàn thiện End-to-End** | `UserController.cs` (Upload vật lý `wwwroot/uploads/avatars`), `ProfilePage.jsx` |
| | | Phân quyền & Quản trị Admin | 🟢 **Hoàn thiện End-to-End** | `[Authorize(Roles = "Admin")]`, Soft-delete (`IsDeleted`), Khóa tài khoản gửi mail lý do |
| **2** | **Trip Management** | Tạo chuyến đi (Create Trip) | 🟢 **Hoàn thiện End-to-End** | `TripController.cs`, `TripService.cs`, `CreateTripPage.jsx` (Chống duplicate, phân bổ ngân sách) |
| | | Xem danh sách & Chi tiết chuyến đi | 🟢 **Hoàn thiện End-to-End** | `DashboardPage.jsx`, `TripService.GetTripsAsync` (Phân quyền Owner / Member) |
| | | Xóa chuyến đi (Delete Trip) | 🟢 **Hoàn thiện End-to-End** | `TripController.DeleteTrip` (Chỉ Owner), xóa Cascade các bảng liên quan |
| | | Chỉnh sửa chuyến đi (Update Trip) | 🟡 **Thiếu giao diện Web** | Backend `PUT /api/Trip/{id}` đã có, nhưng Frontend chưa dựng form/modal Edit Trip |
| | | Quản lý thành viên (Invite & Join) | 🟢 **Hoàn thiện End-to-End cơ bản** | `CompanionsPage.jsx`, `TripService.InviteMemberAsync` (Thêm theo Email người dùng tồn tại) |
| **3** | **AI & Itinerary** | Sinh lịch trình tự động bằng AI | 🟢 **Hoàn thiện End-to-End** | `GeminiService.GenerateItineraryJsonAsync`, `ItineraryController` (Cờ chống ghi đè HTTP 409) |
| | | Trợ lý AI hội thoại chỉnh sửa lịch trình | 🟢 **Hoàn thiện End-to-End** | `ChatAiItinerary` (Prompt kèm ngữ cảnh lịch trình & cập nhật DB trực tiếp), chat UI |
| | | Dự phòng thời tiết xấu (Plan B Indoor) | 🟢 **Hoàn thiện End-to-End** | `GeneratePlanBForDateAsync`, cờ `IsPlanB`, toggle UI chuyển đổi mượt mà |
| | | Quản lý hoạt động thủ công | 🟢 **Hoàn thiện End-to-End** | CRUD hoạt động theo từng ngày, Modal thêm/xem chi tiết, Timeline UI |
| | | Bản đồ tương tác (Leaflet) | 🔴 **Chưa triển khai** | **Không có thư viện Leaflet**; mã nguồn chỉ dùng nút mở link ngoài sang Google Maps |
| | | Check-in trạng thái hoạt động | 🟢 **Hoàn thiện End-to-End cơ bản** | Lưu trạng thái vào DB, tự động chuyển luồng sang trang Chi phí (`autoExpenses`) |
| **4** | **Finance & Splitwise** | Quản lý & Giám sát ngân sách | 🟢 **Hoàn thiện End-to-End** | Thống kê Quỹ chung, Ngân sách trần, Thanh tiến độ tiêu dùng, Thống kê ví riêng |
| | | Tách bạch Quỹ chung vs Ví riêng tư | 🟢 **Hoàn thiện End-to-End** | Cờ `IsPersonal`, bảo mật đa tầng (Người khác không xem/sửa/xóa được ví riêng) |
| | | Thêm/Sửa/Xóa khoản chi & Batch | 🟢 **Hoàn thiện End-to-End** | Form nhập hàng loạt (Group Drafts), bảo vệ chống IDOR khi sửa/xóa |
| | | Đính kèm & Xem ảnh hóa đơn | 🟢 **Hoàn thiện End-to-End** | Upload vào `wwwroot/uploads/expenses`, lưu `ImageUrl`, Modal Preview phóng to |
| | | Thuật toán tính số dư (Debt Settlement) | 🟡 **Mức độ Net Balance** | Tính bù trừ ròng bình quân từng người; **chưa có thuật toán Min-Cash-Flow rút gọn nợ** |
| | | Thanh toán qua mã QR (VietQR) | 🔴 **Chưa triển khai** | **Hoàn toàn chưa có trong mã nguồn** (Mới chỉ đề cập trên văn bản kế hoạch) |
| **5** | **Real-time Collaboration** | Đồng bộ thời gian thực qua SignalR | 🔴 **Chưa triển khai** | **Không có SignalR / TripHub** trong cả Backend lẫn Frontend |
| | | Cơ chế cộng tác nhóm hiện tại | 🟢 **Hoàn thiện qua REST Polling** | Polling mỗi 5s (`setInterval`), Smart auto-scroll, Thảo luận & Todo List nhóm |
| **6** | **Affiliate Monetization** | Quản lý Đối tác Affiliate (Admin) | 🟢 **Hoàn thiện End-to-End** | `AffiliatePartner.cs`, CRUD tại `AdminPartners.jsx` và `AdminController.cs` |
| | | Chèn Link Affiliate (Deep Link) | 🟢 **Hoàn thiện End-to-End** | Tích hợp link rút gọn Ecomobi/Accesstrade (`hotelLinks.json`) và Agoda/Booking dynamic URL |
| | | Theo dõi số lượt Click (Tracking Click) | 🟡 **Đang code dở / Thiếu luồng** | Cột `Clicks` có ở DB & Admin UI, nhưng **thiếu Event Listener / API Tracking tăng click** |
| **7** | **Mở rộng khác** | Danh sách hành lý (Packing List) & AI | 🟢 **Hoàn thiện End-to-End** | Phân loại đồ cá nhân/dùng chung, phân công người mang, AI gợi ý theo thời tiết/sở thích |
| | | Kho ảnh chung (Shared Gallery) | 🟢 **Hoàn thiện End-to-End** | Upload Cloudinary (`CloudinaryDotNet`), lưu DB, hiển thị ảnh dạng Pinterest |
| | | Review địa điểm cộng đồng & AI Tips | 🟢 **Hoàn thiện End-to-End** | Đánh giá sao, nhận xét, thả tim hữu ích, AI tóm tắt mẹo du lịch địa phương |

---

## 🔍 PHÂN TÍCH CHI TIẾT THEO TỪNG NHÓM MODULE

---

### MODULE 1: CORE & AUTH (XÁC THỰC, NGƯỜI DÙNG & PHÂN QUYỀN)

#### 1. Đăng ký tài khoản (Register) & Xác thực Email (Email Confirmation)
* **Logic Back-end:**
  * File xử lý: [AuthController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/AuthController.cs), [AuthService.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Services/AuthService.cs#L27-L76).
  * Mã hóa mật khẩu bằng `BCrypt.Net.BCrypt.HashPassword`.
  * Khởi tạo `ConfirmationToken = Guid.NewGuid().ToString()` và gán `IsEmailConfirmed = false`.
  * Gửi email xác thực kích hoạt qua dịch vụ [EmailService.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Services/EmailService.cs) sử dụng giao thức SMTP (`MailKit`). Đường dẫn kích hoạt có định dạng: `${clientUrl}/confirm-email?email={email}&token={token}`.
  * Endpoint `/api/auth/confirm-email` đối chiếu token và cập nhật `IsEmailConfirmed = true`.
* **Logic Front-end:**
  * File xử lý: `RegisterPage.jsx` và `ConfirmEmailPage.jsx`.
  * `ConfirmEmailPage` tự động lấy params từ query string, gọi API xác nhận và điều hướng về trang Đăng nhập khi thành công.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 2. Đăng nhập hệ thống (Login Email/Password & Google OAuth)
* **Logic Back-end:**
  * File xử lý: [AuthService.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Services/AuthService.cs#L78-L132).
  * Xác thực mật khẩu qua `BCrypt.Net.BCrypt.Verify`.
  * Kiểm tra tài khoản:
    * Nếu `!user.IsActive` ➔ Chặn đăng nhập với thông báo tài khoản bị khóa (HTTP 403).
    * Nếu `!user.IsEmailConfirmed` ➔ Chặn đăng nhập với yêu cầu xác nhận email trước (HTTP 403).
  * Phát hành JWT Bearer Token có thời hạn (cấu hình trong `appsettings.json`), chứa Claims: `NameIdentifier`, `Email`, `Name`, `Role`.
  * **Đăng nhập Google:** Sử dụng thư viện `Google.Apis.Auth` (`GoogleJsonWebSignature.ValidateAsync`) để xác thực Google IdToken từ client, tự động tạo mới người dùng nếu chưa có trong DB.
* **Logic Front-end:**
  * File xử lý: `LoginPage.jsx`. Lưu trữ JWT Token, Role và User info vào `localStorage`. Tích hợp nút đăng nhập Google chuẩn qua `@react-oauth/google`.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 3. Quản lý Hồ sơ người dùng (User Profile & Avatar Upload)
* **Logic Back-end:**
  * File xử lý: [UserController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/UserController.cs).
  * Endpoint `GET` / `PUT /api/user/profile` lấy và cập nhật thông tin cá nhân.
  * Endpoint `POST /api/user/upload-avatar`: Xác thực kích thước file (< 5MB), đuôi file hợp lệ (.jpg, .jpeg, .png), lưu file vào thư mục vật lý `wwwroot/uploads/avatars/` và lưu đường dẫn tương đối vào database.
  * Endpoint `POST /api/user/change-password`: Kiểm tra mật khẩu hiện tại bằng BCrypt và cập nhật mật khẩu mới (chặn nếu tài khoản Google không có mật khẩu).
* **Logic Front-end:**
  * File xử lý: `ProfilePage.jsx`. Hỗ trợ đổi tên, đổi mật khẩu và preview ảnh đại diện ngay khi tải lên.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 4. Phân quyền và Bảo mật (Role-based Authorization & Admin Management)
* **Logic Back-end:**
  * Database Seeding tại [Program.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Program.cs#L86-L97): Tự động tạo sẵn tài khoản Quản trị viên tối cao `admin@travelworkspace.com` với Role `Admin`.
  * Bảo vệ Controller bằng `[Authorize(Roles = "Admin")]` tại [AdminController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/AdminController.cs).
  * Các chức năng quản trị tài khoản người dùng:
    * `GET /api/admin/users`: Xem toàn bộ danh sách thành viên.
    * `PUT /api/admin/users/{id}/toggle-status`: Khóa hoặc mở khóa tài khoản, đồng thời gửi email thông báo lý do xử lý tới email người dùng.
    * `PUT /api/admin/users/{id}/promote`: Thăng cấp thành viên lên quyền `Admin`.
    * `DELETE /api/admin/users/{id}`: **Xóa mềm (Soft Delete)** thông qua cờ `IsDeleted = true` kết hợp Global Query Filter (`modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted)`) nhằm bảo toàn toàn vẹn dữ liệu khóa ngoại, đồng thời gửi email thông báo lý do bị xóa.
* **Logic Front-end:**
  * Route Guards: `PrivateRoute.jsx` kiểm tra đăng nhập; `AdminRoute.jsx` kiểm tra quyền `Admin`.
  * Màn hình quản trị: `AdminUsers.jsx`, `AdminSidebar.jsx`, `AdminDashboard.jsx`.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

---

### MODULE 2: TRIP MANAGEMENT (QUẢN LÝ CHUYẾN ĐI & THÀNH VIÊN)

#### 1. Tạo chuyến đi (Create Trip)
* **Logic Back-end:**
  * File xử lý: [TripController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/TripController.cs#L44-L53), [TripService.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Services/TripService.cs#L37-L69).
  * Kiểm tra logic chống trùng lặp dữ liệu: Nếu một user cố tình submit một chuyến đi có cùng tiêu đề, điểm đi, điểm đến và khoảng ngày giống hệt sẽ bị chặn (ném `InvalidOperationException`).
  * Lưu trữ các thông số: Tiêu đề, Điểm xuất phát (`Origin`), Điểm đến (`Destination`), Ngày bắt đầu/kết thúc, Ngân sách trần (`Budget`), Số lượng người tham gia (`NumberOfParticipants`), Sở thích (`Preferences`), và gán `OwnerId = currentUserId`.
* **Logic Front-end:**
  * File xử lý: `CreateTripPage.jsx`.
  * Tích hợp component `LocationAutocomplete.jsx` hỗ trợ tìm kiếm địa danh dựa trên dữ liệu địa lý mở (Nominatim OpenStreetMap).
  * Có thuật toán ước tính phân bổ ngân sách ban đầu (`calculateAllocation`): Tự động tính tỷ lệ chi phí Lưu trú (dựa trên số đêm và số phòng quy đổi từ số người), sau đó chia tỷ lệ còn lại cho Ăn uống, Di chuyển, Trải nghiệm dựa theo thẻ sở thích được chọn.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 2. Xem danh sách & Xóa chuyến đi
* **Logic Back-end:**
  * Endpoint `GET /api/Trip` lọc ra những chuyến đi mà người dùng là Chủ phòng (`OwnerId == userId`) HOẶC là thành viên tham gia (`Members.Any(m => m.UserId == userId)`).
  * Endpoint `DELETE /api/Trip/{id}` kiểm tra quyền sở hữu (`OwnerId == userId`). Trong [AppDbContext.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Data/AppDbContext.cs), các bảng phụ thuộc (`ItineraryItems`, `Messages`, `TodoItems`, `PackingItems`, `TripPhotos`) được cấu hình `OnDelete(DeleteBehavior.Cascade)`, đảm bảo dọn sạch toàn bộ dữ liệu liên quan.
* **Logic Front-end:**
  * File xử lý: `DashboardPage.jsx`. Hiển thị danh sách thẻ chuyến đi dạng Hero Banner, sắp xếp chuyến mới nhất lên trên, hiển thị ngân sách và số thành viên. Có nút "Xóa" kèm thông báo xác nhận và dọn sạch `localStorage.currentTripId`.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 3. Chỉnh sửa chuyến đi (Update Trip)
* **Logic Back-end:**
  * Endpoint `PUT /api/Trip/{id}` và hàm `TripService.UpdateTripAsync` đã được viết hoàn chỉnh để cập nhật các thông tin cơ bản của chuyến đi.
* **Logic Front-end:**
  * Trên giao diện hiện tại (`DashboardPage.jsx` hoặc thanh điều hướng), **chưa có form hoặc modal chỉnh sửa thông tin chuyến đi** (người dùng chỉ có nút "Mở chi tiết" và nút "Xóa").
* **Đánh giá trạng thái:** 🟡 **Backend hoàn thiện, Frontend thiếu giao diện chỉnh sửa**.

#### 4. Cấu hình và Mời thành viên (Invite & Members Management)
* **Logic Back-end:**
  * File xử lý: [TripService.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Services/TripService.cs#L104-L189).
  * Endpoint `GET /api/Trip/{id}/members` trả về danh sách thành viên gồm Host (Chủ phòng) và các Member tham gia, tự động tính toán chữ cái đầu viết tắt (`Initials`).
  * Endpoint `POST /api/Trip/{id}/invite`: Nhận email người được mời, kiểm tra người dùng đó đã tồn tại trong hệ thống chưa, chống mời trùng lặp và ghi nhận vào bảng `TripMembers`.
* **Logic Front-end:**
  * File xử lý: `CompanionsPage.jsx`. Hiển thị avatar đại diện thành viên, badge vai trò (Host / Thành viên). Nút "+ Mời thành viên" gọi hộp thoại nhập email và bắn API thêm trực tiếp vào nhóm.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End cơ bản** *(Chưa có luồng gửi thư mời qua email để người nhận bấm Xác nhận/Từ chối tham gia)*.

---

### MODULE 3: AI & ITINERARY (LỊCH TRÌNH, TRỢ LÝ AI, BẢN ĐỒ & CHECK-IN)

#### 1. Sinh lịch trình tự động bằng AI (AI Itinerary Generation)
* **Logic Back-end:**
  * File xử lý: [ItineraryController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/ItineraryController.cs#L171-L249), [GeminiService.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Services/GeminiService.cs).
  * Gọi mô hình Google Gemini AI với prompt cấu trúc nghiêm ngặt để trả về danh sách mảng JSON các mục lịch trình (`CreateItineraryItemDto`).
  * **Cơ chế bảo vệ dữ liệu:** Nếu chuyến đi đã có lịch trình và người dùng gửi yêu cầu sinh lại với cờ `overwrite: false`, API sẽ trả về `HTTP 409 Conflict` kèm thông báo cảnh báo. Chỉ khi client gửi `overwrite: true` thì hệ thống mới xóa các item cũ và ghi đè dữ liệu mới vào bảng `ItineraryItems`.
  * Hỗ trợ đọc API Key riêng của người dùng thông qua Header `X-Gemini-API-Key`.
* **Logic Front-end:**
  * File xử lý: `ItineraryPage.jsx`. Có nút "Tạo mới toàn bộ lịch trình", tự động hiển thị Modal cảnh báo xác nhận xóa dữ liệu cũ khi nhận mã lỗi 409 từ API.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 2. Trợ lý AI hội thoại & Chỉnh sửa lịch trình theo ngữ cảnh (Chat AI)
* **Logic Back-end:**
  * Endpoint `POST /api/itinerary/ChatAi/{tripId}`.
  * Hàm `GeminiService.ChatAndModifyItineraryAsync`: Nạp toàn bộ lịch trình hiện tại của chuyến đi và lịch sử hội thoại (`History`) vào ngữ cảnh của Gemini. AI sẽ phân tích yêu cầu của người dùng (ví dụ: *"Đổi lịch ăn tối ngày thứ 2 sang quán đồ nướng"*), trả về câu trả lời tự nhiên (`Reply`) kèm mảng JSON lịch trình đã cập nhật lại để hệ thống đồng bộ ngay vào Database.
* **Logic Front-end:**
  * `ItineraryPage.jsx` thiết kế giao diện chia đôi (Split Layout): Cột trái là Khung Chat AI, cột phải là Timeline lịch trình. Lịch sử chat được lưu trữ vào `localStorage` theo từng `tripId`.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 3. Phương án dự phòng thời tiết xấu (Plan B Indoor Contingency)
* **Logic Back-end:**
  * Endpoint `POST /api/trips/{tripId}/itinerary/generate-plan-b` tại [ItineraryController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/ItineraryController.cs#L324-L425).
  * Hàm `GeminiService.GeneratePlanBForDateAsync`: Lọc các hoạt động ngoài trời trong ngày bị thời tiết xấu và gọi Gemini đề xuất các hoạt động trong nhà (Bảo tàng, Thủy cung, Triển lãm, Ẩm thực trong nhà) tương ứng.
  * Các hoạt động mới được lưu vào DB với cờ `IsPlanB = true` và `ReplacesItemId` trỏ tới ID của hoạt động gốc.
* **Logic Front-end:**
  * Mỗi ngày trong Timeline có nút chuyển đổi trạng thái: `🌧️ Kích hoạt Plan B (Thời tiết xấu)`. Khi bật, giao diện tự động tráo đổi các hoạt động gốc bằng các hoạt động Plan B (kèm huy hiệu ☔ Plan B trong nhà).
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 4. Bản đồ tương tác (Leaflet)
* **Thực tế mã nguồn:**
  * File `package.json` của Front-end **hoàn toàn không cài đặt** thư viện `leaflet` hay `react-leaflet`.
  * Tìm kiếm từ khóa `leaflet` trên toàn bộ dự án không có kết quả.
  * Tại dòng 649–653 của `ItineraryPage.jsx`, nút "Bản đồ" (`service-btn map-btn`) thực chất chỉ là một lệnh mở tab trình duyệt mới trỏ về Google Maps:
    ```javascript
    window.open(`https://www.google.com/maps/search/?api=1&query=${getMapQuery(item)}`, '_blank')
    ```
* **Đánh giá trạng thái:** 🔴 **Chưa triển khai (Chưa có bản đồ Leaflet nhúng tương tác, hiện tại chỉ có liên kết mở ngoài sang Google Maps)**.

#### 5. Check-in hoạt động (Activity Status Tracking)
* **Logic Back-end:**
  * Cột `Status` trong bảng `ItineraryItems` lưu trạng thái của chặng (ví dụ: *"Chưa bắt đầu"*, *"Đã chuẩn bị"*, *"Đã hoàn thành"*). API `PUT /api/Itinerary/{id}` cập nhật trạng thái.
* **Logic Front-end:**
  * Nút "Lưu" / "Đã lưu" trên từng thẻ hoạt động trong `ItineraryPage.jsx` (`updateItemStatus`). Khi bấm lưu, trạng thái chuyển thành *"Đã chuẩn bị"*, đồng thời hệ thống tự động trích xuất các dịch vụ liên quan và điều hướng sang trang Chi phí (`/budget?tripId=...&autoExpenses=...`) để gợi ý nhập tiền vào quỹ.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End cơ bản** *(Theo dõi trạng thái tiến độ, chưa có GPS Check-in thời gian thực)*.

---

### MODULE 4: FINANCE & SPLITWISE (TÀI CHÍNH, CHIA TIỀN & CÔNG NỢ)

#### 1. Quản lý Ngân sách & Phân tách Quỹ chung vs Ví riêng tư
* **Logic Back-end:**
  * File xử lý: [ExpenseService.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Services/ExpenseService.cs#L17-L130).
  * Bảng `Expenses` có cột cờ boolean `IsPersonal`.
  * **Cơ chế bảo mật riêng tư:** Khi gọi API lấy danh sách chi tiêu:
    * Nếu là chi phí chung (`!IsPersonal`): Tất cả thành viên trong nhóm đều thấy.
    * Nếu là chi phí cá nhân (`IsPersonal`): **Chỉ duy nhất thành viên đã chi tiền (`PaidById == currentUserId`) mới nhìn thấy**. Các thành viên khác hoàn toàn bị ẩn.
    * Khi sửa/xóa khoản chi cá nhân: Chống lỗ hổng IDOR bằng cách xác thực `expense.PaidById == userId`.
* **Logic Front-end:**
  * File xử lý: `ExpensePage.jsx`.
  * Thiết kế 3 thẻ thống kê phân biệt:
    1. Tổng Quỹ Chung Nhóm (kèm thanh tiến độ % tiêu thụ so với ngân sách trần của chuyến đi).
    2. Tổng Bạn Đã Tiêu Riêng (Ví riêng tư được bảo vệ).
    3. Tổng tiền thực tế bạn đã chi ra (Tiền đóng cho nhóm + Tiền chi tiêu riêng).
  * 2 Tab giao diện độc lập: Tab "Quỹ chung" và Tab "Ví riêng của tôi".
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 2. Thêm/Sửa/Xóa khoản chi & Nhập nhanh hàng loạt
* **Logic Back-end:**
  * Endpoint `POST`, `PUT`, `DELETE /api/trips/{tripId}/expenses/{id}` tại [ExpenseController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/ExpenseController.cs). Chặn số tiền âm (`Amount < 0`).
* **Logic Front-end:**
  * `ExpensePage.jsx` hỗ trợ form nhập hàng loạt nhiều dịch vụ cùng lúc (`groupDrafts`), tự động tính tổng tiền trước khi submit. Có modal chỉnh sửa khoản chi và nút xóa.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 3. Đính kèm và Xem trước hóa đơn (Receipt Attachment)
* **Logic Back-end:**
  * Endpoint `POST /api/trips/{tripId}/expenses/upload-receipt`: Tiếp nhận file ảnh, kiểm tra kích thước (< 5MB), định dạng (.jpg, .jpeg, .png, .webp), lưu trữ tại thư mục `wwwroot/uploads/expenses` và trả về URL ảnh.
* **Logic Front-end:**
  * Trong Tab "Ví riêng", người dùng có thể tải ảnh hóa đơn/món đồ mua sắm, hiển thị thumbnail, có nút gỡ ảnh và khi bấm vào ảnh sẽ bật Modal phóng to chi tiết.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 4. Thuật toán bù trừ công nợ (Debt Settlement)
* **Logic Back-end:**
  * File xử lý: [ExpenseService.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Services/ExpenseService.cs#L88-L128).
  * **Thuật toán hiện tại:**
    1. Lọc tất cả các khoản chi quỹ chung (`!IsPersonal`). Tính `groupTotalSpent`.
    2. Xác định số người chia: `participantCount`.
    3. Tính phần chi phí bình quân mỗi người phải chịu: `sharePerMember = groupTotalSpent / participantCount`.
    4. Đối với từng người trong nhóm: `NetBalance = memberPaidForGroup - sharePerMember`.
* **Logic Front-end:**
  * Cột sidebar "Tổng kết thanh toán Quỹ chung" trên `ExpensePage.jsx`:
    * Nếu `NetBalance >= 0` ➔ Hiển thị màu xanh lá: `+ Nhận lại X đ`.
    * Nếu `NetBalance < 0` ➔ Hiển thị màu đỏ: `- Cần đóng X đ`.
* **Đánh giá thuật toán:**
  * Hệ thống hiện tại đã giải quyết bài toán **Tính toán số dư ròng bình quân (Net Balance)**.
  * **Chưa có thuật toán rút gọn công nợ tối ưu (Min-Cash-Flow graph algorithm / Splitwise Debt Simplification)**: Nghĩa là hệ thống chưa chỉ ra chuỗi giao dịch tối ưu (ví dụ: *"Người A chỉ cần chuyển trực tiếp cho Người C 150.000đ"* để triệt tiêu toàn bộ nợ của cả nhóm với số lượng giao dịch ít nhất).
* **Đánh giá trạng thái:** 🟡 **Hoàn thiện mức tính số dư bù trừ (Net Balance), Chưa có thuật toán rút gọn luồng chuyển nợ tối ưu**.

#### 5. Thanh toán qua mã QR (QR Payment)
* **Thực tế mã nguồn:**
  * Hoàn toàn **không có mã nguồn thanh toán QR hay VietQR** trong cả backend và frontend.
  * Chỉ xuất hiện như một ý tưởng đề xuất trong file báo cáo lý thuyết tuần (`bao_cao_tien_do_kinh_te_7_tuan.md`).
* **Đánh giá trạng thái:** 🔴 **Chưa triển khai (Chưa có trong code)**.

---

### MODULE 5: REAL-TIME COLLABORATION (CỘNG TÁC THỜI GIAN THỰC & SIGNALR)

#### 1. Kiểm tra tích hợp SignalR & TripHub
* **Thực tế mã nguồn:**
  * Backend `TravelWorkspace.API`:
    * File `.csproj` không cài package `Microsoft.AspNetCore.SignalR`.
    * Không tồn tại thư mục `Hubs` hay file `TripHub.cs`.
    * File `Program.cs` không khai báo `AddSignalR()` hay `MapHub()`.
  * Frontend `TravelWorkspace.Web`: File `package.json` không cài đặt package `@microsoft/signalr`.
* **Đánh giá trạng thái:** 🔴 **Chưa triển khai qua SignalR**.

#### 2. Cơ chế Cộng tác nhóm thực tế trong dự án (REST Polling)
* **Logic Back-end:**
  * File xử lý: [CollaborateController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/CollaborateController.cs).
  * **Tin nhắn trao đổi:** `GET /api/collaborate/messages/{tripId}` và `POST /api/collaborate/messages/{tripId}` lưu vào bảng `Messages`.
  * **Công việc nhóm (Todo Items):** `GET`, `POST /api/collaborate/todos/{tripId}`, `PUT /api/collaborate/todos/{id}/toggle`, `DELETE /api/collaborate/todos/{id}` lưu vào bảng `TodoItems`.
* **Logic Front-end:**
  * File xử lý: [CollaboratePage.jsx](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.Web/src/pages/CollaboratePage.jsx#L44-L57).
  * Sử dụng cơ chế **REST Polling theo chu kỳ 5 giây**:
    ```javascript
    useEffect(() => {
      if (selectedTripId) {
        fetchData(selectedTripId);
        const interval = setInterval(() => {
          fetchMessages(selectedTripId, false);
          fetchTodos(selectedTripId, false);
        }, 5000);
        return () => clearInterval(interval);
      }
    }, [selectedTripId]);
    ```
  * Tích hợp cơ chế **Smart Auto-scroll**: Chỉ tự động cuộn xuống đáy khi có tin nhắn mới VÀ người dùng đang đứng ở sát đáy (khoảng cách <= 120px); nếu người dùng đang cuộn lên đọc tin nhắn cũ thì không bị giật màn hình.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End theo cơ chế REST Short-Polling (chu kỳ 5s)**.

---

### MODULE 6: AFFILIATE MONETIZATION (TIẾP THỊ LIÊN KẾT & TRACKING CLICK)

#### 1. Quản lý Đối tác Tiếp thị liên kết (Admin Partner Management)
* **Logic Back-end:**
  * Model [AffiliatePartner.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Models/AffiliatePartner.cs): Lưu trữ `Name`, `Category`, `PartnerUrl`, `SearchUrlTemplate`, `CommissionRate`, `Clicks`, `IsActive`.
  * Endpoint CRUD tại [AdminController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/AdminController.cs#L131-L170): `GET`, `POST`, `PUT`, `DELETE /api/admin/partners`.
* **Logic Front-end:**
  * File xử lý: `AdminPartners.jsx`. Giao diện bảng quản trị hiển thị Tên đối tác, Danh mục, Số Click, Trạng thái hoạt động, hỗ trợ thêm và xóa đối tác.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End (Phần quản trị đối tác)**.

#### 2. Luồng chèn Link Affiliate trên giao diện người dùng
* **Logic triển khai:**
  * File xử lý: `ExplorePage.jsx` và file dữ liệu [hotelLinks.json](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.Web/src/hotelLinks.json).
  * Tại danh sách đề xuất dịch vụ Lưu trú/Khách sạn:
    * **Traveloka:** Liên kết được ánh xạ trực tiếp từ file `hotelLinks.json` chứa các đường link tiếp thị liên kết rút gọn của nền tảng affiliate (ví dụ: `https://shorten.asia/qruA6GRK`, `https://shorten.asia/JcA53PgX`).
    * **Agoda & Booking:** Liên kết được tạo động dựa theo Tên khách sạn và ngày Check-in/Check-out của chuyến đi:
      ```javascript
      https://www.agoda.com/search?textToSearch=${encodeURIComponent(svc.title)}&checkIn=${ci}&checkOut=${co}
      https://www.booking.com/searchresults.html?ss=${encodeURIComponent(svc.title)}&checkin=${ci}&checkout=${co}
      ```
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End (Luồng hiển thị & Deep-link)**.

#### 3. Luồng Tracking Click (Theo dõi số lượt Click)
* **Phân tích kỹ thuật:**
  * Database có cột `Clicks` trong bảng `AffiliatePartners`.
  * Màn hình Admin `AdminPartners.jsx` có cột hiển thị `<td>{p.clicks}</td>`.
  * **LỖ HỔNG THỰC TẾ:**
    * Trên `ExplorePage.jsx`, các link tiếp thị liên kết là các thẻ `<a>` thuần túy mở sang tab mới (`target="_blank"`), **hoàn toàn không gắn sự kiện `onClick` để gọi API đếm click**.
    * Backend **không có bất kỳ API nào** (như `POST /api/partners/{id}/click` hoặc redirect endpoint trung gian `/api/r/{id}`) để thực hiện `Clicks++`.
    * Vì vậy, số lượt click trong database luôn giữ nguyên giá trị 0.
* **Đánh giá trạng thái:** 🟡 **Đang code dở / Thiếu luồng Event Tracking & Redirect Logging**.

---

### CÁC TÍNH NĂNG MỞ RỘNG ĐÃ CÓ TRONG CODEBASE (BỔ SUNG)

#### 1. Quản lý Hành lý thông minh & AI Packing List
* **Logic Back-end:**
  * File xử lý: [PackingController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/PackingController.cs). CRUD đồ dùng hành lý, phân loại đồ cá nhân/đồ dùng chung, gán người chịu trách nhiệm mang đồ (`AssigneeId`), đánh dấu đã chuẩn bị (`IsChecked`).
  * Tích hợp `GeminiService.GeneratePackingListAsync`: Tự động gọi AI phân tích điểm đến, số ngày đi và sở thích để gợi ý danh sách vật dụng cần thiết theo 4 nhóm: Quần áo, Đồ vệ sinh cá nhân, Giấy tờ & Tiền, Thiết bị & Khác.
* **Logic Front-end:**
  * Component `PackingList.jsx` tích hợp trong giao diện.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 2. Kho ảnh kỷ niệm chung (Shared Photo Gallery)
* **Logic Back-end:**
  * File xử lý: [PhotoController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/PhotoController.cs) và [CloudinaryService.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Services/CloudinaryService.cs).
  * Tải ảnh lên máy chủ đám mây Cloudinary, lưu `PublicId`, `SecureUrl`, `Caption`, `UploadedById` vào bảng `TripPhotos`. Hỗ trợ xóa đồng bộ trên Cloudinary khi xóa trên web.
* **Logic Front-end:**
  * File xử lý: `SharedGalleryPage.jsx`. Giao diện dạng Pinterest, modal tải lên nhiều ảnh cùng lúc, xem ảnh phóng to.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

#### 3. Đánh giá địa điểm & Tóm tắt Mẹo du lịch bằng AI (Community Reviews & AI Tips)
* **Logic Back-end:**
  * File xử lý: [ReviewController.cs](file:///c:/Users/admin/EXE201_team03/code/TravelWorkspace.API/Controllers/ReviewController.cs).
  * Viết đánh giá (1–5 sao kèm kinh nghiệm/mẹo du lịch), tính điểm trung bình, phân trang, bình chọn đánh giá hữu ích (`HelpfulCount`).
  * Tích hợp `GeminiService.SummarizePlaceTipsAsync`: Đọc toàn bộ các bài đánh giá của cộng đồng về một địa điểm và dùng AI tổng hợp thành 3 mục: Điểm nổi bật nhất, Lưu ý quan trọng nhất, và Thời điểm lý tưởng nhất.
* **Logic Front-end:**
  * Component `ReviewSection.jsx` nhúng trực tiếp trong `ExplorePage.jsx`.
* **Đánh giá trạng thái:** 🟢 **Đã hoàn thiện End-to-End**.

---

## 📋 ĐỀ XUẤT HƯỚNG HOÀN THIỆN TIẾP THEO

1. **SignalR WebSocket:**
   * Cài đặt package `Microsoft.AspNetCore.SignalR` trên API và `@microsoft/signalr` trên Web.
   * Chuyển đổi cơ chế Polling 5s tại `CollaboratePage.jsx` sang WebSocket Hub (`TripHub`) để tin nhắn và todo-list được cập nhật tức thì (Real-time sub-second latency).
2. **Bản đồ tương tác Leaflet:**
   * Cài đặt `leaflet` và `react-leaflet`.
   * Tọa độ hóa các địa điểm trong lịch trình (sử dụng Latitude/Longitude từ Nominatim) để vẽ lộ trình di chuyển (polyline) trực quan trên bản đồ nhúng thay vì chỉ mở tab Google Maps ngoài.
3. **Thuật toán rút gọn công nợ (Min-Cash-Flow):**
   * Nâng cấp từ thuật toán tính số dư ròng bình quân (Net Balance) lên thuật toán đồ thị luồng tiền tệ tối thiểu (Greedy / Min Cash Flow), xuất ra danh sách giao dịch chuyển tiền trực tiếp giữa từng cặp thành viên (Ví dụ: Thành viên A ➔ chuyển cho Thành viên B: 150.000 VNĐ).
4. **Tracking Click Affiliate:**
   * Bổ sung endpoint ghi nhận click (ví dụ: `POST /api/partners/{id}/click` hoặc gateway redirect `GET /api/partners/redirect/{partnerId}?url=...`) và gắn sự kiện vào các nút đặt dịch vụ trên `ExplorePage.jsx` để cột `Clicks` trong cơ sở dữ liệu hoạt động chính xác.
5. **Thanh toán QR:**
   * Tích hợp thư viện sinh mã VietQR dựa trên số tài khoản và số tiền cần thanh toán của từng thành viên khi chia tiền.
