# Đặc tả Use Case (Use Case Specification): Travel Workspace

> **Lưu ý từ AI:** Hiện tại hệ thống bảo mật không cho phép tôi truy cập vào ổ đĩa `F:\` của bạn nên tôi không thể đọc trực tiếp file mẫu. Tuy nhiên, tôi hiểu "phân tích rất kỹ" nghĩa là bạn muốn viết theo cấu trúc chuẩn của Kỹ nghệ Phần mềm (Software Engineering) bao gồm: Tiền điều kiện, Hậu điều kiện, Luồng chính, Luồng rẽ nhánh... Tôi đã viết lại theo đúng chuẩn mực đó dưới đây. Nếu cấu trúc của PRN222 có điểm khác biệt, bạn vui lòng copy 1 Use Case mẫu paste vào đây nhé!

---

## 1. Danh sách các Tác nhân (Actors)
1. **Khách du lịch (Traveler):** Người sử dụng nền tảng để lên kế hoạch, quản lý lịch trình, tham khảo giá, mời bạn bè và theo dõi chi phí chuyến đi.
2. **Quản trị viên (Admin):** Người quản lý hệ thống, quản trị người dùng, quản lý các đối tác Affiliate và theo dõi số liệu doanh thu.

---

## 2. Đặc tả chi tiết Use Case của Khách du lịch (Traveler)

### UC_T01: Xác thực Người dùng (Authentication)
**1. Mô tả ngắn (Brief Description):** Cho phép người dùng đăng ký, đăng nhập (qua Email hoặc Google/Gmail) và quản lý tài khoản cá nhân.
**2. Tác nhân (Actors):** Khách du lịch.
**3. Điều kiện tiên quyết (Preconditions):** Người dùng có kết nối mạng và thiết bị truy cập ứng dụng.
**4. Luồng sự kiện chính (Basic Flow):**
- **Bước 1:** Người dùng truy cập trang Đăng nhập / Đăng ký.
- **Bước 2:** Người dùng chọn phương thức "Đăng nhập bằng Google".
- **Bước 3:** Hệ thống gửi yêu cầu xác thực tới Google API.
- **Bước 4:** Google trả về thông tin xác thực hợp lệ.
- **Bước 5:** Hệ thống tạo session/token và chuyển hướng người dùng đến trang chủ (Dashboard).
**5. Luồng rẽ nhánh (Alternative Flows):**
- **Đăng nhập bằng Email/Mật khẩu:** Người dùng nhập Email và mật khẩu -> Hệ thống kiểm tra trong Database -> Đăng nhập thành công.
- **Quên mật khẩu:** Người dùng yêu cầu lấy lại mật khẩu -> Hệ thống gửi OTP/Link xác nhận qua Email -> Người dùng đặt mật khẩu mới.
**6. Ngoại lệ (Exceptions):**
- Tài khoản bị khóa (Banned): Hệ thống từ chối đăng nhập và hiển thị lý do khóa.
- Sai tài khoản/mật khẩu: Hiển thị thông báo lỗi, yêu cầu nhập lại.
**7. Điều kiện kết thúc (Postconditions):** Hệ thống lưu phiên đăng nhập của người dùng.

### UC_T02: Quản lý Không gian Chuyến đi (Manage Trip Workspace)
**1. Mô tả ngắn (Brief Description):** Khách du lịch tạo mới một "không gian" cho một chuyến đi, hoặc xem, sửa, xóa các chuyến đi hiện có.
**2. Tác nhân (Actors):** Khách du lịch.
**3. Điều kiện tiên quyết (Preconditions):** Khách du lịch đã đăng nhập thành công.
**4. Luồng sự kiện chính (Basic Flow):**
- **Bước 1:** Tại trang chủ, người dùng nhấn "Tạo chuyến đi mới".
- **Bước 2:** Người dùng nhập các thông tin cơ bản: Điểm đến, Ngày đi - Ngày về, Số người, Ngân sách dự kiến, Sở thích.
- **Bước 3:** Nhấn "Lưu".
- **Bước 4:** Hệ thống khởi tạo một Trip Workspace mới và lưu vào cơ sở dữ liệu.
**5. Luồng rẽ nhánh (Alternative Flows):**
- **Sửa chuyến đi:** Người dùng chọn chuyến đi -> Chỉnh sửa ngày tháng hoặc điểm đến -> Lưu.
- **Xóa chuyến đi:** Người dùng chọn Xóa -> Xác nhận -> Hệ thống xóa chuyến đi (hoặc chuyển vào thùng rác).
**6. Ngoại lệ (Exceptions):**
- Ngày về trước ngày đi: Hệ thống báo lỗi validation.
**7. Điều kiện kết thúc (Postconditions):** Một Trip Workspace được tạo ra và sẵn sàng cho các thao tác tiếp theo (mời bạn bè, thêm lịch trình).

### UC_T03: Tạo Lịch trình bằng AI (AI-Powered Itinerary Generation)
**1. Mô tả ngắn (Brief Description):** Tự động sinh ra lịch trình du lịch chi tiết hàng ngày dựa trên dữ liệu đầu vào.
**2. Tác nhân (Actors):** Khách du lịch.
**3. Điều kiện tiên quyết (Preconditions):** Đã tạo Không gian Chuyến đi thành công.
**4. Luồng sự kiện chính (Basic Flow):**
- **Bước 1:** Trong Trip Workspace, người dùng nhấn "Tự động tạo lịch trình bằng AI".
- **Bước 2:** Hệ thống thu thập thông tin cấu hình của chuyến đi (điểm đến, số ngày, sở thích).
- **Bước 3:** Gửi prompt tới AI Engine (API).
- **Bước 4:** AI trả về kết quả là một danh sách các hoạt động theo ngày, giờ.
- **Bước 5:** Hệ thống render kết quả lên Timeline cho người dùng.
**5. Luồng rẽ nhánh (Alternative Flows):**
- **Điều chỉnh thủ công:** Người dùng kéo thả (drag & drop) một hoạt động sang khung giờ khác hoặc ngày khác.
- **Tạo lại (Regenerate):** Người dùng không ưng ý, yêu cầu AI tạo lại với các thông số điều chỉnh.
**6. Ngoại lệ (Exceptions):**
- AI API timeout: Hệ thống báo lỗi và yêu cầu thử lại.
**7. Điều kiện kết thúc (Postconditions):** Lịch trình được chốt và lưu cố định vào Database.

### UC_T04: Tham khảo và Đặt chỗ qua bên thứ 3 (Affiliate Booking)
**1. Mô tả ngắn (Brief Description):** Người dùng tham khảo giá khách sạn/vé máy bay và nhấp link affiliate để đặt dịch vụ.
**2. Tác nhân (Actors):** Khách du lịch.
**3. Điều kiện tiên quyết (Preconditions):** Đã đăng nhập.
**4. Luồng sự kiện chính (Basic Flow):**
- **Bước 1:** Người dùng chọn mục "Tham khảo Khách sạn/Chuyến bay" trong chuyến đi.
- **Bước 2:** Hệ thống hiển thị danh sách các lựa chọn được kéo từ API của đối tác (kèm giá, thông tin).
- **Bước 3:** Người dùng nhấn "Xem và Đặt chỗ" vào một lựa chọn.
- **Bước 4:** Hệ thống mở ra tab mới, chuyển hướng sang trang web đối tác (gắn mã Affiliate của Travel Workspace).
**5. Luồng rẽ nhánh (Alternative Flows):** N/A
**6. Ngoại lệ (Exceptions):** Mất kết nối API đối tác (không hiện kết quả).
**7. Điều kiện kết thúc (Postconditions):** Người dùng được chuyển đến bên thứ 3. Hệ thống ghi nhận 1 lượt click (Click-through) để thống kê.

### UC_T05: Thêm bạn bè vào dự án (Invite Friends via Gmail)
**1. Mô tả ngắn (Brief Description):** Mời người khác vào chung không gian làm việc để lên kế hoạch.
**2. Tác nhân (Actors):** Khách du lịch.
**3. Điều kiện tiên quyết (Preconditions):** Là chủ sở hữu (Owner) của chuyến đi.
**4. Luồng sự kiện chính (Basic Flow):**
- **Bước 1:** Trong Trip Workspace, nhấn nút "Chia sẻ / Mời thành viên".
- **Bước 2:** Nhập địa chỉ Gmail của người muốn mời và phân quyền (View/Edit).
- **Bước 3:** Hệ thống gửi Email chứa đường link tham gia tới Gmail đó.
- **Bước 4:** Người được mời nhấn vào link và trở thành thành viên của dự án.
**5. Luồng rẽ nhánh (Alternative Flows):** Xóa thành viên đã mời.
**6. Ngoại lệ (Exceptions):** Email không hợp lệ.
**7. Điều kiện kết thúc (Postconditions):** Danh sách thành viên của chuyến đi được cập nhật. Cả 2 có thể xem/sửa lịch trình realtime.

---

## 3. Đặc tả chi tiết Use Case của Quản trị viên (Admin)

### UC_A01: Quản lý Người dùng (Manage Users)
**1. Mô tả ngắn:** Xem và quản lý tất cả tài khoản Khách du lịch.
**2. Tác nhân:** Admin.
**3. Điều kiện tiên quyết:** Đăng nhập với tài khoản Admin.
**4. Luồng sự kiện chính:**
- **Bước 1:** Truy cập trang "Quản lý Người dùng" trên Dashboard.
- **Bước 2:** Hệ thống hiển thị danh sách người dùng.
- **Bước 3:** Admin có thể tìm kiếm, xem chi tiết lịch sử thao tác.
- **Bước 4:** Admin chọn "Khóa tài khoản" nếu người dùng vi phạm.
**7. Điều kiện kết thúc:** Trạng thái tài khoản người dùng được cập nhật thành Banned/Active.

### UC_A02: Quản lý Liên kết Đối tác (Manage Affiliate Partners)
**1. Mô tả ngắn:** Quản lý các mã affiliate, API keys của các bên thứ 3 (Agoda, Traveloka...).
**2. Tác nhân:** Admin.
**3. Luồng sự kiện chính:**
- **Bước 1:** Truy cập "Quản lý Đối tác".
- **Bước 2:** Thêm đối tác mới bằng cách nhập tên, API Base URL, Client ID, Secret Key, Mã Affiliate tracking.
- **Bước 3:** Hệ thống lưu cấu hình và sử dụng cấu hình này cho UC_T04.

### UC_A03: Báo cáo Thống kê Doanh thu (Dashboard & Analytics)
**1. Mô tả ngắn:** Xem báo cáo lượng truy cập và doanh thu affiliate.
**2. Tác nhân:** Admin.
**3. Luồng sự kiện chính:**
- **Bước 1:** Đăng nhập vào trang chủ Dashboard.
- **Bước 2:** Hệ thống hiển thị biểu đồ: Số lượng chuyến đi tạo mới, Số lượt click qua link đối tác, Ước tính doanh thu hoa hồng theo tháng.
- **Bước 3:** Admin có thể lọc dữ liệu theo khoảng thời gian.
