# 📖 Tài Liệu Đặc Tả API - Hệ Thống Quản Lý Nhà Thuốc AINA Pharmacy

> **Phiên bản:** 2.0  
> **Cổng Server (Local):** `http://localhost:4000` (hoặc domain public qua ngrok/production)  
> **Base URL:** `/api`  
> **Định dạng dữ liệu:** JSON (`Content-Type: application/json`)  
> **Cơ chế xác thực:** JWT Bearer Token qua header `Authorization: Bearer <token>`

---

## 📑 Mục lục tổng quan Route Modules

| STT | File Route | Tiền tố API | Chức năng chính |
|:---:|:---|:---|:---|
| 1 | `xac_thuc.js` | `/api/xac-thuc` | Đăng nhập nội bộ, quản lý nhân viên, hồ sơ cá nhân |
| 2 | `khach_hang.js` | `/api/khach-hang` | Đăng ký, đăng nhập khách hàng, hồ sơ, AI Insights sức khỏe |
| 3 | `thuoc.js` | `/api/thuoc` | Danh mục thuốc, quản lý sản phẩm thuốc, hoạt chất, giá bán |
| 4 | `ton_kho.js` | `/api/ton-kho`, `/api/lo-thuoc` | Quản lý lô thuốc, hạn dùng (FEFO), thống kê tồn, lịch sử xuất |
| 5 | `don_hang.js` | `/api/don-hang` | Đặt hàng online, lịch sử đơn, hủy đơn, xác nhận nhận hàng, hoàn tiền |
| 6 | `thanh_toan.js` | `/api/thanh-toan` | Tích hợp cổng SePay VietQR tự động, Webhook xác nhận thanh toán |
| 7 | `hoa_don.js` | `/api/hoa-don` | Bán lẻ tại quầy POS, tự động trừ tồn kho theo lô |
| 8 | `don_thuoc.js` | `/api/don-thuoc` | Quản lý đơn thuốc kê toa của bác sĩ |
| 9 | `goi_y_ai.js` | `/api/goi-y-ai` | Trợ lý AI AINA (tư vấn khách, cảnh báo nguy kịch, gợi ý kho thông minh) |
| 10 | `tu_van.js` | `/api/tu-van` | Chat trực tiếp thời gian thực giữa Dược sĩ và Khách hàng (Socket.io) |
| 11 | `nha_cung_cap.js` | `/api/nha-cung-cap` | Quản lý đối tác / nhà phân phối cung cấp dược phẩm |
| 12 | `bao_cao.js` | `/api/bao-cao` | Thống kê doanh thu, xuất báo cáo tài chính Excel & PDF |
| 13 | `nhat_ky.js` | `/api/nhat-ky` | Audit logs ghi vết toàn bộ hành vi người dùng và nhân viên |

---

## 1. Xác thực & Quản lý Nhân sự (`/api/xac-thuc`)

Module phụ trách phân quyền cho ban quản lý (`QUAN_LY`) và nhân viên dược sĩ (`NHAN_VIEN`).

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `POST` | `/khoi-tao-quan-ly` | Public (1 lần) | Tạo tài khoản Quản lý đầu tiên của hệ thống khi mới khởi chạy |
| `POST` | `/dang-nhap` | Public | Đăng nhập dành cho Quản lý / Dược sĩ, trả về JWT Token |
| `POST` | `/tao-tai-khoan` | `QUAN_LY` | Quản lý tạo mới tài khoản cho Dược sĩ / Quản lý khác |
| `GET` | `/nhan-vien` | `QUAN_LY` | Lấy danh sách toàn bộ nhân sự trong nhà thuốc |
| `PATCH` | `/:id/trang-thai` | `QUAN_LY` | Khóa hoặc kích hoạt lại tài khoản nhân viên (`HOAT_DONG` / `BI_KHOA`) |
| `GET` | `/ho-so` | Đăng nhập | Lấy thông tin chi tiết hồ sơ tài khoản đang đăng nhập |
| `PATCH` | `/ho-so` | Đăng nhập | Cập nhật thông tin cá nhân (họ tên, email, SĐT, ngày sinh, mật khẩu mới) |
| `POST` | `/cap-nhat-avatar` | Đăng nhập | Upload và đổi ảnh đại diện (lưu trữ trên Cloudinary qua form multipart) |

---

## 2. Khách hàng & Tài khoản Người mua (`/api/khach-hang`)

Module quản lý tài khoản người dùng mua thuốc online tại Website.

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `POST` | `/dang-ky` | Public | Đăng ký tài khoản khách hàng mới (họ tên, email, SĐT, địa chỉ, mật khẩu) |
| `POST` | `/dang-nhap` | Public | Khách hàng đăng nhập, nhận JWT Token riêng cho khách hàng |
| `GET` | `/thong-tin` | Khách hàng | Lấy thông tin cá nhân của khách hàng đang đăng nhập |
| `GET` | `/ai-insights` | Khách hàng | AI phân tích tần suất mua thuốc trong 30 ngày, đưa ra cảnh báo lạm dụng/quá liều thuốc |
| `GET` | `/quan-ly` | `QUAN_LY`, `NHAN_VIEN` | Danh sách khách hàng kèm tổng số đơn hàng đã mua |
| `POST` | `/quan-ly` | `QUAN_LY`, `NHAN_VIEN` | Nhân viên chủ động tạo hồ sơ khách hàng mới từ hệ thống Admin |
| `PATCH` | `/:id` | `QUAN_LY`, `NHAN_VIEN` | Cập nhật thông tin hồ sơ của khách hàng theo ID |
| `GET` | `/:id/lich-su-mua-hang` | `QUAN_LY`, `NHAN_VIEN` | Xem chi tiết toàn bộ lịch sử các đơn hàng đã đặt của một khách hàng |

---

## 3. Quản lý Thuốc & Danh mục (`/api/thuoc`)

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `GET` | `/danh-muc` | Public | Lấy danh sách tất cả các nhóm/danh mục thuốc |
| `POST` | `/danh-muc` | `QUAN_LY`, `NHAN_VIEN` | Tạo thêm nhóm danh mục thuốc mới |
| `GET` | `/` | Public | Lấy toàn bộ danh sách thuốc, bao gồm thông tin danh mục và lô tồn kho |
| `POST` | `/` | `QUAN_LY`, `NHAN_VIEN` | Thêm mới một loại thuốc vào cơ sở dữ liệu (tên, mã, đơn vị tính, giá bán...) |
| `PATCH` | `/:id` | `QUAN_LY`, `NHAN_VIEN` | Sửa thông tin thuốc (tên, giá, đơn vị tính, hoạt chất, hàm lượng) |

---

## 4. Quản lý Tồn kho & Lô thuốc (`/api/ton-kho` hoặc `/api/lo-thuoc`)

Quản lý hạn sử dụng, xuất nhập tồn theo chiến lược quản lý dược phẩm FEFO (First Expired, First Out).

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `GET` | `/` hoặc `/lo` | Đăng nhập | Lấy danh sách các lô thuốc trong kho kèm thông tin hạn sử dụng và số lượng |
| `GET` | `/thong-ke` | Đăng nhập | Dashboard thống kê: Tổng lô, số lô sắp hết hàng (<=20), số lô cận hạn (<=30 ngày), tổng số lượng viên/hộp tồn |
| `POST` | `/lo` | `QUAN_LY`, `NHAN_VIEN` | Nhập lô thuốc mới về kho (mã thuốc, số lô, hạn sử dụng, số lượng, giá nhập) |
| `PATCH` | `/lo/:id` | `QUAN_LY`, `NHAN_VIEN` | Điều chỉnh thông tin hoặc số lượng của một lô thuốc |
| `GET` | `/lich-su-xuat` | Đăng nhập | Xem nhật ký lịch sử xuất kho chi tiết khi bán đơn online hoặc hóa đơn quầy |

---

## 5. Đơn hàng Online (`/api/don-hang`)

Quản lý toàn bộ vòng đời của đơn hàng trực tuyến đặt qua Website bán lẻ.

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `POST` | `/dat-hang` | Khách / Vãng lai | Khách tạo đơn hàng mới (COD hoặc SePay QR). Tự động tính tiền và lưu chi tiết giỏ hàng |
| `GET` | `/lich-su` | Khách / Tùy chọn | Lấy lịch sử đơn hàng của khách theo Token hoặc theo SĐT người nhận |
| `GET` | `/quan-ly` | `QUAN_LY`, `NHAN_VIEN` | Lấy toàn bộ danh sách đơn đặt hàng trên hệ thống để chuẩn bị và giao thuốc |
| `GET` | `/:id` | `QUAN_LY`, `NHAN_VIEN` | Lấy thông tin chi tiết một đơn hàng theo ID |
| `PATCH` | `/khach-hang-huy-don/:id` | Khách / Tùy chọn | Khách hàng hủy đơn (đơn COD -> `HUY`, đơn đã trả tiền SePay -> `YEU_CAU_HOAN_TIEN`) |
| `PATCH` | `/:id/khach-hang-nhan-hang` | Khách / Tùy chọn | Khách hàng xác nhận đã nhận hàng -> chuyển trạng thái `HOAN_TAT` & tự động trừ kho |
| `PATCH` | `/:id/yeu-cau-tra-hang` | Khách / Tùy chọn | Khách gửi yêu cầu trả hàng / hoàn tiền kèm lý do sau khi đã nhận đơn |
| `PATCH` | `/:id/trang-thai` | `QUAN_LY`, `NHAN_VIEN` | Admin cập nhật trạng thái đơn (`DA_XAC_NHAN`, `DANG_GIAO`, `HOAN_TAT`, `HUY`) |

---

## 6. Cổng thanh toán SePay VietQR (`/api/thanh-toan`)

Hệ thống thanh toán tự động không cần đối soát ngân hàng thủ công.

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `POST` | `/sepay-webhook` | SePay Server | Webhook tiếp nhận biến động số dư tài khoản ngân hàng từ SePay. Khớp mã đơn `DH...` và tự động chuyển đơn sang `DA_XAC_NHAN` |
| `GET` | `/kiem-tra/:maDonHang` | Public | Client chủ động kiểm tra trạng thái thanh toán của mã đơn hàng (gọi API SePay v2 kiểm tra đối soát trực tiếp) |

---

## 7. Hóa đơn Bán lẻ tại quầy POS (`/api/hoa-don`)

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `GET` | `/` | Đăng nhập | Lấy danh sách tất cả các hóa đơn bán lẻ đã xuất tại quầy |
| `GET` | `/:id` | Đăng nhập | Xem chi tiết 1 hóa đơn bán lẻ (kèm danh sách thuốc, đơn giá, người bán, khách hàng) |
| `POST` | `/` | `QUAN_LY`, `NHAN_VIEN` | Tạo mới hóa đơn bán lẻ tại quầy. Hệ thống tự động tìm các lô thuốc cận hạn nhất để trừ kho (FEFO) và ghi lịch sử xuất kho |

---

## 8. Đơn thuốc Bác sĩ kê toa (`/api/don-thuoc`)

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `GET` | `/` | Đăng nhập | Xem danh sách các đơn thuốc do bác sĩ kê toa được lưu trong hệ thống |
| `POST` | `/` | `QUAN_LY`, `NHAN_VIEN` | Tạo đơn thuốc mới (tên bệnh nhân, tên bác sĩ, danh sách thuốc kèm liều dùng cụ thể) |
| `PATCH` | `/:id/trang-thai` | `QUAN_LY` | Quản lý phê duyệt hoặc thay đổi trạng thái của đơn thuốc kê toa |

---

## 9. Trợ lý Trí tuệ nhân tạo AI AINA (`/api/goi-y-ai`)

Tích hợp đa mô hình thông minh (Groq Llama 3.3, Google Gemini, Rule-based nội bộ) có kiểm duyệt y tế và phát hiện nguy kịch.

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `POST` | `/hoi` | Public / Khách | Hỏi đáp tư vấn sức khỏe & triệu chứng với AI AINA. Hỗ trợ multi-turn conversation nhớ ngữ cảnh 5 câu hỏi gần nhất |
| `POST` | `/hoi-groq` | Public / Khách | Hỏi đáp với kênh AI chuyên sâu sử dụng mô hình Groq LLaMA |
| `POST` | `/hoi-noi-bo` | `QUAN_LY`, `NHAN_VIEN` | Dược sĩ hỏi AI trợ lý nội bộ để tra cứu tương tác thuốc và tồn kho |
| `GET` | `/lich-su-chat` | `QUAN_LY`, `NHAN_VIEN` | Xem toàn bộ lịch sử tư vấn AI của khách hàng. Tự động gắn cờ cảnh báo các ca nguy kịch (sốt cao, co giật, ngộ độc, quá liều...) |
| `DELETE` | `/lich-su-chat/:id` | `QUAN_LY` | Xóa một đoạn hội thoại chat AI |
| `DELETE` | `/lich-su-chat/tat-ca` | `QUAN_LY` | Dọn dẹp toàn bộ dữ liệu lịch sử chat AI |
| `GET` | `/` | `QUAN_LY`, `NHAN_VIEN` | Lấy danh sách các đề xuất AI về kho (thuốc sắp hết hạn, tồn kho thấp, gợi ý nhập hàng) |
| `POST` | `/tao-tu-dong` | `QUAN_LY`, `NHAN_VIEN` | Kích hoạt AI phân tích dữ liệu kho và tự sinh gợi ý chiến lược nhập hàng |
| `POST` | `/tao-noi-bo` | `QUAN_LY`, `NHAN_VIEN` | Tạo gợi ý quản lý kho dựa trên thuật toán phân tích nội bộ |
| `POST` | `/:id/duyet` | `QUAN_LY` | Quản lý phê duyệt một gợi ý chiến lược của AI |
| `GET` | `/he-thong` | `QUAN_LY`, `NHAN_VIEN` | Giám sát độ chính xác của AI, tốc độ phản hồi và nhật ký hoạt động |

---

## 10. Tư vấn Trực tuyến Khách - Dược sĩ (`/api/tu-van`)

Kênh giao tiếp thời gian thực (Realtime chat qua Socket.io) và trao đổi hình ảnh toa thuốc (Cloudinary).

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `POST` | `/bat-dau` | Khách hàng | Khách hàng mở phiên chat tư vấn với Dược sĩ |
| `GET` | `/danh-sach` | `QUAN_LY`, `NHAN_VIEN` | Dược sĩ xem danh sách các phiên tư vấn đang chờ hoặc đang hỗ trợ |
| `POST` | `/nhan-phien/:id` | `QUAN_LY`, `NHAN_VIEN` | Dược sĩ tiếp nhận phụ trách phiên tư vấn với khách |
| `GET` | `/lich-su/:phienId` | Đăng nhập | Tải toàn bộ nội dung tin nhắn và hình ảnh trong một phiên chat |
| `POST` | `/khach-hang-ket-thuc` | Khách hàng | Khách hàng chủ động bấm kết thúc phiên tư vấn |
| `POST` | `/ket-thuc/:id` | Đăng nhập | Dược sĩ / Quản lý đóng phiên tư vấn kèm lý do |
| `GET` | `/tat-ca-lich-su` | `QUAN_LY` | Quản lý tra cứu toàn bộ lịch sử tư vấn (lọc theo từ khóa, ngày, phiên có gửi ảnh) |
| `DELETE` | `/xoa-phien/:id` | `QUAN_LY` | Xóa vĩnh viễn phiên tư vấn và tự động dọn sạch các file ảnh trên Cloudinary |

---

## 11. Nhà cung cấp Dược phẩm (`/api/nha-cung-cap`)

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `GET` | `/` | `QUAN_LY` | Lấy danh sách nhà cung cấp (hỗ trợ tìm kiếm theo mã, tên, SĐT, email, người liên hệ) |
| `POST` | `/` | `QUAN_LY` | Thêm mới một đơn vị nhà cung cấp thuốc |
| `PATCH` | `/:id` | `QUAN_LY` | Sửa đổi thông tin liên hệ, địa chỉ, ghi chú của nhà cung cấp |
| `DELETE` | `/:id` | `QUAN_LY` | Xóa nhà cung cấp khỏi hệ thống |

---

## 12. Báo cáo & Thống kê Doanh thu (`/api/bao-cao`)

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `GET` | `/doanh-thu` | `QUAN_LY` | Tổng hợp số lượng hóa đơn và tổng doanh thu bán lẻ tích lũy |
| `GET` | `/export/excel` | Đăng nhập | Xuất file Excel (.xlsx) danh sách hóa đơn bán hàng theo khoảng thời gian |
| `GET` | `/export/pdf` | Đăng nhập | Tạo và xuất file PDF (.pdf) báo cáo doanh thu có bảng biểu, định dạng in ấn chuyên nghiệp |

---

## 13. Nhật ký Hệ thống Audit Logs (`/api/nhat-ky`)

| Phương thức | Đường dẫn | Phân quyền | Mô tả chi tiết |
|:---|:---|:---|:---|
| `GET` | `/` | `QUAN_LY` | Xem nhật ký hoạt động (lọc theo loại hành động: `TAO`, `CAP_NHAT`, `XOA`, `NHAP_KHO`... và theo đối tượng `THUOC`, `LO_TON_KHO`, `HOA_DON`...) |
| `POST` | `/` | Đăng nhập | Ghi thêm một bản ghi hành vi vào nhật ký kiểm toán hệ thống |

---

## 🔒 Danh mục Mã trạng thái HTTP thường gặp

- `200 OK`: Yêu cầu xử lý thành công, trả về dữ liệu.
- `201 Created`: Tạo mới thành công (đơn hàng, thuốc, người dùng, lô kho...).
- `400 Bad Request`: Thiếu dữ liệu đầu vào hoặc định dạng dữ liệu không hợp lệ.
- `401 Unauthorized`: Chưa đăng nhập hoặc Token JWT hết hạn / không hợp lệ.
- `403 Forbidden`: Tài khoản không đủ quyền truy cập (ví dụ: Nhân viên truy cập tài nguyên của Quản lý).
- `404 Not Found`: Không tìm thấy bản ghi (thuốc, đơn hàng, tài khoản).
- `409 Conflict`: Dữ liệu bị trùng lặp (email, số điện thoại, mã thuốc, mã nhà cung cấp đã tồn tại).
- `500 Internal Server Error`: Lỗi phát sinh từ máy chủ.