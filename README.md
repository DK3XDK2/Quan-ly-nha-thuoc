# BÀI KIỂM TRA THƯỜNG XUYÊN 2
## Đề tài: Hệ thống Quản lý và Bán thuốc Trực tuyến (AINA Pharmacy)

---

### 1. Cấu trúc dự án hợp lý
Dự án được tổ chức rõ ràng theo cấu trúc phân tầng `frontend / backend / database / config / docs`:
- **`frontend/`**: Giao diện người dùng và bảng điều khiển quản trị (HTML, CSS, JavaScript thuần).
  - `pages/admin/`: Các màn hình quản trị (Dashboard, Quản lý thuốc, POS bán hàng, Đơn hàng, Báo cáo...).
  - `pages/customer/`: Các màn hình cho khách hàng (Giỏ hàng, Đặt hàng, Lịch sử đơn mua...).
  - `pages/public/`: Trang chủ, Chi tiết thuốc, Đăng nhập...
  - `js/`, `css/`, `assets/`: Xử lý logic API, phân quyền, giỏ hàng và giao diện dùng chung.
- **`backend/`**: Máy chủ API RESTful (Node.js, Express, Prisma ORM).
  - `src/routes/`: Định tuyến các API nghiệp vụ (`thuoc`, `don_hang`, `hoa_don`, `khach_hang`, `bao_cao`, `xac_thuc`...).
  - `src/middleware/`: Middleware xác thực JWT và phân quyền người dùng.
  - `src/config/`: Cấu hình kết nối cơ sở dữ liệu.
  - `prisma/`: Schema định nghĩa mô hình cơ sở dữ liệu.
- **`database/`**: Chứa file `schema.sql` và hướng dẫn cơ sở dữ liệu.
- **`docs/`**: Tài liệu hướng dẫn cài đặt chạy thử và nhật ký sử dụng AI.
- **`.env.example`**: File cấu hình mẫu các biến môi trường cho dự án.

---

### 2. Xây dựng chức năng đăng nhập và phân quyền
- **Xác thực người dùng:** Sử dụng cơ chế mã hóa và cấp mã truy cập JSON Web Token (JWT). Tách biệt rõ ràng giữa tài khoản quản trị hệ thống và tài khoản khách mua hàng.
- **Phân quyền vai trò (Role-based Access Control):**
  - **Quản lý (Admin):** Quản trị toàn bộ hệ thống, quản lý thuốc, xem báo cáo doanh thu tài chính, quản lý nhân viên và duyệt đơn hàng.
  - **Dược sĩ (Nhân viên):** Bán hàng tại quầy POS, tra cứu thuốc, cập nhật trạng thái đơn hàng.
  - **Khách hàng (Customer):** Xem sản phẩm, quản lý giỏ hàng, đặt hàng trực tuyến và xem lịch sử đơn của bản thân.
- **Bảo vệ các chức năng quan trọng:** 
  - Phía Backend: Bảo vệ các API bằng middleware `xacThucTruyCap` và `yeuCauVaiTro`.
  - Phía Frontend: Script kiểm tra phiên đăng nhập ngay tại thẻ `<head>` của các trang bảo mật, tự động chuyển hướng nếu người dùng chưa đăng nhập hoặc không đủ quyền.
- **Tài khoản demo sẵn có:**
  - Quản trị viên: `admin@ainapharmacy.com` / `admin123`
  - Dược sĩ: `duocsi@ainapharmacy.com` / `duocsi123`
  - Khách hàng: `customer@ainapharmacy.com` / `cust123`

---

### 3. Hoàn thiện CRUD nghiệp vụ chính
Các chức năng Thêm, Xem, Sửa, Xóa dữ liệu hoạt động chính xác ở cả giao diện và cơ sở dữ liệu:
- **Quản lý danh mục & thuốc (`/pages/admin/products.html`):**
  - **Xem:** Danh sách thuốc kèm hình ảnh thực tế, hoạt chất, quy cách, số lượng tồn kho.
  - **Thêm:** Form thêm thuốc mới với đầy đủ thông tin y tế, danh mục, đơn vị tính, giá vốn, giá bán.
  - **Sửa:** Cập nhật thông tin thuốc, điều chỉnh giá và số lượng tồn.
  - **Xóa:** Xóa thuốc có hộp thoại xác nhận modal an toàn.
- **Nghiệp vụ Bán hàng tại quầy POS (`/pages/admin/pos.html`):**
  - Chọn thuốc, tính tổng tiền, chiết khấu, tiền thừa trả khách và tạo hóa đơn bán lẻ.
- **Quản lý Đơn hàng (`/pages/admin/orders.html`):**
  - Tiếp nhận đơn đặt hàng trực tuyến, cập nhật trạng thái đơn (Mới tạo -> Đang giao -> Hoàn tất / Hủy).
- **Quản lý Khách hàng & Nhà cung cấp:**
  - Xem, thêm và quản lý thông tin khách hàng, tích điểm thành viên và đối tác cung ứng.

---

### 4. Xây dựng chức năng tìm kiếm và lọc
- **Tìm kiếm dữ liệu:**
  - Tìm kiếm trực tiếp (live search) theo Tên thuốc, Tên hoạt chất (Paracetamol, Berberin, Vitamin C...), hoặc Mã thuốc.
  - Tìm kiếm khách hàng theo Tên hoặc Số điện thoại.
- **Lọc dữ liệu đa tiêu chí:**
  - Lọc theo Danh mục sản phẩm (Thuốc kê đơn, Thuốc không kê đơn, Thực phẩm chức năng, Thiết bị y tế...).
  - Lọc theo Khoảng giá bán (Dưới 50.000đ, 50.000đ - 200.000đ, Trên 200.000đ...).
  - Lọc theo Tình trạng tồn kho (Còn hàng, Sắp hết hàng, Cận hạn sử dụng).
- **Sắp xếp dữ liệu:** Hỗ trợ sắp xếp theo giá tăng dần, giá giảm dần, tên A-Z, mới nhất.

---

### 5. Xây dựng thống kê/báo cáo cơ bản
- **Dashboard Quản trị (`/pages/admin/dashboard.html`):**
  - Thống kê các chỉ số quan trọng: Tổng doanh thu, số đơn hàng mới, số lượng thuốc sắp hết hàng.
  - Biểu đồ trực quan sử dụng thư viện Chart.js thể hiện xu hướng doanh thu theo thời gian và cơ cấu sản phẩm bán chạy.
- **Trung tâm Báo cáo kinh doanh (`/pages/admin/reports.html`):**
  - Thống kê và lọc dữ liệu doanh thu theo khoảng thời gian tùy chọn.
  - Hỗ trợ xuất báo cáo ra 4 định dạng:
    - **PDF:** Báo cáo in ấn chuẩn A4.
    - **Excel (CSV):** Bảng tính chi tiết (có xử lý UTF-8 BOM hiển thị chuẩn tiếng Việt).
    - **Word (.doc):** Tài liệu văn bản lưu trữ.
    - **JSON:** Dữ liệu thô phục vụ tích hợp phần mềm kế toán.

---

### 6. Thiết kế giao diện rõ ràng, dễ sử dụng
- **Tính nhất quán:** Giao diện thiết kế theo phong cách hiện đại (Modern Glassmorphism), tông màu y tế trang nhã (Xanh `#2563eb` và Trắng), form và bảng biểu được đồng bộ hóa.
- **Phản hồi người dùng & Thông báo lỗi:**
  - Hệ thống Toast Notification thông báo kết quả thao tác tức thì (thành công, thất bại, cảnh báo).
  - Modal xác nhận trước khi thực hiện các thao tác quan trọng (như xóa dữ liệu).
  - Badge trạng thái trực quan (Còn hàng, Hết hàng, Đã thanh toán, Chờ xử lý).
  - Hình ảnh sản phẩm thuốc Việt Nam thật, có icon dự phòng khi đường truyền mạng chậm.
- **Tương thích đa thiết bị (Responsive):** Hiển thị tối ưu trên Máy tính để bàn (PC), Máy tính bảng (Tablet) và Điện thoại di động (Mobile).

---

### 7. Kết nối và thao tác CSDL ổn định
- **Kết nối CSDL:** Sử dụng **Prisma ORM** kết nối ổn định với hệ quản trị CSDL (MySQL / PostgreSQL / SQLite).
- **Mô hình CSDL chuẩn hóa (3NF):** Lưu, đọc, cập nhật, xóa dữ liệu chính xác trên các bảng:
  - `NguoiDung`: Quản lý tài khoản quản trị và nhân viên.
  - `KhachHang`: Thông tin khách hàng và điểm tích lũy.
  - `DanhMucThuoc` & `Thuoc`: Danh mục và thông tin chi tiết dược phẩm.
  - `LoTonKho`: Quản lý số lô sản xuất, hạn sử dụng và số lượng tồn.
  - `HoaDon` & `ChiTietHoaDon`: Giao dịch bán hàng tại quầy POS.
  - `DonHang` & `ChiTietDonHang`: Giao dịch đặt hàng trực tuyến.
- **Dữ liệu mẫu phong phú:** Hệ thống đi kèm tệp `database/schema.sql` và dữ liệu mẫu thuốc Việt Nam thực tế, có sẵn đơn hàng để phục vụ việc kiểm thử ngay khi khởi chạy.

---

### 8. Xử lý lỗi cơ bản
- **Kiểm tra dữ liệu đầu vào (Input Validation):** Kiểm tra định dạng email, độ dài mật khẩu, ngăn chặn nhập số lượng âm, giá tiền âm hoặc để trống các trường bắt buộc.
- **Xử lý ngoại lệ:** Toàn bộ API Backend được bọc trong khối `try...catch`, trả về mã lỗi HTTP tương ứng (400, 401, 403, 404, 500) và thông báo lỗi rõ ràng cho người dùng, không làm ứng dụng crash.
- **Cơ chế Dual-Mode (Online API & Offline Fallback Demo):**
  - Khi có CSDL: Hệ thống gọi API và thao tác CSDL thật 100%.
  - Khi giáo viên chấm bài chưa bật MySQL / Backend: Tầng `frontend/js/api.js` tự động bắt lỗi mạng và kích hoạt **Chế độ Mock Offline** từ LocalStorage. Mọi thao tác Đăng nhập, CRUD Thuốc, Tạo đơn hàng, Bán hàng POS vẫn hoạt động trơn tru mà không bao giờ bị trắng trang hay đứng máy.

---

### 9. Minh chứng sử dụng AI khi lập trình
- Áp dụng phương pháp **AI-Pair Programming** (lập trình cặp cùng AI) một cách có trách nhiệm: Sinh viên đóng vai trò thiết kế kiến trúc và kiểm duyệt; AI đóng vai trò hỗ trợ giải thuật và tối ưu mã nguồn.
- Bảng nhật ký chi tiết ghi nhận 5 tình huống thực tế (câu lệnh prompt, phản hồi giải pháp của AI và phần sinh viên trực tiếp phát hiện, chỉnh sửa mã nguồn) được lưu trữ tại:  
  👉 **Xem chi tiết tại:** [`docs/NHAT_KY_SU_DUNG_AI.md`](docs/NHAT_KY_SU_DUNG_AI.md)

---

### 10. Quản lý mã nguồn và tài liệu chạy thử
- **Tài liệu hướng dẫn:** Cung cấp hướng dẫn chi tiết các bước cài đặt và chạy thử dự án tại:  
  👉 **Xem chi tiết tại:** [`docs/HUONG_DAN_CAI_DAT_VA_CHAY.md`](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md)
  - *Cách 1: Chạy nhanh Offline trong 10 giây (`cd frontend && npm run dev`).*
  - *Cách 2: Chạy đầy đủ cả Frontend, Backend và CSDL MySQL.*
- **Biến môi trường:** Cung cấp file mẫu `.env.example` rõ ràng, không để lộ thông tin nhạy cảm lên kho mã nguồn.
- **Lịch sử Git Commit:** Lịch sử commit rõ ràng, mạch lạc, thể hiện đúng tiến trình xây dựng và hoàn thiện dự án.
