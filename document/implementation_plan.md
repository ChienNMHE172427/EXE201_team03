# Kế hoạch Phát triển Dự án: Travel Workspace

Dự án Travel Workspace sẽ được phát triển theo hướng tiếp cận từng bước (Phased Approach), lấy các Use Case trong `UC_Specification.md` làm nền tảng. Quy trình phát triển sẽ đi từ việc thiết lập nền tảng cơ sở dữ liệu, xác thực người dùng, cho đến các tính năng nghiệp vụ cốt lõi và cuối cùng là tích hợp AI cùng các bên thứ 3.

> [!IMPORTANT]
> **Quy tắc làm việc:** Mỗi chức năng (Use Case) sẽ được thực hiện theo quy trình chuẩn: Thiết kế Database -> Dựng API -> Viết logic -> Kiểm thử (Unit/Integration). Các "task" cụ thể sẽ được sinh ra từ plan này cho mỗi chu kỳ làm việc.

## Công nghệ sử dụng (Tech Stack)
Đã được xác nhận bởi người dùng:
1. **Kiến trúc Frontend:** ReactJS
2. **Hệ quản trị CSDL (Database):** SQL Server
3. **Mô hình kiến trúc Backend:** MVC (ASP.NET Core Web API đóng vai trò Backend theo kiến trúc Model-View-Controller)
4. **AI API:** Google Gemini API

## Lộ trình Triển khai (Proposed Changes / Roadmap)

### Giai đoạn 1: Nền tảng & Xác thực (Foundation & Authentication)
Tập trung vào việc thiết lập project, kiến trúc hệ thống và hệ thống tài khoản.
- **Khởi tạo Project:** Setup Solution .NET Core Web API, cấu hình Entity Framework Core, Dependency Injection.
- **Thực hiện UC_T01 (Authentication) & UC_A01 (Admin Login):**
  - Xây dựng model User, Role.
  - Implement đăng nhập bằng Email/Password (JWT Token).
  - Tích hợp đăng nhập Google (Google OAuth).
  - Phân quyền User / Admin.

### Giai đoạn 2: Quản lý Chuyến đi & Cộng tác (Core Trip Management & Collaboration)
Xây dựng tính năng quản trị không gian làm việc chính của ứng dụng.
- **Thực hiện UC_T02 (Manage Trip Workspace):**
  - Xây dựng CRUD cho Trips, Destinations.
- **Thực hiện UC_T05 (Collaborative Planning & Invite Friends):**
  - Thiết kế bảng TripMembers (chứa quyền View/Edit).
  - API gửi lời mời tham gia qua Email.
  - Xử lý logic gia nhập không gian làm việc.

### Giai đoạn 3: Tài chính & Tích hợp Đối tác (Financial & Booking)
Quản lý tiền bạc và tạo nguồn thu (Affiliate) cho hệ thống.
- **Thực hiện UC_T06 (Budget & Expense Tracking):**
  - Xây dựng module quản lý ngân sách (Budgets).
  - Tracking chi tiêu (Expenses) và thuật toán chia tiền (Split Bills).
- **Thực hiện UC_T04 (Affiliate Booking) & UC_A03 (Manage Affiliate Partners):**
  - Quản lý danh sách đối tác Affiliate (Admin).
  - Hiển thị link Affiliate và tracking lượt click chuyển hướng (Click-through).

### Giai đoạn 4: Trí tuệ Nhân tạo & Khám phá (AI Itinerary & Discovery)
Các tính năng mang lại giá trị cốt lõi và khác biệt cho Travel Workspace.
- **Thực hiện UC_T03 (AI-Powered Itinerary Generation):**
  - Tích hợp OpenAI/LLM API.
  - Thiết kế logic gửi prompt cấu hình chuyến đi và parsing kết quả JSON thành lịch trình hàng ngày (Itinerary & ItineraryItems).
- **Thực hiện UC_T08 (Food and Attraction Discovery):**
  - Gợi ý điểm đến và lưu trữ địa điểm yêu thích (Saved Places).

### Giai đoạn 5: Quản trị & Hoàn thiện (Admin Features & Storage)
Kiểm soát toàn bộ hệ thống và bổ sung tiện ích.
- **Thực hiện UC_T07 (Document Storage):**
  - Tích hợp Cloud Storage (như AWS S3, Azure Blob hoặc lưu trữ Local) để upload hóa đơn, vé máy bay.
- **Thực hiện UC_A02, UC_A04, UC_A05 (Admin Dashboard):**
  - Quản lý khóa/mở khóa User.
  - Kiểm duyệt nội dung.
  - API lấy số liệu thống kê (Lượt tạo trip, lượt click, dự phóng doanh thu).

## Kế hoạch Kiểm thử (Verification Plan)
### Automated Tests
- Viết Unit Tests (xUnit/NUnit) cho các logic cốt lõi: Tính toán chia tiền (Split Bills), Sinh prompt AI, Validate cấu hình chuyến đi.
### Manual Verification
- Sử dụng Swagger/Postman để test toàn bộ các Endpoints API sau mỗi Giai đoạn.
- Test quy trình gửi Email lời mời và quy trình đăng nhập Google.
