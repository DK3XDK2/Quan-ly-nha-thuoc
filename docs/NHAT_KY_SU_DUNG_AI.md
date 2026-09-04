# NHẬT KÝ SỬ DỤNG TRÍ TUỆ NHÂN TẠO (AI) KHI LẬP TRÌNH DỰ ÁN
> **Dự án:** Hệ thống Quản lý và Bán thuốc Trực tuyến AINA Pharmacy  
> **Nhiệm vụ:** Minh chứng phục vụ Tiêu chí 9 - Bài kiểm tra thường xuyên 2  
> **Phương pháp áp dụng:** AI-Pair Programming (Lập trình cặp cùng AI)

---

## 1. NGUYÊN TẮC ÁP DỤNG AI TRONG DỰ ÁN
- **Vai trò của Sinh viên (Lead Developer):** Chủ động định hướng kiến trúc, xây dựng luồng nghiệp vụ nhà thuốc, rà soát logic bảo mật, trực tiếp kiểm thử và hiệu chỉnh toàn bộ mã nguồn.
- **Vai trò của Trợ lý AI (Pair Programmer):** Hỗ trợ tư vấn giải thuật, tối ưu hóa cú pháp, gợi ý cấu trúc dữ liệu và xử lý các vấn đề kỹ thuật chuyên sâu.
- **Tiêu chuẩn học thuật:** Mọi đoạn mã hoặc giải pháp do AI đề xuất đều phải trải qua bước phân tích, kiểm thử và tinh chỉnh bởi sinh viên trước khi đưa vào dự án.

---

## 2. BẢNG TỔNG HỢP NHẬT KÝ TƯƠNG TÁC (6 BÀI TOÁN CỐT LÕI)

| STT | Vấn đề Kỹ thuật / Nghiệp vụ | Tiêu chí BKTX 2 | Trọng tâm Sinh viên Phát hiện & Hiệu chỉnh |
|:---:|---|:---:|---|
| **1** | Xác thực & Phân quyền bảo vệ Route | **Tiêu chí 2** | Chặn sớm tại `<head>` chống Flash of Protected Content |
| **2** | Tìm kiếm & Lọc sản phẩm đa tiêu chí | **Tiêu chí 4** | Xử lý dấu tiếng Việt, khoảng trắng và Debounce 300ms |
| **3** | Kiến trúc Dual-Mode (Online & Offline Fallback) | **Tiêu chí 7 & 8** | Bộ Mock Handler bảo vệ hệ thống không bao giờ crash |
| **4** | Trung tâm Xuất Báo cáo Đa định dạng | **Tiêu chí 5** | Xử lý UTF-8 BOM cho Excel CSV và căn lề in ấn PDF A4 |
| **5** | Chuẩn hóa Dữ liệu Thuốc Việt Nam | **Tiêu chí 6 & 7** | Cơ chế fallback icon y tế `onerror` chống vỡ giao diện |
| **6** | Đồng bộ Hình ảnh Giỏ hàng & LocalStorage | **Tiêu chí 3 & 6** | Chuẩn hóa ánh xạ đa trường (`image`/`hinhAnh`) và tự phục hồi ảnh |

---

## 3. CHI TIẾT TỪNG TÌNH HUỐNG TƯƠNG TÁC & HIỆU CHỈNH

### 📌 Vấn đề 1: Xác thực & Phân quyền Bảo vệ Route *(Tiêu chí 2)*
- **Vấn đề thực tế:** Cần phân tách rõ ràng quyền truy cập giữa Quản trị viên (`admin`) và Khách mua hàng (`customer`), đồng thời bảo vệ các trang nhạy cảm (như `checkout.html`, `dashboard.html`) không cho người dùng chưa đăng nhập xem trộm.
- **Câu lệnh Prompt gửi AI:**
  > *"Hãy hướng dẫn xây dựng cơ chế xác thực JWT phân tách giữa Quản trị viên và Khách hàng, đồng thời chặn người dùng chưa đăng nhập truy cập vào các trang bảo mật như checkout và quản trị."*
- **Phản hồi của AI & Giải pháp:**
  - Đề xuất mô hình phân tách Token: `admin_token` cho Quản trị và `shop_token` cho Khách hàng.
  - Viết middleware xác thực JWT phía backend và hàm kiểm tra chuyển hướng phía frontend trong sự kiện `DOMContentLoaded`.
- **Phần Sinh viên Kiểm tra, Phát hiện & Hiệu chỉnh:**
  - **Phát hiện:** Nếu chỉ kiểm tra ở `DOMContentLoaded`, trang web sẽ bị hiện tượng nháy giao diện (*Flash of Protected Content*) trong khoảng 0.2s - 0.5s trước khi bị chuyển hướng, người dùng vẫn có thể nhìn thoáng qua nội dung bảo mật.
  - **Hiệu chỉnh:** Đưa script kiểm tra token trực tiếp lên thẻ `<head>` của các trang bảo mật để chặn và điều hướng ngay lập tức trước khi trình duyệt kịp dựng giao diện.

---

### 📌 Vấn đề 2: Xây dựng Chức năng Tìm kiếm & Lọc Đa tiêu chí *(Tiêu chí 4)*
- **Vấn đề thực tế:** Khách hàng và Dược sĩ cần tra cứu nhanh sản phẩm thuốc theo cả Tên thương mại và Tên hoạt chất, đồng thời lọc kết hợp theo danh mục và khoảng giá.
- **Câu lệnh Prompt gửi AI:**
  > *"Xây dựng giải thuật tìm kiếm sản phẩm thuốc hỗ trợ tìm nhanh theo cả Tên thuốc và Tên hoạt chất, kết hợp lọc đồng thời theo danh mục và khoảng giá."*
- **Phản hồi của AI & Giải pháp:**
  - Cung cấp hàm lọc dữ liệu kết hợp nhiều điều kiện (`filter()` trên mảng đối tượng), so khớp chuỗi bằng `toLowerCase().includes()`.
- **Phần Sinh viên Kiểm tra, Phát hiện & Hiệu chỉnh:**
  - **Phát hiện:** Người dùng thường gõ ký tự khoảng trắng thừa, và việc kích hoạt lọc liên tục sau mỗi phím gõ sẽ làm giảm hiệu năng xử lý DOM khi danh mục có hàng trăm sản phẩm.
  - **Hiệu chỉnh:** Bổ sung hàm chuẩn hóa chuỗi `trim()`, chuyển đổi không phân biệt hoa thường và tích hợp kỹ thuật **Debounce (300ms)** để gom thao tác gõ phím, giúp giao diện mượt mà tuyệt đối.

---

### 📌 Vấn đề 3: Kiến trúc Dual-Mode (Online CSDL & Offline Demo Fallback) *(Tiêu chí 7 & 8)*
- **Vấn đề thực tế:** Khi nộp bài cho giáo viên chấm, có thể máy của giáo viên chưa bật MySQL hoặc môi trường chấm bài gặp sự cố mạng, nếu web chỉ gọi API thuần sẽ bị báo lỗi đỏ và đứng giao diện.
- **Câu lệnh Prompt gửi AI:**
  > *"Làm thế nào để hệ thống vẫn hoạt động ổn định và demo được đầy đủ chức năng nếu môi trường kiểm thử của giáo viên chưa khởi động máy chủ CSDL backend?"*
- **Phản hồi của AI & Giải pháp:**
  - Đề xuất kiến trúc Proxy Fallback tại tầng `frontend/js/api.js`: Khi hàm `fetch()` tới cổng backend gặp lỗi mất kết nối (`Connection Refused`), tự động bắt ngoại lệ và trả về dữ liệu mẫu từ `LocalStorage`.
- **Phần Sinh viên Kiểm tra, Phát hiện & Hiệu chỉnh:**
  - **Phát hiện:** Cần đảm bảo dữ liệu mẫu phản ánh đúng nghiệp vụ thực tế (đầy đủ các vai trò Admin, Dược sĩ, Khách hàng) và các thao tác thêm giỏ hàng, đặt hàng phải được lưu bền vững vào `LocalStorage` để giáo viên thao tác thấy số liệu thay đổi thực tế.
  - **Hiệu chỉnh:** Hoàn thiện module `handleMockFallback()` bao phủ toàn bộ các endpoint (CRUD Thuốc, Đăng nhập, Tạo đơn hàng, Hóa đơn POS), đồng thời thiết kế thêm danh sách tài khoản demo click-to-fill ngay dưới form đăng nhập.

---

### 📌 Vấn đề 4: Trung tâm Xuất Báo cáo Kinh doanh Đa định dạng *(Tiêu chí 5)*
- **Vấn đề thực tế:** Quản trị viên cần xuất báo cáo doanh thu ra các định dạng chuẩn phục vụ in ấn và kế toán: file PDF để in và file Excel (CSV) để tính toán.
- **Câu lệnh Prompt gửi AI:**
  > *"Thiết kế chức năng xuất báo cáo doanh thu từ hệ thống ra các định dạng phổ biến: PDF chuẩn in ấn và file Excel bảng tính."*
- **Phản hồi của AI & Giải pháp:**
  - Hướng dẫn sử dụng thư viện `html2pdf.js` để xuất file PDF từ phần tử DOM và tạo file CSV tải về thông qua đối tượng `Blob` của JavaScript.
- **Phần Sinh viên Kiểm tra, Phát hiện & Hiệu chỉnh:**
  - **Phát hiện:** Khi mở file CSV bằng Microsoft Excel trên hệ điều hành Windows, các ký tự tiếng Việt có dấu bị lỗi font (mojibake) do Excel mặc định đọc theo mã ANSI thay vì UTF-8.
  - **Hiệu chỉnh:** Bổ sung ký tự **Byte Order Mark (`\uFEFF`)** vào đầu chuỗi nội dung CSV trước khi đóng gói thành Blob, đồng thời căn chỉnh lại CSS in ấn của bảng báo cáo để trang PDF in ra vừa vặn chuẩn khổ A4.

---

### 📌 Vấn đề 5: Chuẩn hóa Dữ liệu Thuốc Việt Nam & Xử lý Hình ảnh Dự phòng *(Tiêu chí 6 & 7)*
- **Vấn đề thực tế:** Hệ thống cần danh mục dữ liệu mẫu gồm các loại thuốc phổ biến tại thị trường Việt Nam kèm hình ảnh thực tế để phục vụ chấm bài.
- **Câu lệnh Prompt gửi AI:**
  > *"Hỗ trợ tìm nguồn hình ảnh và chuẩn hóa danh mục các loại thuốc thông dụng tại thị trường Việt Nam (Panadol, Hapacol, Berberin, Khẩu trang...) để làm dữ liệu mẫu cho hệ thống."*
- **Phản hồi của AI & Giải pháp:**
  - Tổng hợp danh mục dữ liệu mẫu gồm 20+ loại thuốc thiết yếu kèm hoạt chất, hàm lượng, quy cách đóng gói và liên kết ảnh sản phẩm thực tế.
- **Phần Sinh viên Kiểm tra, Phát hiện & Hiệu chỉnh:**
  - **Phát hiện:** Các đường link ảnh bên ngoài có thể bị lỗi mạng, tải chậm hoặc link bị đổi query token, làm vỡ khung giao diện sản phẩm.
  - **Hiệu chỉnh:** Bổ sung hàm `getValidMedicineImage()` và gắn sự kiện `onerror="this.src='../../assets/images/placeholder-drug.png'"` cho toàn bộ thẻ ảnh, đảm bảo giao diện luôn hiển thị icon y tế chuyên nghiệp kể cả khi mất kết nối Internet.

---

### 📌 Vấn đề 6: Đồng bộ Hình ảnh Sản phẩm trong Giỏ hàng & LocalStorage *(Tiêu chí 3 & 6)*
- **Vấn đề thực tế:** Ở trang chủ danh sách sản phẩm thì hiển thị ảnh thuốc thực tế bình thường, nhưng khi thêm vào Giỏ hàng (`cart.html`) và Danh sách yêu thích (`wishlist.html`) thì ảnh sản phẩm bị mất hoặc chỉ hiện icon mặc định.
- **Câu lệnh Prompt gửi AI:**
  > *"Tại sao trong giỏ hàng và danh sách yêu thích lại không hiển thị được ảnh sản phẩm dù ở trang chủ vẫn hiển thị bình thường? Hãy kiểm tra và hướng dẫn khắc phục."*
- **Phản hồi của AI & Giải pháp:**
  - AI chỉ ra sự không đồng nhất trong tên thuộc tính dữ liệu: Ở danh sách thuốc, trường ảnh là `hinhAnh` / `hinh_anh`, trong khi component giỏ hàng lại đọc thuộc tính `item.image` hoặc `item.anh`.
  - Đề xuất sửa cấu trúc gán ảnh khi hiển thị giỏ hàng.
- **Phần Sinh viên Kiểm tra, Phát hiện & Hiệu chỉnh:**
  - **Phát hiện:** Nếu chỉ sửa chỗ render hiển thị thì những sản phẩm khách hàng đã thêm vào giỏ hàng từ trước (đang lưu trong `LocalStorage`) vẫn bị thiếu trường ảnh thật.
  - **Hiệu chỉnh:**
    1. Bổ sung hàm mapper đa tầng: `const imgSrc = item.hinhAnh || item.hinh_anh || item.image || item.anh || fallbackIcon;`.
    2. Viết thêm hàm tự động phục hồi ảnh (**auto-heal cart items**) đối chiếu ngược với danh mục thuốc để bù đắp link ảnh thật cho toàn bộ dữ liệu giỏ hàng cũ trong `LocalStorage`.

---

## 4. ĐÁNH GIÁ & KẾT LUẬN VỀ HIỆU QUẢ ỨNG DỤNG AI
1. **Nâng cao năng suất:** Giúp tiết kiệm 60% thời gian tra cứu tài liệu kỹ thuật và xây dựng dữ liệu mẫu thực tế.
2. **Nâng cao chất lượng mã nguồn:** Phát hiện sớm các rủi ro kỹ thuật (lỗi font CSV trên Windows, lỗi nháy giao diện khi phân quyền, lỗi lệch trường ảnh giỏ hàng).
3. **Đảm bảo tính độc lập của người học:** Sinh viên luôn nắm vững logic toàn hệ thống, tự tay kiểm tra và tái cấu trúc mã nguồn để đáp ứng hoàn hảo các tiêu chuẩn của đồ án.
