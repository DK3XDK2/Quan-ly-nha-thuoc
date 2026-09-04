# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN AINA PHARMACY
> **Tài liệu phục vụ: Tiêu chí 10 - Bài kiểm tra thường xuyên 2**

---

## 1. Yêu cầu Môi trường
- **Node.js:** Phiên bản 18 trở lên (Khuyến nghị Node.js 20.x hoặc 22.x LTS).
- **Trình duyệt:** Chrome, Edge, Firefox hoặc Safari phiên bản mới.
- **Hệ quản trị CSDL (Tùy chọn):** MySQL 8.0 trở lên (Chỉ cần nếu muốn chạy trọn gói Backend).

---

## 2. Cách 1: Chạy Demo Nhanh (Offline Mode - KHÔNG CẦN CÀI DATABASE)
> 💡 *Dành cho Giáo viên chấm bài hoặc kiểm tra nhanh toàn bộ giao diện và chức năng mà không cần cài đặt MySQL server.*

1. Mở terminal tại thư mục `frontend`:
   ```bash
   cd frontend
   npm run dev
   ```
2. Mở trình duyệt truy cập: **`http://localhost:3000`**
3. **Trải nghiệm đầy đủ hệ thống:**
   - Xem danh sách thuốc với ảnh sản phẩm thật của Việt Nam (Long Châu, An Khang).
   - Tìm kiếm, lọc theo danh mục, lọc theo giá, xem chi tiết sản phẩm.
   - Thêm vào giỏ hàng, đặt hàng, quản lý đơn hàng.
   - Bấm vào nút **"Quản trị"** góc phải trên cùng để vào cổng Admin.
   - Tại màn hình đăng nhập, click vào các tài khoản gợi ý sẵn để đăng nhập tức thì mà không cần nhớ mật khẩu.

---

## 3. Cách 2: Chạy Toàn diện Cả Frontend & Backend (Online Mode với Database)

### Bước 1: Khởi tạo Cơ sở Dữ liệu (Backend)
1. Di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Cấu hình file `.env`:
   - Sao chép từ `.env.example`:
     ```bash
     cp .env.example .env
     ```
   - Chỉnh sửa đường dẫn kết nối MySQL của bạn trong `.env`:
     ```env
     DATABASE_URL="mysql://root:mat_khau@localhost:3306/ql_thuoc_dev"
     ```
4. Đồng bộ bảng CSDL và tạo dữ liệu mẫu:
   ```bash
   npx prisma db push
   node seed.js
   ```
5. Khởi động Backend API Server (Port 4000):
   ```bash
   npm run dev
   ```
   *Màn hình hiển thị: "May chu chạy tới cổng 4000 - Socket.io đã sẵn sàng!" là thành công.*

### Bước 2: Khởi động Giao diện Người dùng (Frontend)
1. Mở một cửa sổ terminal mới, di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   npm run dev
   ```
2. Mở trình duyệt truy cập: **`http://localhost:3000`**

---

## 4. Danh sách Tài khoản Demo Đã Tạo Sẵn

| Phân hệ | Vai trò | Email đăng nhập | Mật khẩu | Chức năng chính |
|---|---|---|:---:|---|
| **Quản trị viên** | `ADMIN` (`QUAN_LY`) | `admin@ainapharmacy.com` | `123456` | Toàn quyền quản trị hệ thống, nhân viên, kho, xuất báo cáo doanh thu PDF/Excel/Word. |
| **Dược sĩ** | `PHARMACIST` (`DUOC_SI`) | `pharmacist@ainapharmacy.com` | `123456` | Bán hàng tại quầy POS, tra cứu thuốc, xử lý đơn hàng. |
| **Khách hàng 1** | `KHACH_HANG` | `customer@ainapharmacy.com` | `123456` | Đặt hàng trực tuyến, giỏ hàng, xem trạng thái đơn cá nhân. |
| **Khách hàng 2** | `KHACH_HANG` | `demo@ainapharmacy.com` | `123456` | Tài khoản khách hàng phụ. |

---

## 5. Cấu trúc Thư mục Dự án

```text
Quanlythuoc-main/
├── backend/                  # Mã nguồn REST API Backend (Node.js/Express)
│   ├── prisma/               # Schema định nghĩa CSDL và migrations
│   ├── src/                  # Controllers, Routes, Services, Middlewares
│   ├── seed.js               # Script nạp dữ liệu mẫu ban đầu
│   └── package.json
├── frontend/                 # Mã nguồn Giao diện Người dùng
│   ├── assets/               # Hình ảnh, logo, tài nguyên tĩnh
│   ├── css/                  # CSS Stylesheet (Modern Design)
│   ├── js/                   # Xử lý logic nghiệp vụ, API client, Offline Mock
│   ├── pages/
│   │   ├── admin/            # Quản trị: Dashboard, POS, Báo cáo, Kho, Thuốc
│   │   ├── customer/         # Khách hàng: Giỏ hàng, Tài khoản, Thanh toán
│   │   └── public/           # Công khai: Trang chủ Shop, Chi tiết, Đăng nhập
│   └── serve.json            # Cấu hình máy chủ tĩnh & URL rewrites
├── database/                 # Thư mục Cơ sở dữ liệu
│   ├── schema.sql            # Bản xuất DDL CSDL MySQL đầy đủ
│   └── README.md             # Hướng dẫn chi tiết về cấu trúc CSDL
├── docs/                     # Tài liệu học phần & Báo cáo
│   ├── NHAT_KY_SU_DUNG_AI.md # Nhật ký Prompt, phản hồi & chỉnh sửa của SV
│   └── HUONG_DAN_CAI_DAT_VA_CHAY.md
├── .env.example              # Mẫu cấu hình biến môi trường
├── HUONG_DAN_CHAM_BAI.md     # Bản tóm tắt nhanh cho Giảng viên chấm thi
└── README.md                 # Tài liệu Báo cáo Toàn diện Dự án
```
