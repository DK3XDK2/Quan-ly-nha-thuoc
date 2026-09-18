/**
 * MIDDLEWARE GIỚI HẠN TỐC ĐỘ GỌI API AI - AINA PHARMACY
 * Tiêu chí 7: Xử lý rate limit, bảo vệ hệ thống khỏi lạm dụng.
 *
 * Sử dụng in-memory Map (không cần Redis cho dự án sinh viên).
 * Giới hạn: 10 request/phút/IP cho các endpoint AI.
 */

const SO_YEU_CAU_TOI_DA = 10;
const KHUNG_THOI_GIAN_MS = 60 * 1000; // 1 phút
const THOI_GIAN_DON_DEP_MS = 5 * 60 * 1000; // Dọn bộ nhớ mỗi 5 phút

/**
 * Bộ nhớ lưu trữ số request theo IP.
 * Cấu trúc: Map<ip, { soLuong: number, batDau: number }>
 */
const boNhoGioiHan = new Map();

// Tự động dọn dẹp bộ nhớ để tránh memory leak
setInterval(() => {
  const hienTai = Date.now();
  for (const [ip, duLieu] of boNhoGioiHan.entries()) {
    if (hienTai - duLieu.batDau > KHUNG_THOI_GIAN_MS * 2) {
      boNhoGioiHan.delete(ip);
    }
  }
}, THOI_GIAN_DON_DEP_MS);

/**
 * Middleware giới hạn tốc độ gọi API AI.
 * Trả HTTP 429 nếu vượt quá giới hạn, kèm thông báo thân thiện tiếng Việt.
 */
function gioiHanAI(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.ip ||
    "unknown";

  const hienTai = Date.now();
  const duLieu = boNhoGioiHan.get(ip);

  if (!duLieu || hienTai - duLieu.batDau > KHUNG_THOI_GIAN_MS) {
    // Cửa sổ mới hoặc đã hết hạn cửa sổ cũ
    boNhoGioiHan.set(ip, { soLuong: 1, batDau: hienTai });
    return next();
  }

  duLieu.soLuong += 1;

  if (duLieu.soLuong > SO_YEU_CAU_TOI_DA) {
    const conLaiMs = KHUNG_THOI_GIAN_MS - (hienTai - duLieu.batDau);
    const conLaiGiay = Math.ceil(conLaiMs / 1000);

    return res.status(429).json({
      thongBao: `Bạn đã gửi quá nhiều câu hỏi liên tục. Vui lòng đợi khoảng ${conLaiGiay} giây rồi thử lại nhé!`,
      loai: "RATE_LIMIT",
      choDoiGiay: conLaiGiay,
    });
  }

  return next();
}

module.exports = { gioiHanAI, SO_YEU_CAU_TOI_DA, KHUNG_THOI_GIAN_MS };
