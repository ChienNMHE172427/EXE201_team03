# Nâng cấp Luồng Affiliate & Đồng bộ Đặt phòng (Affiliate Booking Sync)

Yêu cầu mới của bạn bao gồm một thay đổi lớn trong cách hệ thống xử lý Affiliate. Dưới đây là kế hoạch chi tiết cho phần này.

## User Review Required

> [!WARNING]
> **Yêu cầu Đồng bộ Dữ liệu Tự động (Auto-sync Booking Results)**: Việc lấy kết quả đặt phòng (lịch trình, trạng thái, chi phí) từ bên thứ 3 (như Agoda, Traveloka) ngay sau khi người dùng đặt xong đòi hỏi **phải có sự hỗ trợ API Callback / Webhook từ đối tác**. Nếu đối tác không hỗ trợ trả data về, chúng cùng sẽ phải dùng giải pháp người dùng tự xác nhận hoặc nhập mã đặt phòng (Booking Reference).

## Open Questions

> [!IMPORTANT]
> 1. **Kết nối API từ bên thứ 3**: Bạn đã có tài khoản Partner/Developer chính thức và tài liệu API (API Docs) của Agoda hay các bên thứ 3 khác hỗ trợ tính năng Webhook trả về kết quả chưa? Hay chúng ta sẽ mô phỏng (Mock) API này trước trong dự án?
> 2. **Dữ liệu Affiliate**: Bạn đề cập đến việc "sẽ gửi danh sách các link affiliate để đẩy vào dự án". Bạn định gửi danh sách này dưới dạng file CSV/JSON, hay nhập tay qua giao diện Admin?

## Proposed Changes

### Frontend (ReactJS)

- **UI Tìm kiếm Dịch vụ:** 
  - Tạo giao diện `ServiceSearchComponent`.
  - Hiển thị danh sách dịch vụ và đính kèm danh sách các biểu tượng của bên thứ 3 (Agoda, Booking, Traveloka, v.v.) bên dưới mỗi dịch vụ.
- **Xử lý Click Affiliate:** 
  - Khi click vào icon, kích hoạt hàm `handleAffiliateClick(serviceId, partnerId)`.
  - Gắn mã Tracking ID (định danh người dùng và chuyến đi) vào URL của bên thứ 3 trước khi Redirect, để khi có callback có thể map đúng vào chuyến đi.
- **Trang Cập nhật Lịch trình & Chi phí (Itinerary & Budget Page):**
  - Tạo UI lắng nghe trạng thái đặt phòng thành công (Polling hoặc WebSockets, hoặc reload lại trang).
  - Tự động hiển thị thẻ (Card) kết quả đặt phòng, thêm chi phí vào mục "Chi phí chuyến đi".

### Backend (ASP.NET Core Web API)

- **API Sinh Tracking Link (Affiliate Tracking):**
  - Viết API `GET /api/affiliate/link?serviceId={id}&partnerId={pid}` để sinh ra link redirect chứa `utm_source` hoặc `session_id` giúp theo dõi người dùng.
- **API Webhook nhận kết quả từ bên thứ 3 (Booking Callback):**
  - Viết API `POST /api/webhooks/affiliate-booking-result` để Agoda (hoặc đối tác) gọi về sau khi user thanh toán thành công.
  - Xử lý logic: Đọc Payload -> Lấy `session_id` -> Cập nhật trạng thái vào bảng `ItineraryItems` -> Thêm record vào bảng `Expenses` (Chi phí).

### Database (SQL Server)

#### [MODIFY] file `document/UC_Specification.md` (và DB Schema)
- Cập nhật thêm bảng hoặc cột lưu trữ `BookingReferenceCode` và `AffiliateStatus` trong bảng Chi phí / Lịch trình để quản lý trạng thái Đang chờ (Pending), Thành công (Confirmed) từ đối tác.

## Verification Plan

### Automated Tests
- Viết Unit Tests mô phỏng (Mocking) Webhook từ Agoda bắn về hệ thống để đảm bảo logic tự động cập nhật Lịch trình và Chi phí hoạt động đúng đắn mà không bị lỗi.

### Manual Verification
- Test luồng UI: Nhấn tìm kiếm -> Click Agoda -> Redirect sang Agoda.
- Test luồng Sync: Dùng Postman giả lập việc Agoda gọi API Webhook về hệ thống -> Kiểm tra xem giao diện có tự động cập nhật Chi phí chuyến đi không.
