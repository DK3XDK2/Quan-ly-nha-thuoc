const cron = require("node-cron");
const { coSoDuLieu } = require("../config/database");
const { cloudinary } = require("../config/cloudinary");


function getPublicIdFromUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1].split('.')[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${fileName}`;
  } catch (e) { return null; }
}

/**
 * 
 * @param {number} ngayGiuLai 
 */
async function thucHienDonDepLog(ngayGiuLai = 90) {
  const thoiDiemCat = new Date();
  thoiDiemCat.setDate(thoiDiemCat.getDate() - ngayGiuLai);

  const thoiDiemCatChat = new Date();
  thoiDiemCatChat.setDate(thoiDiemCatChat.getDate() - 30);

  console.log(`[CLEANUP] Bắt đầu dọn dẹp dữ liệu cũ (Log/HD < ${ngayGiuLai} ngày, Chat < 30 ngày)`);

  try {
    const hoaDonCu = await coSoDuLieu.hoaDon.findMany({
      where: { taoLuc: { lt: thoiDiemCat } },
      select: { id: true }
    });
    
    const idsHoaDonCu = hoaDonCu.map(h => h.id);
    if (idsHoaDonCu.length > 0) {
      await coSoDuLieu.lichSuXuatKho.deleteMany({
        where: { loaiThamChieu: "HOA_DON", thamChieuId: { in: idsHoaDonCu } }
      });
      await coSoDuLieu.hoaDon.deleteMany({ where: { id: { in: idsHoaDonCu } } });
      console.log(`[CLEANUP] Đã xóa ${idsHoaDonCu.length} hóa đơn cũ.`);
    }

    const xoaChatAI = await coSoDuLieu.lichSuChat.deleteMany({
      where: { taoLuc: { lt: thoiDiemCatChat } }
    });
    if (xoaChatAI.count > 0) console.log(`[CLEANUP] Đã xóa ${xoaChatAI.count} bản ghi chat AI.`);

    const tinNhanAnhCu = await coSoDuLieu.tinNhanTuVan.findMany({
      where: { laHinhAnh: true, taoLuc: { lt: thoiDiemCatChat } }
    });

    if (tinNhanAnhCu.length > 0) {
      const pids = tinNhanAnhCu.map(m => getPublicIdFromUrl(m.noiDung)).filter(id => id);
      for (const id of pids) {
        await cloudinary.uploader.destroy(id).catch(err => {});
      }
      console.log(`[CLEANUP] Đã xóa ${pids.length} ảnh chat cũ trên Cloudinary.`);
    }

    const xoaTinNhan = await coSoDuLieu.tinNhanTuVan.deleteMany({
      where: { taoLuc: { lt: thoiDiemCatChat } }
    });
    const xoaPhien = await coSoDuLieu.phienTuVan.deleteMany({
      where: { taoLuc: { lt: thoiDiemCatChat }, trangThai: 'KET_THUC' }
    });
    if (xoaTinNhan.count > 0) console.log(`[CLEANUP] Đã xóa ${xoaTinNhan.count} tin nhắn tư vấn và ${xoaPhien.count} phiên cũ.`);

    const xoaLogs = await coSoDuLieu.nhatKyHeThong.deleteMany({
      where: { taoLuc: { lt: thoiDiemCat } }
    });
    if (xoaLogs.count > 0) console.log(`[CLEANUP] Đã xóa ${xoaLogs.count} bản ghi nhật ký hệ thống.`);

    console.log("[CLEANUP] Hoàn tất quá trình dọn dẹp định kỳ.");
  } catch (error) {
    console.error("[CLEANUP] LỖI khi thực hiện dọn dẹp:", error);
  }
}

/**
 * Khởi tạo các cron job định kỳ
 */
function khoiTaoCronDonDep() {
  // Dọn dẹp log, hóa đơn, chat cũ vào lúc 3h sáng mỗi ngày
  cron.schedule("0 3 * * *", () => {
    thucHienDonDepLog(90);
  });
  console.log("[CRON] Đã kích hoạt lịch dọn dẹp dữ liệu tự động (3:00 AM hàng ngày - Giữ lại 90 ngày).");

  // Tự động kiểm tra và hủy các đơn hàng SePay chưa thanh toán quá 15 phút (chạy mỗi 5 phút)
  cron.schedule("*/5 * * * *", async () => {
    try {
      const hanHuy = new Date(Date.now() - 15 * 60 * 1000);
      const ketQua = await coSoDuLieu.donHang.updateMany({
        where: {
          trangThai: "MOI_TAO",
          phuongThucThanhToan: "SEPAY",
          taoLuc: { lt: hanHuy }
        },
        data: {
          trangThai: "HUY",
          ghiChu: "[Hệ thống] Tự động hủy do quá hạn thanh toán chuyển khoản SePay (15 phút)"
        }
      });
      if (ketQua.count > 0) {
        console.log(`[CRON] Đã tự động hủy ${ketQua.count} đơn hàng SePay quá hạn 15 phút.`);
      }
    } catch (err) {
      console.error("[CRON] Lỗi tự động hủy đơn SePay quá hạn:", err);
    }
  });
  console.log("[CRON] Đã kích hoạt lịch tự động hủy đơn hàng SePay quá hạn 15 phút (chạy mỗi 5 phút).");
}

module.exports = { khoiTaoCronDonDep, thucHienDonDepLog };
