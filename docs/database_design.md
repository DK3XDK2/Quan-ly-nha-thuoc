# Thiết kế cơ sở dữ liệu
## Hệ thống Quản lý và Bán thuốc Trực tuyến — AINA Pharmacy

> Nguồn chuẩn: `backend/prisma/schema.prisma`  
> Bản DDL tham chiếu: `database/schema.sql`  
> DBMS: MySQL 8 (Prisma Client)  
> Quy ước: tên model PascalCase (Prisma), tên bảng/cột snake_case (`@@map`)

---

## 1. Mục tiêu thiết kế

- Tách **tài khoản nội bộ** (`nguoi_dung`) và **tài khoản khách** (`khach_hang`).
- Quản lý thuốc theo **danh mục** và **lô tồn kho** (số lô, hạn dùng, giá nhập).
- Tách **bán tại quầy** (`hoa_don`) và **đơn online** (`don_hang`).
- Ghi **xuất kho**, **nhật ký**, **gợi ý AI**, **tư vấn realtime**.
- Chuẩn hóa quan hệ (tiệm cận 3NF): chi tiết đơn/hóa đơn không nhúng danh sách thuốc dạng JSON.

---

## 2. Enum (miền giá trị)

| Enum Prisma | Giá trị | Ý nghĩa |
|-------------|---------|---------|
| `VaiTro` | `QUAN_LY`, `NHAN_VIEN` | Vai trò tài khoản nội bộ |
| `TrangThaiTaiKhoan` | `HOAT_DONG`, `KHOA` | Khóa đăng nhập nhân viên |
| `TrangThaiDonThuoc` | `MOI_TAO`, `DA_DUYET`, `TU_CHOI` | Vòng đời đơn thuốc |
| `LoaiGoiYAi` | `TON_KHO_THAP`, `SAP_HET_HAN`, `XU_HUONG_MUA` | Loại gợi ý |
| `TrangThaiGoiYAi` | `CHO_DUYET`, `DA_DUYET`, `TU_CHOI` | Duyệt gợi ý |
| `TrangThaiDonHang` | `MOI_TAO`, `DA_XAC_NHAN`, `DANG_GIAO`, `HOAN_TAT`, `HUY`, `YEU_CAU_HOAN_TIEN`, `DA_HOAN_TIEN` | Vòng đời đơn online |
| `LoaiTacNhan` | `USER`, `HE_THONG` | Nhật ký |
| `LiDoXuat` | `BAN_HANG`, `HU_HANG`, `KIEM_KE`, `HET_HAN` | Lý do xuất kho |
| `LoaiThamChieu` | `HOA_DON`, `DON_HANG` | Tham chiếu xuất kho |
| `TrangThaiPhien` | `CHO_TU_VAN`, `DANG_TU_VAN`, `KET_THUC` | Chat tư vấn |

---

## 3. Danh sách bảng

| Bảng MySQL | Model Prisma | Vai trò |
|------------|--------------|---------|
| `nguoi_dung` | `NguoiDung` | Admin, dược sĩ |
| `khach_hang` | `KhachHang` | Khách mua online |
| `danh_muc_thuoc` | `DanhMucThuoc` | Nhóm sản phẩm |
| `nha_cung_cap` | `NhaCungCap` | Đối tác cung ứng |
| `thuoc` | `Thuoc` | Danh mục thuốc |
| `lo_ton_kho` | `LoTonKho` | Tồn theo lô |
| `don_thuoc` | `DonThuoc` | Đơn thuốc kê đơn |
| `chi_tiet_don_thuoc` | `ChiTietDonThuoc` | Dòng thuốc + liều |
| `hoa_don` | `HoaDon` | Hóa đơn POS |
| `chi_tiet_hoa_don` | `ChiTietHoaDon` | Dòng hóa đơn |
| `don_hang` | `DonHang` | Đơn TMĐT |
| `chi_tiet_don_hang` | `ChiTietDonHang` | Dòng đơn |
| `lich_su_xuat_kho` | `LichSuXuatKho` | Audit xuất kho |
| `goi_y_ai` | `GoiYAi` | Gợi ý AI |
| `nhat_ky_he_thong` | `NhatKyHeThong` | Audit nghiệp vụ |
| `lich_su_chat` | `LichSuChat` | Lịch sử chatbot |
| `phien_tu_van` | `PhienTuVan` | Phiên chat người–người |
| `tin_nhan_tu_van` | `TinNhanTuVan` | Tin nhắn tư vấn |

---

## 4. Mô tả thuộc tính các bảng cốt lõi

### 4.1. `nguoi_dung`

| Cột | Kiểu | Ràng buộc |
|-----|------|-----------|
| `id` | INT | PK, AI |
| `ho_ten` | VARCHAR | NOT NULL |
| `email` | VARCHAR | UNIQUE, NOT NULL |
| `mat_khau` | VARCHAR | NOT NULL (bcrypt) |
| `vai_tro` | ENUM | `QUAN_LY` / `NHAN_VIEN` |
| `trang_thai` | ENUM | mặc định `HOAT_DONG` |
| `so_dien_thoai`, `dia_chi`, `ngay_sinh`, `avatar_url` | tùy chọn | |
| `tao_luc`, `cap_nhat_luc` | DATETIME | |

Quan hệ: 1-n với đơn thuốc, hóa đơn, gợi ý đã duyệt, nhật ký, xuất kho, phiên tư vấn (nhân viên).

### 4.2. `khach_hang`

| Cột | Kiểu | Ràng buộc |
|-----|------|-----------|
| `id` | INT | PK |
| `ho_ten`, `email`, `so_dien_thoai`, `mat_khau` | | email UNIQUE |
| `dia_chi` | VARCHAR | NULL |
| Index | `so_dien_thoai` | tìm khách nhanh |

Quan hệ: 1-n `don_hang`, `phien_tu_van`, `hoa_don`.

### 4.3. `thuoc` và `danh_muc_thuoc`

- `danh_muc_thuoc.ten_danh_muc` UNIQUE.
- `thuoc.ma_thuoc`, `thuoc.ten_thuoc` UNIQUE.
- `gia_ban` DECIMAL(12,2); `can_don_thuoc`, `con_kinh_doanh` BOOLEAN.
- FK `danh_muc_thuoc_id` → `danh_muc_thuoc.id` (RESTRICT).
- Index `ten_thuoc` phục vụ tìm kiếm.

### 4.4. `lo_ton_kho`

- FK `thuoc_id` → `thuoc`.
- `so_lo`, `han_su_dung`, `so_luong_ton`, `gia_nhap`.
- Một thuốc có nhiều lô (phục vụ FEFO khi xuất).

### 4.5. `hoa_don` / `chi_tiet_hoa_don`

- `hoa_don`: `nguoi_tao_id` (bắt buộc), `don_thuoc_id` (nullable), `khach_hang_id` (nullable), `tong_tien`, `phuong_thuc_thanh_toan`.
- Chi tiết: `so_luong`, `don_vi_tinh`, `don_gia`, `thanh_tien`; ON DELETE CASCADE theo hóa đơn.

### 4.6. `don_hang` / `chi_tiet_don_hang`

- `ma_don_hang` UNIQUE; `payos_order_code` UNIQUE (nullable) cho cổng thanh toán.
- Địa chỉ giao, người nhận, SĐT, email, ghi chú.
- `tong_tien_hang`, `phi_giao_hang`, `tong_thanh_toan`.
- `da_tru_kho` tránh trừ kho lặp khi webhook + hoàn tất đơn.
- `khach_hang_id` NOT NULL trong Prisma (Restrict khi xóa khách).
- Index: khách, SĐT nhận, `tao_luc`.

### 4.7. `lich_su_xuat_kho`

- Gắn `lo_ton_kho_id`, `nguoi_xuat_id`, `so_luong_xuat`, `li_do_xuat`.
- `tham_chieu_id` + `loai_tham_chieu` trỏ hóa đơn hoặc đơn hàng.

### 4.8. `goi_y_ai`

- `du_lieu_dau_vao`, `du_lieu_dau_ra` kiểu JSON.
- `do_tin_cay` FLOAT; `duyet_boi_id` nullable.

### 4.9. `nhat_ky_he_thong`

- `hanh_dong`, `doi_tuong`, `doi_tuong_id`.
- Snapshot JSON `truoc_thay_doi` / `sau_thay_doi`.

### 4.10. Tư vấn: `phien_tu_van` + `tin_nhan_tu_van`

- Phiên: `khach_hang_id`, `nhan_vien_id` (nullable đến khi nhận), `trang_thai`.
- Tin: `vai_tro_gui` (`KHACH_HANG` / `NHAN_VIEN`), `noi_dung`, `la_hinh_anh`, `da_xem`; CASCADE khi xóa phiên.

### 4.11. `nha_cung_cap`

- `ma_nha_cung_cap` UNIQUE; index tên và SĐT.
- Hiện độc lập (chưa FK bắt buộc tới phiếu nhập trong schema Prisma).

### 4.12. `lich_su_chat`

- Lưu hội thoại bot: `loai_bot`, `cau_hoi`, `tra_loi` (TEXT).

---

## 5. Sơ đồ quan hệ (ER rút gọn)

```text
danh_muc_thuoc 1──n thuoc 1──n lo_ton_kho 1──n lich_su_xuat_kho
                      │              │
                      ├── n chi_tiet_hoa_don n──1 hoa_don n──1 nguoi_dung
                      ├── n chi_tiet_don_hang n──1 don_hang n──1 khach_hang
                      └── n chi_tiet_don_thuoc n──1 don_thuoc n──1 nguoi_dung
                                              └── 1──n hoa_don (tùy chọn)

khach_hang 1──n phien_tu_van n──1 nguoi_dung (nhân viên)
                    └── 1──n tin_nhan_tu_van

nguoi_dung 1──n goi_y_ai (duyệt)
nguoi_dung 1──n nhat_ky_he_thong
hoa_don n──0..1 khach_hang
```

---

## 6. Ràng buộc toàn vẹn và hành vi xóa

| Quan hệ | ON DELETE (DDL / Prisma) | Lý do |
|---------|--------------------------|--------|
| Chi tiết đơn/hóa đơn/đơn thuốc | CASCADE theo chứng từ cha | Xóa header thì xóa dòng |
| `thuoc` ← chi tiết / lô | RESTRICT | Không xóa thuốc đang được dùng |
| `don_hang` ← `khach_hang` | Restrict (Prisma) | Giữ lịch sử đơn |
| `goi_y_ai.duyet_boi` | SET NULL | Xóa user không mất gợi ý |
| `nhat_ky.nguoi_thuc_hien` | SET NULL | Giữ audit |

Lưu ý: `database/schema.sql` là bản DDL cũ hơn Prisma (thiếu một số cột: `hinh_anh`, PayOS, hoàn tiền, tư vấn…). Khi triển khai, lấy **Prisma schema** làm nguồn sự thật.

---

## 7. Chỉ mục phục vụ truy vấn

- Unique: email người dùng/khách, mã/tên thuốc, mã đơn, mã NCC, mã PayOS.
- Index: `thuoc.ten_thuoc`, `khach_hang.so_dien_thoai`, `don_hang` (khách, SĐT nhận, thời gian), `hoa_don` (đơn thuốc, khách), `nha_cung_cap` (tên, SĐT).

---

## 8. Nguyên tắc nghiệp vụ trên dữ liệu

1. **Tồn kho** chỉ thay đổi qua lô + lịch sử xuất, không sửa âm không kiểm soát.
2. **Đơn online** dùng cờ `da_tru_kho` để idempotent khi thanh toán bất đồng bộ.
3. **Giá bán** lưu trên dòng chi tiết (`don_gia`) để hóa đơn/đơn không đổi khi giá catalog thay đổi.
4. **Thuốc kê đơn** dùng cờ `can_don_thuoc` kết hợp `don_thuoc`.
5. Mật khẩu không lưu plaintext.

---

## 9. Khởi tạo và dữ liệu mẫu

```bash
cd backend
npx prisma db push
node seed.js
```

Chế độ không CSDL: mock tại `frontend/js/mock-data.js` (LocalStorage), không thay thế mô hình quan hệ trên server.
