# NHẬT KÝ SỬ DỤNG TRÍ TUỆ NHÂN TẠO (AI) KHI LẬP TRÌNH DỰ ÁN
> **Hệ thống Quản lý Nhà thuốc AINA Pharmacy**  
> **Minh chứng phục vụ: Tiêu chí 9 - Bài kiểm tra thường xuyên 2**

---

## 1. Phương pháp Áp dụng: AI-Pair Programming
Trong suốt quá trình phát triển hệ thống, sinh viên đóng vai trò là **Kỹ sư chính (Lead Engineer)** chịu trách nhiệm ra quyết định kiến trúc, kiểm tra tính đúng đắn và an toàn nghiệp vụ y tế. AI đóng vai trò là **Trợ lý lập trình cặp (Pair Programmer)** hỗ trợ tra cứu giải thuật, tối ưu hóa CSS/JS, phát hiện lỗi biên dịch và tạo dữ liệu mẫu thực tế.

---

## 2. Bảng Tổng hợp Nhật ký Prompt, Phản hồi AI và Phần Sinh viên Hiệu chỉnh

| STT | Vấn đề phát sinh thực tế | Câu lệnh Prompt gửi AI | Phản hồi của AI & Phần Code hỗ trợ | Phần Sinh viên đã Kiểm tra, Phát hiện & Chỉnh sửa |
|:---:|---|---|---|---|
| **1** | **Xử lý hình ảnh thuốc Việt Nam thực tế** | *"Vui lòng tìm giúp tớ ảnh thuốc Việt Nam và phải đúng với tên thuốc, lấy link ảnh thực tế chứ không tạo ảnh AI vì tốn token."* | AI tìm kiếm và trả về danh sách link ảnh từ các chuỗi nhà thuốc lớn (Long Châu, An Khang) tương ứng với từng loại thuốc (Panadol, Hapacol, Berberin, Vitamin C...). | **Sinh viên kiểm tra:** Một số link ảnh CDN có thể bị chặn CORS hoặc thay đổi query token trong tương lai. <br>➡️ **Sinh viên chỉnh sửa:** Bổ sung hàm `getValidMedicineImage()` và gắn sự kiện `onerror="this.src=DEFAULT_ICON"` cho toàn bộ thẻ `<img>` để đảm bảo ảnh luôn hiển thị icon y tế dự phòng nếu link hỏng. |
| **2** | **Khắc phục lỗi 404 khi bấm Đăng nhập từ trang chủ** | *"Tớ thấy đường dẫn ở trang index đang bị sai khá nhiều ví dụ từ trang index mà bấm đăng nhập là nó gây lỗi 404 cậu xem rồi fix giùm tớ."* | AI phát hiện máy chủ tĩnh `serve` kích hoạt `cleanUrls`, rút gọn URL `/pages/public/index.html` thành `/pages/public` làm mất dấu gạch chéo cuối. Từ đó, thẻ `<a href="../public/shop-login.html">` bị phân giải sai thành `localhost:3000/public/shop-login.html`. | **Sinh viên kiểm tra:** Nếu chỉ sửa thẻ `<a>` thành `shop-login.html` thì khi người dùng gõ trực tiếp URL vẫn có thể bị 404. <br>➡️ **Sinh viên chỉnh sửa:** Vừa sửa thẻ `<a>`, vừa tạo thêm các thư mục alias `frontend/public/`, `frontend/admin/`, `frontend/customer/` kèm script chuyển tiếp dự phòng, và cấu hình lại `serve.json` để mọi đường dẫn đều phản hồi 200 OK. |
| **3** | **Xây dựng Chế độ Demo Offline không cần Backend** | *"Giờ cô giáo bảo tớ chuẩn bị gửi file cho cô rồi mà không cần chạy backend thì từng này dữ liệu mẫu đã đủ chưa hay cần demo thêm tài khoản và mật khẩu nữa?"* | AI đề xuất kiến trúc **Offline-first Proxy** ngay tại tầng `api.js`: Khi hàm `fetch()` tới backend port 4000 bị lỗi kết nối (`Connection Refused`), tự động bắt ngoại lệ và kích hoạt `handleMockFallback()` lấy dữ liệu từ `mock-data.js` và `LocalStorage`. | **Sinh viên kiểm tra:** Cần hỗ trợ đầy đủ các vai trò đăng nhập (Admin, Dược sĩ, Khách hàng) và lưu đơn hàng vào `LocalStorage` để cô giáo thao tác mua hàng vẫn thấy số lượng giỏ hàng và lịch sử đơn thay đổi. <br>➡️ **Sinh viên chỉnh sửa:** Thêm danh sách tài khoản mẫu click-to-fill ngay dưới form đăng nhập, hoàn thiện Mock Handler cho toàn bộ các endpoint (`/api/thuoc`, `/api/xac-thuc/dang-nhap`, `/api/don-hang/dat-hang`). |
| **4** | **Sửa lỗi cú pháp Reserved Keyword trong JavaScript** | *"Sửa lỗi IDE báo 'delete' cannot be called on an identifier in strict mode ở file api.js"* | AI giải thích từ khóa `delete` là từ khóa dành riêng (reserved word) trong JavaScript strict mode khi khai báo object property shorthand hoặc identifier. | **Sinh viên kiểm tra:** Không thể xóa hàm delete vì các module khác cần gọi `API.delete('/api/...')`. <br>➡️ **Sinh viên chỉnh sửa:** Đổi tên thuộc tính thành chuỗi `"delete": function(endpoint) { ... }` và thêm chú thích `// @ts-nocheck` ở đầu file để dập tắt hoàn toàn cảnh báo sai của VS Code. |
| **5** | **Xuất báo cáo kinh doanh đa định dạng** | *"Trang báo cáo admin muốn xuất thành nhiều định dạng khác nhau thay vì mỗi PDF."* | AI cung cấp giải pháp xuất file client-side: dùng thư viện `html2pdf.js` cho PDF, Blob dữ liệu với UTF-8 BOM cho CSV/Excel, định dạng HTML application/msword cho Word, và JSON raw data. | **Sinh viên kiểm tra:** File CSV khi mở trực tiếp bằng Microsoft Excel trên Windows thường bị lỗi font tiếng Việt nếu thiếu Byte Order Mark (`\uFEFF`). <br>➡️ **Sinh viên chỉnh sửa:** Thêm tiền tố `\uFEFF` vào đầu chuỗi CSV trong `reports.js`, định dạng lại bố cục bảng in ấn để không bị tràn lề A4. |

---

## 3. Đánh giá & Kết luận về Việc Ứng dụng AI
- **Tính chủ động của sinh viên:** Toàn bộ ý tưởng nghiệp vụ, sơ đồ luồng dữ liệu, phân quyền bảo mật và các trường dữ liệu nhà thuốc đều do sinh viên thiết kế và kiểm soát.
- **Giá trị của AI:** Đóng vai trò là trợ lý đắc lực giúp tăng tốc độ tìm kiếm giải pháp, phát hiện sớm các góc khuất kỹ thuật (như cơ chế URL rewrite của web server, xử lý fallback offline, chuẩn hóa font tiếng Việt khi xuất file).
- **Tính trung thực học thuật:** Toàn bộ mã nguồn do AI hỗ trợ đều được sinh viên đọc hiểu, rà soát từng dòng, kiểm thử thực tế và hoàn thiện trước khi đưa vào sản phẩm cuối cùng.
