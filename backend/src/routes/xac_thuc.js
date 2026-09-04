const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { coSoDuLieu } = require("../config/database");
const { uploadCloud } = require("../config/cloudinary");
const { xacThucTruyCap, yeuCauVaiTro } = require("../middleware/xac_thuc");

const duongDan = express.Router();
const VAI_TRO_HOP_LE = ["QUAN_LY", "NHAN_VIEN"];

duongDan.post("/khoi-tao-quan-ly", async (req, res) => {
  try {
    const { hoTen, email, matKhau } = req.body;

    if (!hoTen || !email || !matKhau) {
      return res.status(400).json({ thongBao: "Thiếu dữ liệu khởi tạo quản lý" });
    }

    const soQuanLy = await coSoDuLieu.nguoiDung.count({
      where: { vaiTro: "QUAN_LY" },
    });

    if (soQuanLy > 0) {
      return res.status(409).json({ thongBao: "Hệ thống đã có tài khoản quản lý" });
    }

    const matKhauDaMaHoa = await bcrypt.hash(matKhau, 10);

    const quanLy = await coSoDuLieu.nguoiDung.create({
      data: {
        hoTen,
        email,
        matKhau: matKhauDaMaHoa,
        vaiTro: "QUAN_LY",
      },
    });

    return res.status(201).json({
      thongBao: "Khởi tạo quản lý thành công",
      duLieu: {
        id: quanLy.id,
        hoTen: quanLy.hoTen,
        email: quanLy.email,
        vaiTro: quanLy.vaiTro,
      },
    });
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi khởi tạo quản lý" });
  }
});

duongDan.post("/dang-nhap", async (req, res) => {
  try {
    const { email, matKhau } = req.body;

    if (!email || !matKhau) {
      return res.status(400).json({ thongBao: "Vui lòng nhập Email và Mật khẩu" });
    }

    const nguoiDung = await coSoDuLieu.nguoiDung.findUnique({
      where: { email },
    });

    if (!nguoiDung) {
      return res
        .status(401)
        .json({ thongBao: "Thông tin đăng nhập không chính xác" });
    }

    const dungMatKhau = await bcrypt.compare(matKhau, nguoiDung.matKhau);

    if (!dungMatKhau) {
      return res
        .status(401)
        .json({ thongBao: "Thông tin đăng nhập không chính xác" });
    }

    if (nguoiDung.trangThai !== "HOAT_DONG") {
      return res.status(403).json({ thongBao: "Tài khoản của bạn đã bị khóa" });
    }

    const token = jwt.sign(
      {
        id: nguoiDung.id,
        email: nguoiDung.email,
        vaiTro: nguoiDung.vaiTro,
        trangThai: nguoiDung.trangThai,
        loaiTaiKhoan: "NHAN_VIEN",
      },
      process.env.KHOA_BI_MAT_JWT,
      { expiresIn: "6h" },
    );

    return res.json({
      thongBao: "Đăng nhập thành công",
      token,
      nguoiDung: {
        id: nguoiDung.id,
        hoTen: nguoiDung.hoTen,
        email: nguoiDung.email,
        vaiTro: nguoiDung.vaiTro,
        trangThai: nguoiDung.trangThai,
        avatarUrl: nguoiDung.avatarUrl,
      },
    });
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi đăng nhập hệ thống" });
  }
});

duongDan.post(
  "/tao-tai-khoan",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    try {
      const { hoTen, email, matKhau, vaiTro } = req.body;

      if (!hoTen || !email || !matKhau || !vaiTro) {
        return res
          .status(400)
          .json({ thongBao: "Thiếu dữ liệu tạo tài khoản" });
      }

      if (!VAI_TRO_HOP_LE.includes(vaiTro)) {
        return res.status(400).json({ thongBao: "Vai trò không hợp lệ" });
      }

      const taiKhoanDaCo = await coSoDuLieu.nguoiDung.findUnique({
        where: { email },
      });

      if (taiKhoanDaCo) {
        return res.status(409).json({ thongBao: "Email này đã tồn tại trên hệ thống" });
      }

      const matKhauDaMaHoa = await bcrypt.hash(matKhau, 10);

      const taiKhoanMoi = await coSoDuLieu.nguoiDung.create({
        data: {
          hoTen,
          email,
          matKhau: matKhauDaMaHoa,
          vaiTro,
        },
      });

      return res.status(201).json({
        thongBao: "Tạo tài khoản thành công",
        duLieu: {
          id: taiKhoanMoi.id,
          hoTen: taiKhoanMoi.hoTen,
          email: taiKhoanMoi.email,
          vaiTro: taiKhoanMoi.vaiTro,
        },
      });
    } catch (loi) {
      return res.status(500).json({ thongBao: "Lỗi khi tạo tài khoản" });
    }
  },
);

duongDan.get(
  "/nhan-vien",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    try {
      const danhSach = await coSoDuLieu.nguoiDung.findMany({
        select: {
          id: true,
          hoTen: true,
          email: true,
          vaiTro: true,
          trangThai: true,
          taoLuc: true,
        },
        orderBy: { id: "asc" },
      });
      return res.json(danhSach);
    } catch (loi) {
      return res.status(500).json({ thongBao: "Lỗi khi lấy danh sách nhân viên" });
    }
  },
);

duongDan.patch(
  '/:id/trang-thai',
  xacThucTruyCap,
  yeuCauVaiTro('QUAN_LY'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { trangThai } = req.body;
      if (!['HOAT_DONG', 'BI_KHOA'].includes(trangThai)) {
        return res.status(400).json({ thongBao: 'Trạng thái không hợp lệ' });
      }
      await coSoDuLieu.nguoiDung.update({
        where: { id },
        data: { trangThai },
      });
      return res.json({ thongBao: 'Cập nhật trạng thái thành công' });
    } catch (loi) {
      return res.status(400).json({ thongBao: 'Lỗi khi cập nhật trạng thái' });
    }
  },
);

duongDan.get("/ho-so", xacThucTruyCap, async (req, res) => {
  try {
    const nguoiDung = await coSoDuLieu.nguoiDung.findUnique({
      where: { id: req.nguoiDung.id },
      select: {
        id: true,
        hoTen: true,
        email: true,
        vaiTro: true,
        trangThai: true,
        taoLuc: true,
        soDienThoai: true,
        diaChi: true,
        ngaySinh: true,
        avatarUrl: true,
      },
    });
    return res.json(nguoiDung);
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi lấy thông tin hồ sơ" });
  }
});

duongDan.patch("/ho-so", xacThucTruyCap, async (req, res) => {
  try {
    const { hoTen, email, matKhauMoi } = req.body;
    const data = {};

    if (hoTen) data.hoTen = hoTen;
    if (email) {
      const taiKhoanKhac = await coSoDuLieu.nguoiDung.findFirst({
        where: { email, NOT: { id: req.nguoiDung.id } },
      });
      if (taiKhoanKhac) {
        return res.status(409).json({ thongBao: "Email này đã được sử dụng" });
      }
      data.email = email;
    }

    if (matKhauMoi) {
      data.matKhau = await bcrypt.hash(matKhauMoi, 10);
    }

    if (req.body.soDienThoai !== undefined) data.soDienThoai = req.body.soDienThoai;
    if (req.body.diaChi !== undefined) data.diaChi = req.body.diaChi;
    if (req.body.avatarUrl !== undefined) data.avatarUrl = req.body.avatarUrl;
    if (req.body.ngaySinh) data.ngaySinh = new Date(req.body.ngaySinh);

    const nguoiDungCapNhat = await coSoDuLieu.nguoiDung.update({
      where: { id: req.nguoiDung.id },
      data,
      select: {
        id: true,
        hoTen: true,
        email: true,
        vaiTro: true,
        soDienThoai: true,
        diaChi: true,
        ngaySinh: true,
        avatarUrl: true,
      },
    });

    return res.json({
      thongBao: "Cập nhật hồ sơ thành công",
      duLieu: nguoiDungCapNhat,
    });
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi cập nhật hồ sơ" });
  }
});

duongDan.post("/cap-nhat-avatar", xacThucTruyCap, uploadCloud.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ thongBao: "Vui lòng chọn ảnh để tải lên" });
    }

    const nguoiDungCapNhat = await coSoDuLieu.nguoiDung.update({
      where: { id: req.nguoiDung.id },
      data: { avatarUrl: req.file.path },
    });

    return res.json({
      thongBao: "Cập nhật ảnh đại diện thành công",
      avatarUrl: req.file.path
    });
  } catch (error) {
    console.error("Lỗi upload avatar:", error);
    return res.status(500).json({ thongBao: "Lỗi tải ảnh lên Cloudinary" });
  }
});

module.exports = duongDan;
