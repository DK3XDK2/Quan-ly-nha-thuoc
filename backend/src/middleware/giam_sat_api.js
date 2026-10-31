const express = require("express");
const duongDanGiamSat = express.Router();

const GIOI_HAN_NHAT_KY = 150;
const boNhoNhatKy = [];
let boDemId = 1;

/**
 * Middleware ghi nhận mọi lượt gọi API đi qua Express Server
 */
function theoDoiApiMiddleware(req, res, next) {
  // Bỏ qua các request tĩnh hoặc chính API giám sát để tránh nhiễu
  if (
    req.path.startsWith("/uploads") ||
    req.path.startsWith("/api/giam-sat") ||
    req.path === "/favicon.ico"
  ) {
    return next();
  }

  const thoiDiemBatDau = Date.now();

  res.on("finish", () => {
    const thoiGianXuLyMs = Date.now() - thoiDiemBatDau;
    const ipNguoiGoi =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      "127.0.0.1";

    const banGhi = {
      id: boDemId++,
      thoiGian: new Date().toISOString(),
      phuongThuc: req.method,
      duongDan: req.originalUrl || req.url,
      maTrangThai: res.statusCode,
      thoiGianXuLyMs,
      ip: String(ipNguoiGoi).replace("::ffff:", ""),
      kenh: req.headers["x-forwarded-proto"] ? "NGROK/PROXY" : "LOCAL",
      userRole: req.nguoiDung?.vaiTro || req.nguoiDung?.loaiTaiKhoan || "KHACH",
    };

    boNhoNhatKy.unshift(banGhi);

    if (boNhoNhatKy.length > GIOI_HAN_NHAT_KY) {
      boNhoNhatKy.pop();
    }
  });

  next();
}

/**
 * API Lấy danh sách thống kê và lịch sử gọi API
 */
duongDanGiamSat.get("/traffic", (req, res) => {
  const tongSoRequest = boNhoNhatKy.length;
  let soThanhCong = 0;
  let soLoiClient = 0;
  let soLoiServer = 0;
  let tongLatency = 0;

  for (const r of boNhoNhatKy) {
    tongLatency += r.thoiGianXuLyMs;
    if (r.maTrangThai >= 200 && r.maTrangThai < 400) soThanhCong++;
    else if (r.maTrangThai >= 400 && r.maTrangThai < 500) soLoiClient++;
    else if (r.maTrangThai >= 500) soLoiServer++;
  }

  const avgLatency =
    tongSoRequest > 0 ? Math.round(tongLatency / tongSoRequest) : 0;

  return res.json({
    thongKe: {
      tongSo: tongSoRequest,
      thanhCong: soThanhCong,
      loiClient: soLoiClient,
      loiServer: soLoiServer,
      doTreTrungBinh: avgLatency,
    },
    danhSach: boNhoNhatKy,
  });
});

/**
 * API Xóa lịch sử theo dõi
 */
duongDanGiamSat.delete("/traffic", (req, res) => {
  boNhoNhatKy.length = 0;
  return res.json({ thongBao: "Đã xóa toàn bộ nhật ký giám sát API" });
});

module.exports = {
  theoDoiApiMiddleware,
  duongDanGiamSat,
};
