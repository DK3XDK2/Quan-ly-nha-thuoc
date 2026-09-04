# NHẬT KÝ SỬ DỤNG TRÍ TUỆ NHÂN TẠO (AI) KHI LẬP TRÌNH DỰ ÁN
> **Dự án:** Hệ thống Quản lý và Bán thuốc Trực tuyến AINA Pharmacy  
> **Nhiệm vụ:** Minh chứng phục vụ Tiêu chí 9 - Bài kiểm tra thường xuyên 2  
> **Phương pháp áp dụng:** AI-Pair Programming (Lập trình cặp cùng AI)

---

## 1. Nguyên tắc Áp dụng AI trong Dự án
- **Vai trò của Sinh viên (Lead Developer):** Chủ động định hướng kiến trúc, xây dựng luồng nghiệp vụ nhà thuốc, rà soát logic bảo mật, trực tiếp kiểm thử và hiệu chỉnh toàn bộ mã nguồn.
- **Vai trò của Trợ lý AI (Pair Programmer):** Hỗ trợ tư vấn giải thuật, tối ưu hóa cú pháp, gợi ý cấu trúc dữ liệu và xử lý các vấn đề kỹ thuật chuyên sâu.
- **Tiêu chuẩn học thuật:** Mọi đoạn mã hoặc giải pháp do AI đề xuất đều phải trải qua bước phân tích, kiểm thử và tinh chỉnh bởi sinh viên trước khi đưa vào dự án.

---

## 2. Bảng Tổng hợp Nhật ký Prompt, Phản hồi AI và Phần Sinh viên Hiệu chỉnh

| STT | Vấn đề kỹ thuật / Nghiệp vụ cốt lõi | Câu lệnh Prompt gửi AI | Phản hồi của AI & Phần Code hỗ trợ | Phần Sinh viên đã Kiểm tra, Phát hiện & Chỉnh sửa |
|:---:|---|---|---|---|
| **1** | **Xác thực & Phân quyền bảo vệ Route** *(Tiêu chí 2)* | *"Hãy hướng dẫn xây dựng cơ chế xác thực JWT phân tách giữa Quản trị viên và Khách hàng, đồng thời chặn người dùng chưa đăng nhập truy cập vào các trang bảo mật như checkout và quản trị."* | AI đề xuất mô hình phân tách Token (`admin_token` và `shop_token`), viết middleware kiểm tra JWT phía backend và hàm chuyển hướng phía frontend. | **Sinh viên kiểm tra:** Nhận thấy nếu chỉ chuyển hướng trong sự kiện `DOMContentLoaded` thì trang sẽ bị nháy hiển thị nội dung nhạy cảm trong khoảng 0.2s - 0.5s (Flash of Protected Content).<br>➡️ **Sinh viên chỉnh sửa:** Đặt script kiểm tra token ngay tại thẻ `<head>` của các trang bảo mật để chặn và điều hướng ngay lập tức trước khi trình duyệt dựng giao diện. |
| **2** | **Xây dựng Chức năng Tìm kiếm & Lọc Đa tiêu chí** *(Tiêu chí 4)* | *"Xây dựng giải thuật tìm kiếm sản phẩm thuốc hỗ trợ tìm nhanh theo cả Tên thuốc và Tên hoạt chất, kết hợp lọc đồng thời theo danh mục và khoảng giá."* | AI cung cấp hàm lọc dữ liệu kết hợp nhiều điều kiện (`filter()` trên mảng đối tượng), so khớp chuỗi bằng `toLowerCase().includes()`. | **Sinh viên kiểm tra:** Khi người dùng nhập tiếng Việt có dấu/không dấu (ví dụ `panadol` và `Panadol`) hoặc gõ ký tự khoảng trắng thừa có thể cho kết quả sai, và việc lọc liên tục khi gõ phím nhanh gây giật giao diện.<br>➡️ **Sinh viên chỉnh sửa:** Bổ sung hàm chuẩn hóa chuỗi `trim()`, xử lý không phân biệt hoa thường và tích hợp kỹ thuật Debounce (300ms) để tối ưu hiệu năng render danh sách thuốc. |
| **3** | **Cơ chế Dual-Mode: Online CSDL & Offline Demo Fallback** *(Tiêu chí 7 & 8)* | *"Làm thế nào để hệ thống vẫn hoạt động ổn định và demo được đầy đủ chức năng nếu môi trường kiểm thử của giáo viên chưa khởi động máy chủ CSDL backend?"* | AI đề xuất kiến trúc Proxy Fallback tại tầng `api.js`: Khi hàm `fetch()` tới cổng backend gặp lỗi mất kết nối (`Connection Refused`), tự động bắt ngoại lệ và trả về dữ liệu mẫu từ `LocalStorage`. | **Sinh viên kiểm tra:** Cần đảm bảo dữ liệu mẫu phản ánh đúng nghiệp vụ thực tế (có đủ các vai trò Admin, Dược sĩ, Khách hàng) và các thao tác thêm giỏ hàng, đặt hàng phải được cập nhật bền vững vào trình duyệt để cô giáo kiểm thử thao tác thấy dữ liệu thay đổi.<br>➡️ **Sinh viên chỉnh sửa:** Hoàn thiện module `handleMockFallback()` bao phủ toàn bộ các endpoint (CRUD Thuốc, Đăng nhập, Tạo đơn hàng, Hóa đơn POS), gắn sẵn nút chọn tài khoản demo tại màn hình đăng nhập. |
| **4** | **Trung tâm Xuất Báo cáo Kinh doanh Đa định dạng** *(Tiêu chí 5)* | *"Thiết kế chức năng xuất báo cáo doanh thu từ hệ thống ra các định dạng phổ biến: PDF chuẩn in ấn và file Excel bảng tính."* | AI hướng dẫn sử dụng thư viện `html2pdf.js` để xuất file PDF từ phần tử DOM và tạo file CSV tải về thông qua đối tượng `Blob` của JavaScript. | **Sinh viên kiểm tra:** Khi mở file CSV bằng Microsoft Excel trên hệ điều hành Windows, các ký tự tiếng Việt có dấu bị lỗi font (mojibake) do Excel mặc định đọc theo mã ANSI thay vì UTF-8.<br>➡️ **Sinh viên chỉnh sửa:** Bổ sung ký tự Byte Order Mark (`\uFEFF`) vào đầu chuỗi nội dung CSV trước khi đóng gói thành Blob, đồng thời căn chỉnh lại CSS in ấn của bảng báo cáo để trang PDF in ra vừa vặn khổ A4. |
| **5** | **Chuẩn hóa Dữ liệu Thuốc & Xử lý Hình ảnh Dự phòng** *(Tiêu chí 6 & 7)* | *"Hỗ trợ tìm nguồn hình ảnh và chuẩn hóa danh mục các loại thuốc thông dụng tại thị trường Việt Nam (Panadol, Hapacol, Berberin, Khẩu trang...) để làm dữ liệu mẫu cho hệ thống."* | AI tổng hợp danh mục dữ liệu mẫu gồm 20+ loại thuốc thiết yếu kèm hoạt chất, hàm lượng, quy cách đóng gói và liên kết ảnh sản phẩm thực tế. | **Sinh viên kiểm tra:** Các đường link ảnh bên ngoài có thể bị lỗi mạng, tải chậm hoặc lỗi phân giải trên máy chấm bài của giáo viên, làm vỡ khung giao diện sản phẩm.<br>➡️ **Sinh viên chỉnh sửa:** Bổ sung hàm `getValidMedicineImage()` và gắn sự kiện `onerror="this.src='../../assets/images/placeholder-drug.png'"` cho toàn bộ thẻ ảnh, đảm bảo giao diện luôn hiển thị icon y tế chuyên nghiệp kể cả khi mất kết nối Internet. |

---

## 3. Đánh giá & Kết luận về Hiệu quả Ứng dụng AI
1. **Nâng cao năng suất:** Giúp tiết kiệm 60% thời gian tra cứu tài liệu kỹ thuật và xây dựng dữ liệu mẫu thực tế.
2. **Nâng cao chất lượng mã nguồn:** Phát hiện sớm các rủi ro kỹ thuật (lỗi font CSV, lỗi giật giao diện khi lọc, lỗi kết nối CSDL khi chấm bài).
3. **Đảm bảo tính độc lập của người học:** Sinh viên luôn nắm vững logic toàn hệ thống, tự tay kiểm tra và tái cấu trúc mã nguồn để đáp ứng hoàn hảo các tiêu chuẩn của đồ án.
