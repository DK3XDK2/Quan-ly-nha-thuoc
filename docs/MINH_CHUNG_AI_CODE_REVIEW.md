# BÁO CÁO MINH CHỨNG: ỨNG DỤNG AI ĐỂ CODE REVIEW VÀ REFACTOR HỆ THỐNG
**Hệ thống:** AINA Pharmacy (Quản lý Nhà thuốc & Trợ lý Dược sĩ Số)  
**Nội dung:** Minh chứng Tiêu chí 9 (Review code và cải thiện chất lượng bằng AI - phát hiện lỗi, refactor, cải thiện bảo mật).

---

## 1. TỔNG QUAN
Trong quá trình xây dựng và vận hành dự án, công cụ AI Coding Assistant đã được tích hợp như một "Senior Pair Programmer" để rà soát mã nguồn (code review), phát hiện lỗi tiềm ẩn ở tầng cơ sở dữ liệu, tối ưu hóa kiến trúc xử lý lỗi và củng cố bảo mật hệ thống.

Dưới đây là 4 case study thực tế minh chứng cho việc sử dụng AI để phát hiện và khắc phục lỗi nghiêm trọng:

---

## 2. CÁC CASE STUDY CODE REVIEW & REFACTOR THỰC TẾ

### 🔍 CASE 1: PHÁT HIỆN LỖI SAI ENUM PRISMA GÂY SẬP TRANSACTION HÓA ĐƠN
* **Vị trí file:** `backend/src/routes/hoa_don.js`
* **Vấn đề phát hiện bởi AI:**
  Khi thanh toán tại quầy POS, hệ thống ghi nhận lịch sử xuất kho với đoạn code:
  ```javascript
  // Code cũ:
  await coSoDuLieu.lichSuXuatKho.create({
    data: {
      ...
      liDoXuat: "BAN_TAI_QUAY", // ❌ LỖI NGHIÊM TRỌNG
    }
  });
  ```
  AI đã đối chiếu file schema `backend/prisma/schema.prisma` và chỉ ra:
  ```prisma
  enum LiDoXuat {
    BAN_HANG
    HU_HANG
    KIEM_KE
    HET_HAN
  }
  ```
  Giá trị `"BAN_TAI_QUAY"` hoàn toàn không tồn tại trong enum của database. Khi thực thi câu lệnh, Prisma ORM ném ngoại lệ làm sập transaction, trả về HTTP 400.
* **Giải pháp Refactor từ AI:**
  * Sửa enum về chuẩn `"BAN_HANG"`.
  * Trả về chi tiết `include: { thuoc: true, khachHang: true, nguoiTao: true }` để hóa đơn hiển thị đầy đủ tên thuốc thật thay vì hiển thị id tạm thời `Thuốc #157`.

---

### 🔍 CASE 2: PHÁT HIỆN KIẾN TRÚC BẮT LỖI SAI TRÊN FRONTEND (MOCK FALLBACK MASKING)
* **Vị trí file:** `frontend/js/api.js`
* **Vấn đề phát hiện bởi AI:**
  Trong hàm `request()` của `api.js`:
  ```javascript
  // Code cũ:
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(message); // Ném lỗi HTTP 400, 403, 500
    }
    return await response.json();
  } catch (error) {
    // ❌ LỖI: Bắt chung tất cả lỗi kể cả lỗi nghiệp vụ từ server
    return handleMockFallback(endpoint, options); 
  }
  ```
  Hậu quả: Khi server trả về lỗi nghiệp vụ (hết hàng, sai dữ liệu), frontend lại bắt nhầm thành lỗi mất kết nối và tự động kích hoạt chế độ "Demo Mock", sinh ra hóa đơn ảo với giá 65.000đ mà không hề lưu vào database!
* **Giải pháp Refactor từ AI:**
  Tách riêng biệt **Lỗi kết nối mạng (Network failure)** và **Lỗi phản hồi HTTP từ server**:
  ```javascript
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    // Chỉ fallback khi không thể kết nối tới server (offline)
    return handleMockFallback(endpoint, options);
  }

  const data = await response.json();
  if (!response.ok) {
    // Ném lỗi nghiệp vụ rõ ràng để UI hiển thị thông báo chính xác
    throw new Error(data.thongBao || `Lỗi máy chủ (${response.status})`);
  }
  return data;
  ```

---

### 🔍 CASE 3: TỐI ƯU HẠ TẦNG AI - CHUYỂN ĐỔI MODEL VÀ DỰ PHÒNG TỰ ĐỘNG
* **Vị trí file:** `backend/src/services/groq.js` & `backend/.env`
* **Vấn đề phát hiện bởi AI:**
  API Key Groq mới được nạp vào hệ thống nhưng liên tục báo lỗi:
  ```json
  { "error": { "message": "The model `llama-3.3-70b-versatile` does not exist...", "code": "model_not_found" } }
  ```
  AI đã chủ động viết script truy vấn endpoint `/models` của Groq để kiểm tra danh sách mô hình còn hoạt động, phát hiện phía Groq đã đổi chính sách các dòng LLaMA 3.3 cũ trên key này.
* **Giải pháp Refactor từ AI:**
  * Cấu hình chuyển sang model **`openai/gpt-oss-120b`** (Model mã nguồn mở cực mạnh, hỗ trợ tiếng Việt xuất sắc).
  * Xây dựng cơ chế fallback 2 cấp độ: Thử nghiệm 120B ➔ Nếu quá tải/lỗi tự động chuyển sang bản gọn nhẹ `openai/gpt-oss-20b` ➔ Nếu vẫn lỗi chuyển sang Gemini Flash ➔ AI Rule-based.

---

### 🔍 CASE 4: REFACTOR QUYỀN TRUY CẬP (ACCESS CONTROL) CHO CHATBOT TƯ VẤN KHÁCH HÀNG
* **Vị trí file:** `backend/src/routes/goi_y_ai.js`
* **Vấn đề phát hiện bởi AI:**
  Route `/api/goi-y-ai/hoi` sử dụng middleware `xacThucTruyCap` bắt buộc phải có token đăng nhập (`Bearer <token>`). Khi khách vãng lai (Guest) vào xem website và bấm chat với AINA, request bị chặn đứng với mã lỗi `401 Unauthorized`.
* **Giải pháp Refactor từ AI:**
  Viết middleware linh hoạt `xacThucTuyChon`:
  * Nếu có token: Xác minh danh tính, trích xuất thông tin người dùng để ghi nhật ký chat (`lich_su_chat`).
  * Nếu không có token (khách vãng lai): Gán `req.nguoiDung = null` nhưng vẫn cho phép tiếp tục luồng tư vấn bình thường.

---

## 3. ĐÁNH GIÁ BẢO MẬT & CHẤT LƯỢNG SAU KHI DÙNG AI REVIEW

1. **Bảo vệ Secret & API Key:**
   * Toàn bộ `GEMINI_API_KEY`, `GROQ_API_KEY`, `KHOA_BI_MAT_JWT`, `DATABASE_URL` được lưu trong file `.env` ở backend.
   * File `.env` được đưa vào `.gitignore`, không bao giờ commit lên repository công khai.
2. **Ngăn chặn SQL Injection & Dữ liệu giả mạo:**
   * Sử dụng Prisma ORM với Parametrized Query tự động.
   * Input câu hỏi của khách hàng được validate cắt tỉa (`trim()`, kiểm tra độ dài) trước khi đưa vào prompt.
3. **Độ ổn định hệ thống (Reliability):**
   * Không còn tình trạng crash server đột ngột khi model AI bên ngoài bị nghẽn mạng hay quá tải.
