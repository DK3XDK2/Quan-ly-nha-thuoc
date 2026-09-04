# Tài liệu yêu cầu phần mềm
## Hệ thống Quản lý và Bán thuốc Trực tuyến — AINA Pharmacy

> Phiên bản: 1.0  
> Nguồn: phân tích mã nguồn thực tế (`frontend/`, `backend/`, `database/`)  
> Mục đích: mô tả yêu cầu chức năng, phi chức năng và ràng buộc của hệ thống

---

## 1. Tổng quan dự án

AINA Pharmacy là hệ thống quản lý nhà thuốc kết hợp bán hàng tại quầy (POS) và bán thuốc trực tuyến. Hệ thống tách hai kênh người dùng:

- **Kênh quản trị / nhân viên:** dashboard, thuốc, kho, POS, đơn hàng, khách hàng, nhà cung cấp, báo cáo, tư vấn.
- **Kênh khách hàng:** cửa hàng công khai, giỏ hàng, thanh toán, lịch sử đơn, tài khoản, wishlist, hỗ trợ.

Kiến trúc hiện tại:

| Tầng | Công nghệ | Vai trò |
|------|-----------|---------|
| Frontend | HTML, CSS, JavaScript thuần | Giao diện shop, admin, POS, báo cáo |
| Backend | Node.js, Express 5, Prisma ORM | REST API, JWT, Socket.IO |
| Cơ sở dữ liệu | MySQL (qua Prisma) | Lưu nghiệp vụ nhà thuốc |
| Tích hợp | PayOS / SePay, Cloudinary, Socket.IO | Thanh toán, ảnh, chat tư vấn |
| Chế độ dự phòng | LocalStorage + mock data | Demo khi chưa có backend/CSDL |

---

## 2. Đối tượng người dùng

| Vai trò | Lưu trữ | Quyền chính |
|---------|---------|-------------|
| Quản lý (`QUAN_LY`) | Bảng `nguoi_dung` | Toàn quyền: thuốc, kho, nhân viên, nhà cung cấp, báo cáo, nhật ký, duyệt AI |
| Nhân viên / Dược sĩ (`NHAN_VIEN`) | Bảng `nguoi_dung` | POS, tra cứu thuốc, xử lý đơn, tư vấn, tồn kho |
| Khách hàng (`KHACH_HANG`) | Bảng `khach_hang` | Xem thuốc, giỏ hàng, đặt hàng, thanh toán, lịch sử đơn, chat tư vấn |
| Khách vãng lai | Không bắt buộc tài khoản | Xem cửa hàng, chi tiết thuốc, tìm kiếm/lọc |

---

## 3. Yêu cầu chức năng

### FR-01. Xác thực và phân quyền

- Đăng nhập nhân viên/quản lý bằng email + mật khẩu; mật khẩu băm bằng bcrypt; cấp JWT.
- Đăng ký và đăng nhập khách hàng tách biệt (`/api/khach-hang`).
- Middleware `xacThucTruyCap`, `yeuCauVaiTro`, `yeuCauKhachHang` bảo vệ API.
- Tài khoản nhân viên có trạng thái `HOAT_DONG` / `KHOA`; tài khoản khóa không đăng nhập được.
- Frontend chặn trang bảo mật (dashboard, checkout, POS…) khi chưa đăng nhập hoặc sai vai trò.
- Quản lý cập nhật hồ sơ, avatar (Cloudinary).

### FR-02. Quản lý danh mục và thuốc

- CRUD danh mục thuốc (`danh_muc_thuoc`).
- CRUD thuốc: mã thuốc, tên, hoạt chất, hàm lượng, đơn vị tính, giá bán, cờ kê đơn, hình ảnh, trạng thái kinh doanh.
- Tìm kiếm theo tên thuốc, hoạt chất, mã thuốc.
- Lọc theo danh mục, khoảng giá, tình trạng tồn kho.
- Sắp xếp theo giá, tên, thời gian tạo.

### FR-03. Quản lý tồn kho theo lô

- Mỗi thuốc có nhiều lô (`lo_ton_kho`): số lô, hạn sử dụng, số lượng tồn, giá nhập.
- Thống kê tồn kho, cảnh báo tồn thấp / sắp hết hạn.
- Lịch sử xuất kho với lý do: bán hàng, hư hàng, kiểm kê, hết hạn.
- Xuất kho gắn tham chiếu hóa đơn hoặc đơn hàng.

### FR-04. Bán hàng tại quầy (POS)

- Nhân viên chọn thuốc, số lượng, chiết khấu, phương thức thanh toán.
- Tạo hóa đơn (`hoa_don`) và chi tiết (`chi_tiet_hoa_don`).
- Có thể gắn đơn thuốc đã duyệt (`don_thuoc`) hoặc khách hàng thành viên.
- Trừ tồn kho và ghi lịch sử xuất kho khi bán.

### FR-05. Đơn thuốc

- Tạo đơn thuốc: bệnh nhân, bác sĩ, danh sách thuốc + liều dùng.
- Trạng thái: mới tạo → đã duyệt / từ chối.
- Đơn đã duyệt mới được dùng khi lập hóa đơn POS (thuốc kê đơn).

### FR-06. Bán hàng trực tuyến

- Khách xem cửa hàng, chi tiết sản phẩm, flash sale, hỗ trợ.
- Giỏ hàng và danh sách yêu thích (LocalStorage phía client).
- Đặt hàng: người nhận, SĐT, địa chỉ, ghi chú, phí giao hàng.
- Trạng thái đơn: mới tạo, đã xác nhận, đang giao, hoàn tất, hủy, yêu cầu hoàn tiền, đã hoàn tiền.
- Khách xem lịch sử đơn của chính mình.
- Quản lý/nhân viên cập nhật trạng thái đơn.

### FR-07. Thanh toán trực tuyến

- Hỗ trợ thanh toán tiền mặt (`CASH`) và cổng thanh toán (PayOS / SePay webhook).
- Kiểm tra trạng thái thanh toán theo mã đơn hàng.

### FR-08. Quản lý khách hàng và nhà cung cấp

- Quản lý xem/thêm/sửa thông tin khách hàng.
- CRUD nhà cung cấp: mã, tên, liên hệ, SĐT, email, địa chỉ (chỉ quản lý).

### FR-09. Tư vấn trực tuyến

- Khách bắt đầu phiên tư vấn.
- Nhân viên nhận phiên, nhắn tin realtime (Socket.IO).
- Kết thúc phiên từ phía khách hoặc nhân viên.
- Lưu lịch sử tin nhắn; quản lý xem/xóa phiên.

### FR-10. Gợi ý AI

- Hệ thống sinh gợi ý: tồn kho thấp, sắp hết hạn, xu hướng mua.
- Nhân viên/quản lý duyệt hoặc từ chối gợi ý.
- Lưu độ tin cậy và dữ liệu đầu vào/đầu ra dạng JSON.

### FR-11. Báo cáo và dashboard

- Dashboard: doanh thu, đơn mới, thuốc sắp hết.
- Biểu đồ Chart.js (doanh thu theo thời gian, sản phẩm bán chạy).
- Xuất báo cáo Excel và PDF (backend); frontend còn hỗ trợ CSV/Word/JSON.

### FR-12. Nhật ký hệ thống

- Ghi hành động người dùng/hệ thống: đối tượng, trước/sau thay đổi.
- Quản lý xem nhật ký.

### FR-13. Chế độ Dual-Mode

- Có backend/CSDL: thao tác dữ liệu thật.
- Không có backend: `frontend/js/api.js` chuyển mock LocalStorage, vẫn demo CRUD, POS, đặt hàng, đăng nhập.

---

## 4. Yêu cầu phi chức năng

| Mã | Nhóm | Mô tả |
|----|------|--------|
| NFR-01 | Bảo mật | JWT, bcrypt, phân quyền theo vai trò, không commit secret (`.env.example`) |
| NFR-02 | Độ tin cậy | API bọc `try/catch`; mã HTTP 400/401/403/404/500; không làm crash giao diện |
| NFR-03 | Khả dụng | Fallback offline khi mất kết nối backend |
| NFR-04 | Hiệu năng | Debounce tìm kiếm ~300ms; phân trang cửa hàng |
| NFR-05 | Usability | Giao diện tiếng Việt, toast, modal xác nhận, badge trạng thái |
| NFR-06 | Tương thích | Responsive PC / tablet / mobile; trình duyệt hiện đại |
| NFR-07 | Dữ liệu | Chuẩn hóa quan hệ (3NF); Prisma map snake_case |
| NFR-08 | Đa ngôn ngữ dữ liệu | CSV có UTF-8 BOM để Excel Windows đọc tiếng Việt |

---

## 5. Ràng buộc kỹ thuật

- Frontend chạy cổng **3000** (`npx serve`).
- Backend chạy cổng **4000**.
- CSDL mặc định MySQL, chuỗi kết nối `DATABASE_URL`.
- Node.js 18 trở lên.
- Không bắt buộc MySQL khi chỉ demo frontend.

---

## 6. Phạm vi ngoài (không thuộc yêu cầu hiện tại)

- Ứng dụng di động native (iOS/Android).
- Kết nối cổng bảo hiểm y tế / đơn thuốc điện tử quốc gia.
- Kế toán đầy đủ (sổ cái, thuế GTGT chi tiết).
- Đa chi nhánh / đa kho phức tạp.

---

## 7. Tiêu chí chấp nhận (tóm tắt)

1. Đăng nhập đúng 3 nhóm người dùng và bị chặn khi sai quyền.
2. CRUD thuốc, khách hàng, nhà cung cấp phản ánh đúng trên CSDL (hoặc mock).
3. POS tạo hóa đơn và trừ kho; đơn online đổi trạng thái được.
4. Tìm kiếm/lọc thuốc theo tên, hoạt chất, danh mục, giá.
5. Dashboard và xuất báo cáo chạy được.
6. Frontend không trắng trang khi backend tắt (chế độ mock).
