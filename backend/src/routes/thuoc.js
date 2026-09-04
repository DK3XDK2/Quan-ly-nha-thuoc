const express = require("express");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauVaiTro } = require("../middleware/xac_thuc");
const { ghiNhatKy } = require("../services/audit");

const duongDan = express.Router();

duongDan.get("/danh-muc", async (req, res) => {
  try {
    const danhSach = await coSoDuLieu.danhMucThuoc.findMany({
      orderBy: { tenDanhMuc: "asc" },
    });

    return res.json(danhSach);
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi khi lấy danh mục thuốc" });
  }
});

duongDan.post(
  "/danh-muc",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const tenDanhMuc = String(req.body?.tenDanhMuc || "").trim();

      if (!tenDanhMuc) {
        return res.status(400).json({ thongBao: "Tên danh mục không được để trống" });
      }

      const daTonTai = await coSoDuLieu.danhMucThuoc.findUnique({
        where: { tenDanhMuc },
      });

      if (daTonTai) {
        return res.json(daTonTai);
      }

      const danhMucMoi = await coSoDuLieu.danhMucThuoc.create({
        data: { tenDanhMuc },
      });

      return res.status(201).json(danhMucMoi);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi khi tạo danh mục thuốc" });
    }
  },
);

duongDan.get("/", async (req, res) => {
  const danhSach = await coSoDuLieu.thuoc.findMany({
    include: {
      danhMucThuoc: true,
      loTonKho: true,
    },
    orderBy: { id: "desc" },
  });

  return res.json(danhSach);
});

duongDan.post(
  "/",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const {
        maThuoc,
        tenThuoc,
        donViTinh,
        giaBan,
        canDonThuoc,
        danhMucThuocId,
      } = req.body;

      if (maThuoc && !/^[a-zA-Z0-9]+$/.test(maThuoc)) {
        return res.status(400).json({ thongBao: "Mã thuốc chỉ được chứa chữ cái và số" });
      }

      const tenRegex = /^[a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơ\s.,/-]+$/;
      if (tenThuoc && !tenRegex.test(tenThuoc)) {
        return res.status(400).json({ thongBao: "Tên thuốc chứa ký tự không hợp lệ" });
      }
      if (donViTinh && !/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơ\s]+$/.test(donViTinh)) {
        return res.status(400).json({ thongBao: "Đơn vị tính chứa ký tự không hợp lệ" });
      }
      if (req.body.hoatChat && !tenRegex.test(req.body.hoatChat)) {
        return res.status(400).json({ thongBao: "Hoạt chất chứa ký tự không hợp lệ" });
      }
      if (req.body.hamLuong && !tenRegex.test(req.body.hamLuong)) {
        return res.status(400).json({ thongBao: "Hàm lượng chứa ký tự không hợp lệ" });
      }

      const duLieuMoi = await coSoDuLieu.thuoc.create({
        data: {
          maThuoc,
          tenThuoc,
          donViTinh,
          giaBan,
          canDonThuoc: !!canDonThuoc,
          danhMucThuocId,
        },
      });

      await ghiNhatKy(
        req.nguoiDung.id,
        "TAO",
        "THUOC",
        duLieuMoi.id,
        null,
        duLieuMoi,
      );

      return res.status(201).json(duLieuMoi);
    } catch (loi) {
      if (loi.code === "P2002") {
        return res.status(400).json({ 
          thongBao: `Đã tồn tại thuốc có ${loi.meta.target.includes("ten_thuoc") ? "tên" : "mã"} này trong hệ thống` 
        });
      }
      return res.status(400).json({ thongBao: "Lỗi khi thêm mới thuốc" });
    }
  },
);

duongDan.patch(
  "/:id",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const duLieuCu = await coSoDuLieu.thuoc.findUnique({ where: { id } });

      if (!duLieuCu) {
        return res.status(404).json({ thongBao: "Không tìm thấy thông tin thuốc" });
      }

      if (req.body.maThuoc && !/^[a-zA-Z0-9]+$/.test(req.body.maThuoc)) {
        return res.status(400).json({ thongBao: "Mã thuốc chỉ được chứa chữ cái và số" });
      }

      const tenRegex = /^[a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơ\s.,/-]+$/;
      if (req.body.tenThuoc && !tenRegex.test(req.body.tenThuoc)) {
        return res.status(400).json({ thongBao: "Tên thuốc chứa ký tự không hợp lệ" });
      }
      if (req.body.donViTinh && !/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơ\s]+$/.test(req.body.donViTinh)) {
        return res.status(400).json({ thongBao: "Đơn vị tính chứa ký tự không hợp lệ" });
      }
      if (req.body.hoatChat && !tenRegex.test(req.body.hoatChat)) {
        return res.status(400).json({ thongBao: "Hoạt chất chứa ký tự không hợp lệ" });
      }
      if (req.body.hamLuong && !tenRegex.test(req.body.hamLuong)) {
        return res.status(400).json({ thongBao: "Hàm lượng chứa ký tự không hợp lệ" });
      }

      const duLieuMoi = await coSoDuLieu.thuoc.update({
        where: { id },
        data: req.body,
      });

      await ghiNhatKy(
        req.nguoiDung.id,
        "CAP_NHAT",
        "THUOC",
        id,
        duLieuCu,
        duLieuMoi,
      );

      return res.json(duLieuMoi);
    } catch (loi) {
      if (loi.code === "P2002") {
        return res.status(400).json({ 
          thongBao: `Đã tồn tại thuốc có ${loi.meta.target.includes("ten_thuoc") ? "tên" : "mã"} này trong hệ thống` 
        });
      }
      return res.status(400).json({ thongBao: "Lỗi khi cập nhật thông tin thuốc" });
    }
  },
);

module.exports = duongDan;
