# Tài liệu ca sử dụng (Use Cases)
## Hệ thống Quản lý và Bán thuốc Trực tuyến — AINA Pharmacy

> Phiên bản: 1.0  
> Tác nhân: Quản lý, Nhân viên (Dược sĩ), Khách hàng, Hệ thống  
> Ánh xạ: màn hình `frontend/pages/` và API `backend/src/routes/`

---

## 1. Sơ đồ tác nhân

```text
                    ┌─────────────┐
                    │   Hệ thống  │
                    │ (cron, AI,  │
                    │  thanh toán)│
                    └──────┬──────┘
                           │
    ┌──────────┐    ┌──────┴──────┐    ┌────────────┐
    │ Quản lý  │────│  AINA       │────│ Khách hàng │
    └──────────┘    │  Pharmacy   │    └────────────┘
    ┌──────────┐    └──────┬──────┘
    │ Nhân viên│───────────┘
    └──────────┘
```

---

## 2. Danh mục ca sử dụng

| Mã | Tên | Tác nhân chính | Ưu tiên |
|----|-----|----------------|---------|
| UC-01 | Đăng nhập quản trị / nhân viên | Quản lý, Nhân viên | Cao |
| UC-02 | Đăng ký / đăng nhập khách hàng | Khách hàng | Cao |
| UC-03 | Duyệt cửa hàng và tìm thuốc | Khách, Nhân viên | Cao |
| UC-04 | Quản lý thuốc và danh mục | Quản lý, Nhân viên | Cao |
| UC-05 | Quản lý lô tồn kho | Quản lý, Nhân viên | Cao |
| UC-06 | Bán hàng POS | Nhân viên, Quản lý | Cao |
| UC-07 | Tạo và duyệt đơn thuốc | Nhân viên, Quản lý | Trung bình |
| UC-08 | Đặt hàng trực tuyến | Khách hàng | Cao |
| UC-09 | Thanh toán đơn hàng | Khách hàng, Hệ thống | Cao |
| UC-10 | Xử lý đơn hàng | Nhân viên, Quản lý | Cao |
| UC-11 | Quản lý khách hàng | Quản lý | Trung bình |
| UC-12 | Quản lý nhà cung cấp | Quản lý | Trung bình |
| UC-13 | Tư vấn trực tuyến | Khách, Nhân viên | Trung bình |
| UC-14 | Xem báo cáo / xuất file | Quản lý | Cao |
| UC-15 | Duyệt gợi ý AI | Quản lý | Thấp |
| UC-16 | Xem nhật ký hệ thống | Quản lý | Thấp |
| UC-17 | Quản lý nhân viên | Quản lý | Trung bình |
| UC-18 | Chạy demo offline | Mọi người dùng | Cao (chấm bài) |

---

## 3. Chi tiết các ca sử dụng chính

### UC-01. Đăng nhập quản trị / nhân viên

- **Màn hình:** `pages/admin/login.html`
- **API:** `POST /api/xac-thuc/dang-nhap`
- **Luồng chính:**
  1. Người dùng nhập email, mật khẩu.
  2. Hệ thống đối chiếu bcrypt, kiểm tra `trangThai = HOAT_DONG`.
  3. Cấp JWT; frontend lưu token và chuyển dashboard / POS theo vai trò.
- **Ngoại lệ:** Sai mật khẩu → 401; tài khoản khóa → 403.

### UC-02. Đăng ký / đăng nhập khách hàng

- **Màn hình:** `pages/public/shop-login.html`
- **API:** `POST /api/khach-hang/dang-ky`, đăng nhập khách hàng
- **Luồng chính:** Khách tạo tài khoản (họ tên, email, SĐT, mật khẩu) rồi đăng nhập để đặt hàng và xem lịch sử.
- **Ngoại lệ:** Email trùng → lỗi; chưa đăng nhập khi vào checkout → chuyển login.

### UC-03. Duyệt cửa hàng và tìm thuốc

- **Màn hình:** `pages/public/index.html`, `shop-detail.html`, `flash-sale.html`
- **API:** `GET /api/thuoc`, `GET /api/thuoc/danh-muc`
- **Luồng chính:**
  1. Hệ thống tải danh mục và danh sách thuốc còn kinh doanh.
  2. Người dùng tìm theo tên / hoạt chất (debounce), lọc danh mục và khoảng giá.
  3. Xem chi tiết, thêm giỏ hàng hoặc wishlist.
- **Ngoại lệ:** Ảnh lỗi → icon thuốc dự phòng.

### UC-04. Quản lý thuốc và danh mục

- **Màn hình:** `pages/admin/products.html`
- **API:** `GET/POST/PATCH /api/thuoc`, `POST /api/thuoc/danh-muc`
- **Luồng chính:** Quản lý/nhân viên thêm, sửa thông tin thuốc (kê đơn, giá, hình). Xóa/ẩn có xác nhận modal.
- **Hậu điều kiện:** Bản ghi `thuoc` cập nhật; nhật ký hệ thống ghi hành động.

### UC-05. Quản lý lô tồn kho

- **Màn hình:** `pages/admin/inventory.html`, `batches.html`
- **API:** `GET /api/ton-kho/lo`, `GET /api/ton-kho/thong-ke`, `POST/PATCH` lô, `GET /api/ton-kho/lich-su-xuat`
- **Luồng chính:** Nhập lô mới (số lô, HSD, SL, giá nhập); theo dõi tồn thấp và cận hạn.
- **Ngoại lệ:** Không cho số lượng âm.

### UC-06. Bán hàng POS

- **Màn hình:** `pages/admin/pos.html`
- **API:** `POST /api/hoa-don`
- **Luồng chính:**
  1. Nhân viên chọn thuốc, số lượng, khách (nếu có), PTTT.
  2. Hệ thống tính thành tiền, tạo hóa đơn + chi tiết.
  3. Trừ `lo_ton_kho` (ưu tiên lô gần hết hạn nếu có), ghi `lich_su_xuat_kho` lý do `BAN_HANG`.
- **Ngoại lệ:** Hết hàng / không đủ tồn → báo lỗi, không tạo hóa đơn.

### UC-07. Tạo và duyệt đơn thuốc

- **Màn hình:** POS / quy trình bán thuốc kê đơn
- **API:** `GET/POST /api/don-thuoc`, `PATCH` trạng thái
- **Luồng chính:** Tạo đơn (bệnh nhân, bác sĩ, thuốc, liều dùng) → duyệt/từ chối → hóa đơn có thể gắn `donThuocId`.
- **Ngoại lệ:** Thuốc `canDonThuoc = true` không bán POS nếu chưa có đơn duyệt (theo nghiệp vụ thiết kế).

### UC-08. Đặt hàng trực tuyến

- **Màn hình:** `pages/customer/checkout.html`, `order-success.html`
- **API:** `POST /api/don-hang`
- **Tiền điều kiện:** Đã đăng nhập khách; giỏ hàng không rỗng.
- **Luồng chính:**
  1. Khách nhập địa chỉ giao, SĐT, ghi chú.
  2. Hệ thống tạo `don_hang` + `chi_tiet_don_hang`, trạng thái `MOI_TAO`.
  3. Chuyển trang thành công, giỏ hàng được làm trống.
- **Ngoại lệ:** Validation thiếu địa chỉ/SĐT → 400.

### UC-09. Thanh toán đơn hàng

- **API:** `POST /api/thanh-toan/sepay-webhook`, `GET /api/thanh-toan/kiem-tra/:maDonHang`
- **Luồng chính:** Khách chọn tiền mặt hoặc cổng online; webhook cập nhật đơn khi nhận tiền.
- **Ngoại lệ:** Webhook sai mã đơn → bỏ qua / trả lỗi, không trừ kho hai lần (`daTruKho`).

### UC-10. Xử lý đơn hàng

- **Màn hình:** `pages/admin/orders.html`, `pages/customer/my-orders.html`
- **API:** `GET /api/don-hang`, `PATCH` trạng thái; khách: `GET /api/don-hang/lich-su`
- **Luồng chính:** Nhân viên xác nhận → đang giao → hoàn tất. Khách hoặc admin có thể hủy / yêu cầu hoàn tiền theo trạng thái cho phép.
- **Hậu điều kiện:** Khi hoàn tất, trừ kho nếu chưa `daTruKho`.

### UC-11. Quản lý khách hàng

- **Màn hình:** `pages/admin/customers.html`
- **API:** `GET/POST/PATCH /api/khach-hang`
- **Luồng chính:** Quản lý xem danh sách, thêm/sửa thông tin liên hệ.

### UC-12. Quản lý nhà cung cấp

- **Màn hình:** `pages/admin/suppliers.html`
- **API:** `GET/POST/PATCH/DELETE /api/nha-cung-cap` (chỉ `QUAN_LY`)
- **Luồng chính:** CRUD đối tác cung ứng thuốc.

### UC-13. Tư vấn trực tuyến

- **Màn hình:** `pages/public/support.html` (khách), khu vực admin tư vấn
- **API:** `/api/tu-van/bat-dau`, `nhan-phien`, `lich-su`, `ket-thuc`, Socket.IO
- **Luồng chính:** Khách mở phiên `CHO_TU_VAN` → nhân viên nhận `DANG_TU_VAN` → trao đổi tin nhắn → `KET_THUC`.

### UC-14. Xem báo cáo / xuất file

- **Màn hình:** `pages/admin/dashboard.html`, `reports.html`
- **API:** `GET /api/bao-cao/doanh-thu`, `/export/excel`, `/export/pdf`
- **Luồng chính:** Quản lý chọn khoảng thời gian, xem biểu đồ, tải Excel/PDF (và CSV/Word/JSON phía frontend).
- **Ngoại lệ:** Không phải `QUAN_LY` → 403.

### UC-15. Duyệt gợi ý AI

- **Màn hình:** `pages/admin/ai-assistant.html`
- **API:** `/api/goi-y-ai`
- **Luồng chính:** Hệ thống tạo gợi ý (`TON_KHO_THAP`, `SAP_HET_HAN`, `XU_HUONG_MUA`) → quản lý duyệt/từ chối, ghi chú.

### UC-16. Xem nhật ký hệ thống

- **API:** `GET /api/nhat-ky` (chỉ quản lý)
- **Luồng chính:** Lọc hành động theo đối tượng, người thực hiện, thời gian.

### UC-17. Quản lý nhân viên

- **Màn hình:** `pages/admin/employees.html`
- **API:** nhóm `/api/xac-thuc` (danh sách, tạo, khóa/mở, hồ sơ)
- **Luồng chính:** Quản lý tạo tài khoản `NHAN_VIEN`, đổi trạng thái `KHOA` / `HOAT_DONG`.

### UC-18. Chạy demo offline

- **Điều kiện:** Backend cổng 4000 không chạy.
- **Luồng chính:** `api.js` bắt lỗi mạng → `handleMockFallback()` + `mock-data.js` / LocalStorage.
- **Hậu điều kiện:** Vẫn đăng nhập demo, CRUD thuốc, POS, đặt hàng được trên trình duyệt.

---

## 4. Ma trận quyền theo ca sử dụng

| Use case | Khách vãng lai | Khách hàng | Nhân viên | Quản lý |
|----------|:--------------:|:----------:|:---------:|:-------:|
| UC-03 Xem/tìm thuốc | Có | Có | Có | Có |
| UC-08 Đặt hàng | Không | Có | Không* | Không* |
| UC-06 POS | Không | Không | Có | Có |
| UC-04 Thuốc | Không | Không | Có | Có |
| UC-12 NCC | Không | Không | Không | Có |
| UC-14 Báo cáo | Không | Không | Hạn chế | Có |
| UC-16 Nhật ký | Không | Không | Không | Có |

\*Nhân viên/quản lý xử lý đơn qua admin, không đặt như khách shop.

---

## 5. Mối quan hệ use case (tóm tắt)

- UC-03 → UC-08 → UC-09 → UC-10 (mua online).
- UC-04 + UC-05 → UC-06 (bán quầy); UC-07 bổ sung nếu thuốc kê đơn.
- UC-01 là tiền điều kiện của hầu hết use case quản trị.
- UC-18 thay thế tầng dữ liệu khi UC-01…UC-14 chạy môi trường không có MySQL.
