# CƠ SỞ DỮ LIỆU - NHÀ THUỐC AINA PHARMACY

Thư mục này chứa toàn bộ định nghĩa cấu trúc và dữ liệu cho Hệ thống Nhà thuốc AINA Pharmacy.

## 1. Cấu trúc CSDL (`schema.sql`)
- `nguoi_dung`: Lưu trữ tài khoản Quản trị viên (Admin) và Dược sĩ (Nhân viên).
- `khach_hang`: Lưu trữ tài khoản khách hàng đặt hàng trực tuyến.
- `danh_muc_thuoc`: Phân loại danh mục thuốc, thực phẩm chức năng, thiết bị y tế.
- `thuoc`: Thông tin chi tiết về thuốc, hoạt chất, hàm lượng, giá bán, hình ảnh.
- `lo_thuoc`: Quản lý kho theo lô sản xuất, ngày hết hạn và số lượng tồn kho.
- `don_hang` & `chi_tiet_don_hang`: Đơn hàng online và lịch sử giao dịch.
- `hoa_don` & `chi_tiet_hoa_don`: Giao dịch bán lẻ tại quầy POS.
- `goi_y_ai`: Đề xuất phân tích từ AI (tồn kho thấp, thuốc sắp hết hạn).

## 2. Cách khởi tạo CSDL với Prisma (Khuyến nghị)
1. Cấu hình biến môi trường trong file `backend/.env`:
   ```env
   DATABASE_URL="mysql://root:root@localhost:3306/ql_thuoc_dev"
   ```
2. Trong thư mục `backend/`, chạy lệnh migration và seed dữ liệu mẫu:
   ```bash
   npx prisma db push
   node seed.js
   ```

## 3. Chế độ Chạy Offline Không cần CSDL
Nếu máy tính chấm bài không cài đặt MySQL, ứng dụng Frontend được tích hợp sẵn **Mock Database Engine** tại `frontend/js/mock-data.js`. Khi Backend không hoạt động, Frontend tự động khởi tạo và lưu trữ CSDL giả lập trong `LocalStorage` của trình duyệt, hỗ trợ đầy đủ các thao tác CRUD, đặt hàng và phân quyền!
