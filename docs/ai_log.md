# Nhật ký sử dụng AI
## Dự án AINA Pharmacy — Quản lý và bán thuốc trực tuyến

> Tài liệu này ghi nhận cách AI được dùng khi xây dựng và hoàn thiện dự án.  
> Nguyên tắc: sinh viên định hướng kiến trúc và kiểm thử; AI hỗ trợ giải thuật, cú pháp và tài liệu.  
> Tham chiếu bổ sung: `docs/NHAT_KY_SU_DUNG_AI.md`

---

## 1. Vai trò và nguyên tắc

| Bên | Trách nhiệm |
|-----|-------------|
| Người học | Chọn stack (Express + Prisma + JS thuần), luồng nhà thuốc, rà soát bảo mật, sửa bug thật |
| Trợ lý AI | Gợi ý API, schema, xử lý lỗi, tài liệu Markdown, tối ưu đoạn mã |

Mọi gợi ý của AI đều được đối chiếu với mã nguồn (`backend/src`, `frontend/js`, `prisma/schema.prisma`) trước khi giữ lại.

---

## 2. Bảng tổng hợp các lần dùng AI

| STT | Bài toán | Module liên quan | Việc người học chỉnh sau AI |
|----:|----------|------------------|------------------------------|
| 1 | JWT tách admin / khách, chống lộ trang bảo mật | `xac_thuc.js`, `login.html` | Đưa kiểm tra token lên `<head>`, tránh nháy UI |
| 2 | Tìm kiếm thuốc tiếng Việt, đa bộ lọc | `shop.js`, `products.js` | `trim`, không phân biệt hoa thường, debounce 300ms |
| 3 | Demo khi giáo viên không bật MySQL | `api.js`, `mock-data.js` | Fallback đủ CRUD, POS, đơn hàng trên LocalStorage |
| 4 | Xuất báo cáo Excel/PDF tiếng Việt | `bao_cao.js`, `reports.js` | UTF-8 BOM cho CSV; font/PDF A4 |
| 5 | Ảnh thuốc Việt Nam, tránh vỡ layout | `app.js`, trang shop | `onerror` + `getValidMedicineImage()` |
| 6 | Ảnh giỏ hàng / wishlist lệch field | `cart.js`, `wishlist.js` | Mapper `hinhAnh` / `image`; heal LocalStorage cũ |
| 7 | Schema lô, đơn online, PayOS, tư vấn | `schema.prisma` | Đồng bộ enum trạng thái đơn và `da_tru_kho` |
| 8 | Viết bộ tài liệu requirements / use case / CSDL / AI log | `docs/*.md` | Chỉ tạo file mới, không sửa mã nguồn sẵn có |

---

## 3. Chi tiết từng tình huống

### 3.1. Xác thực và phân quyền

- **Prompt (tóm tắt):** Xây JWT tách quản trị và khách; chặn checkout/dashboard khi chưa đăng nhập.
- **AI đề xuất:** Hai loại token; middleware `xacThucTruyCap` / `yeuCauVaiTro` / `yeuCauKhachHang`; redirect sau `DOMContentLoaded`.
- **Chỉnh tay:** Kiểm tra ngay trong `<head>` để không flash nội dung bảo mật; khóa tài khoản `KHOA` trả 403.

### 3.2. Tìm kiếm và lọc

- **Prompt:** Lọc theo tên, hoạt chất, danh mục, khoảng giá.
- **AI đề xuất:** `filter` + `includes` sau `toLowerCase`.
- **Chỉnh tay:** Chuẩn hóa khoảng trắng; debounce; khớp dữ liệu mock và API.

### 3.3. Dual-mode online / offline

- **Prompt:** Vẫn demo đủ chức năng nếu backend tắt.
- **AI đề xuất:** Bắt lỗi `fetch`, trả mock.
- **Chỉnh tay:** `handleMockFallback()` phủ đăng nhập, thuốc, POS, đơn; tài khoản demo click-to-fill.

### 3.4. Báo cáo đa định dạng

- **Prompt:** Xuất PDF và Excel doanh thu.
- **AI đề xuất:** html2pdf / Blob CSV; backend ExcelJS + pdfmake.
- **Chỉnh tay:** BOM `\uFEFF`; căn trang A4; quyền `QUAN_LY` trên API doanh thu.

### 3.5. Dữ liệu thuốc và hình ảnh

- **Prompt:** Danh mục thuốc Việt Nam kèm ảnh thật.
- **AI đề xuất:** Bộ sản phẩm mẫu + URL ảnh.
- **Chỉnh tay:** Placeholder khi URL chết; không phụ thuộc mạng khi chấm bài.

### 3.6. Đồng bộ ảnh giỏ hàng

- **Prompt:** Trang chủ có ảnh, giỏ hàng mất ảnh.
- **AI đề xuất:** Lệch tên field `hinhAnh` vs `image`.
- **Chỉnh tay:** Chuỗi fallback nhiều field; phục hồi item cũ trong LocalStorage.

### 3.7. Mô hình dữ liệu mở rộng

- **Prompt:** Thiết kế bảng đơn hàng, kho, chat, thanh toán.
- **AI đề xuất:** Các model Prisma và enum.
- **Chỉnh tay:** Cờ `da_tru_kho`; webhook SePay/PayOS; Socket.IO phiên tư vấn; không xóa thuốc đang tham chiếu.

### 3.8. Bộ tài liệu bốn file Markdown (phiên làm việc tài liệu)

- **Yêu cầu người dùng:** Viết bốn file Markdown dựa trên dự án, lưu thư mục riêng.
- **Việc AI làm:** Đọc `README.md`, `schema.prisma`, `server.js`, routes, trang `frontend/pages`, nhật ký AI sẵn có; soạn:
  - `docs/requirements.md`
  - `docs/use_cases.md`
  - `docs/database_design.md`
  - `docs/ai_log.md`
- **Ràng buộc giữ:** Không sửa file hiện có; nội dung bám mã thật, không bịa endpoint.

---

## 4. Công cụ AI đã dùng trong dự án

- Trợ lý lập trình trong IDE (sinh mã, giải thích lỗi, viết tài liệu).
- Không dùng AI để bịa số liệu doanh thu hay “sửa CSDL production” ngoài seed/mock.

---

## 5. Đánh giá

1. AI rút ngắn thời gian viết boilerplate (Express route, Prisma model, HTML lặp).
2. Lỗi thực tế (flash auth, CSV Windows, lệch field ảnh) do người học phát hiện khi chạy hệ thống.
3. Tài liệu trong `docs/` phải luôn đối chiếu lại Prisma/API khi schema đổi — `schema.sql` có thể lệch phiên bản.

---

## 6. Cam kết học thuật

Các file trong thư mục `docs/` là sản phẩm mô tả hệ thống đã implement. AI hỗ trợ soạn thảo; logic nghiệp vụ và quyết định kiến trúc thuộc về người thực hiện đồ án.
