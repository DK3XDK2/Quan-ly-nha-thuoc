require("dotenv").config();
BigInt.prototype.toJSON = function() { return this.toString() };
const express = require("express");
const cors = require("cors");

const duongDanXacThuc = require("./routes/xac_thuc");
const duongDanThuoc = require("./routes/thuoc");
const duongDanTonKho = require("./routes/ton_kho");
const duongDanDonThuoc = require("./routes/don_thuoc");
const duongDanHoaDon = require("./routes/hoa_don");
let duongDanGoiYAi;
try {
  duongDanGoiYAi = require("./routes/goi_y_ai");
} catch (e) {
  const routerAo = express.Router();
  routerAo.all("*", (req, res) => {
    res.json({ thongBao: "Dịch vụ đang được bảo trì và nâng cấp", trangThai: "coming_soon" });
  });
  duongDanGoiYAi = routerAo;
}
const duongDanBaoCao = require("./routes/bao_cao");
const duongDanKhachHang = require("./routes/khach_hang");
const duongDanDonHang = require("./routes/don_hang");
const duongDanNhaCungCap = require("./routes/nha_cung_cap");
const duongDanThanhToan = require("./routes/thanh_toan");
const duongDanTuVan = require("./routes/tu_van");
const duongDanNhatKy = require("./routes/nhat_ky");
const { khoiTaoCronDonDep } = require("./tasks/don_dep_du_lieu");

khoiTaoCronDonDep();

const http = require("http");
const { khoiTaoSocket } = require("./services/socket");

const ungDung = express();
const serverHttp = http.createServer(ungDung);

const io = khoiTaoSocket(serverHttp);

ungDung.use((req, res, next) => {
  req.io = io;
  next();
});

ungDung.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "ngrok-skip-browser-warning", "x-skip-global-loading"]
}));
ungDung.use(express.json({ limit: '10mb' }));
ungDung.use(express.urlencoded({ extended: true, limit: '10mb' }));

ungDung.get("/", (req, res) => {
  return res.json({ thongBao: "Hệ thống quản lý thuốc đang hoạt động bình thường" });
});

ungDung.use("/api/xac-thuc", duongDanXacThuc);
ungDung.use("/api/thuoc", duongDanThuoc);
ungDung.use("/api/ton-kho", duongDanTonKho);
ungDung.use("/api/don-thuoc", duongDanDonThuoc);
ungDung.use("/api/hoa-don", duongDanHoaDon);
ungDung.use("/api/goi-y-ai", duongDanGoiYAi);
ungDung.use("/api/bao-cao", duongDanBaoCao);
ungDung.use("/api/khach-hang", duongDanKhachHang);
ungDung.use("/api/don-hang", duongDanDonHang);
ungDung.use("/api/nha-cung-cap", duongDanNhaCungCap);
ungDung.use("/api/thanh-toan", duongDanThanhToan);
ungDung.use("/api/tu-van", duongDanTuVan);
ungDung.use("/api/nhat-ky", duongDanNhatKy);

const cong = Number(process.env.PORT || process.env.CONG_SERVER || 4000);

serverHttp.listen(cong, () => {
  console.log(`May chu chạy tới cổng ${cong}`);
});
