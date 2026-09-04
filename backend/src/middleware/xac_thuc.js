const jwt = require("jsonwebtoken");
const { coSoDuLieu } = require("../config/database");

async function xacThucTruyCap(req, res, next) {
  const tieuDe = req.headers.authorization;

  if (!tieuDe || !tieuDe.startsWith("Bearer ")) {
    return res.status(401).json({ thongBao: "Thieu token truy cap" });
  }

  const token = tieuDe.split(" ")[1];

  try {
    const duLieu = jwt.verify(token, process.env.KHOA_BI_MAT_JWT);

    if (duLieu.loaiTaiKhoan !== "KHACH_HANG") {
      const taiKhoanNhanVien = await coSoDuLieu.nguoiDung.findUnique({
        where: { id: duLieu.id },
        select: { id: true, vaiTro: true, trangThai: true },
      });

      if (!taiKhoanNhanVien) {
        return res.status(401).json({ thongBao: "Tai khoan khong ton tai" });
      }

      if (taiKhoanNhanVien.trangThai !== "HOAT_DONG") {
        return res.status(403).json({ thongBao: "Tai khoan da bi khoa" });
      }

      req.nguoiDung = {
        ...duLieu,
        vaiTro: taiKhoanNhanVien.vaiTro,
        trangThai: taiKhoanNhanVien.trangThai,
      };
      return next();
    }

    req.nguoiDung = duLieu;
    return next();
  } catch (loi) {
    return res.status(401).json({ thongBao: "Token khong hop le" });
  }
}

function yeuCauVaiTro(...danhSachVaiTro) {
  return (req, res, next) => {
    if (!req.nguoiDung) {
      return res.status(401).json({ thongBao: "Chua xac thuc" });
    }

    if (!danhSachVaiTro.includes(req.nguoiDung.vaiTro)) {
      return res.status(403).json({ thongBao: "Khong du quyen" });
    }

    return next();
  };
}

function yeuCauKhachHang(req, res, next) {
  if (!req.nguoiDung) {
    return res.status(401).json({ thongBao: "Chua xac thuc" });
  }

  if (req.nguoiDung.loaiTaiKhoan !== "KHACH_HANG") {
    return res.status(403).json({ thongBao: "Chi danh cho khach hang" });
  }

  return next();
}

module.exports = { xacThucTruyCap, yeuCauVaiTro, yeuCauKhachHang };
