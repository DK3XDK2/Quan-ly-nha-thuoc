const express = require("express");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauVaiTro } = require("../middleware/xac_thuc");
const { ghiNhatKy } = require("../services/audit");

const duongDan = express.Router();

duongDan.get("/", xacThucTruyCap, yeuCauVaiTro("QUAN_LY"), async (req, res) => {
  try {
    const tuKhoa = String(req.query?.tuKhoa || "").trim();

    const danhSach = await coSoDuLieu.nhaCungCap.findMany({
      where: tuKhoa
        ? {
            OR: [
              { maNhaCungCap: { contains: tuKhoa } },
              { tenNhaCungCap: { contains: tuKhoa } },
              { soDienThoai: { contains: tuKhoa } },
              { email: { contains: tuKhoa } },
              { nguoiLienHe: { contains: tuKhoa } },
            ],
          }
        : undefined,
      orderBy: { id: "desc" },
    });

    return res.json(danhSach);
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi khi lấy danh sách nhà cung cấp" });
  }
});

duongDan.post(
  "/",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    try {
      const {
        maNhaCungCap,
        tenNhaCungCap,
        nguoiLienHe,
        soDienThoai,
        email,
        diaChi,
        ghiChu,
      } = req.body;
      if (!maNhaCungCap || !tenNhaCungCap || !soDienThoai) {
        return res.status(400).json({ thongBao: "Thiếu dữ liệu nhà cung cấp" });
      }

      const daTonTai = await coSoDuLieu.nhaCungCap.findUnique({
        where: { maNhaCungCap },
      });
      if (daTonTai) {
        return res.status(409).json({ thongBao: "Mã nhà cung cấp đã tồn tại" });
      }

      const duLieuMoi = await coSoDuLieu.nhaCungCap.create({
        data: {
          maNhaCungCap: String(maNhaCungCap).trim(),
          tenNhaCungCap: String(tenNhaCungCap).trim(),
          nguoiLienHe: nguoiLienHe ? String(nguoiLienHe).trim() : null,
          soDienThoai: String(soDienThoai).trim(),
          email: email ? String(email).trim() : null,
          diaChi: diaChi ? String(diaChi).trim() : null,
          ghiChu: ghiChu ? String(ghiChu).trim() : null,
        },
      });

      await ghiNhatKy(
        req.nguoiDung.id,
        "TAO",
        "NHA_CUNG_CAP",
        duLieuMoi.id,
        null,
        duLieuMoi,
      );

      return res.status(201).json(duLieuMoi);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi khi tạo nhà cung cấp" });
    }
  },
);

duongDan.patch(
  "/:id",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res
          .status(400)
          .json({ thongBao: "ID nhà cung cấp không hợp lệ" });
      }

      const duLieuCu = await coSoDuLieu.nhaCungCap.findUnique({
        where: { id },
      });
      if (!duLieuCu) {
        return res
          .status(404)
          .json({ thongBao: "Không tìm thấy nhà cung cấp" });
      }

      const duLieuCapNhat = {};
      const truongDuocCapNhat = [
        "maNhaCungCap",
        "tenNhaCungCap",
        "nguoiLienHe",
        "soDienThoai",
        "email",
        "diaChi",
        "ghiChu",
      ];

      truongDuocCapNhat.forEach((truong) => {
        if (Object.prototype.hasOwnProperty.call(req.body, truong)) {
          const giaTri = req.body[truong];
          duLieuCapNhat[truong] =
            typeof giaTri === "string" ? giaTri.trim() || null : giaTri;
        }
      });

      if (Object.keys(duLieuCapNhat).length === 0) {
        return res.json({ thongBao: "Không có dữ liệu mới để cập nhật" });
      }

      if (
        duLieuCapNhat.maNhaCungCap &&
        duLieuCapNhat.maNhaCungCap !== duLieuCu.maNhaCungCap
      ) {
        const maBiTrung = await coSoDuLieu.nhaCungCap.findUnique({
          where: { maNhaCungCap: duLieuCapNhat.maNhaCungCap },
        });

        if (maBiTrung) {
          return res
            .status(409)
            .json({ thongBao: "Ma nha cung cap da ton tai" });
        }
      }

      const duLieuMoi = await coSoDuLieu.nhaCungCap.update({
        where: { id },
        data: duLieuCapNhat,
      });

      await ghiNhatKy(
        req.nguoiDung.id,
        "CAP_NHAT",
        "NHA_CUNG_CAP",
        id,
        duLieuCu,
        duLieuMoi,
      );

      return res.json(duLieuMoi);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi khi cập nhật nhà cung cấp" });
    }
  },
);

duongDan.delete(
  "/:id",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res
          .status(400)
          .json({ thongBao: "Id nha cung cap khong hop le" });
      }

      const duLieuCu = await coSoDuLieu.nhaCungCap.findUnique({
        where: { id },
      });

      if (!duLieuCu) {
        return res
          .status(404)
          .json({ thongBao: "Khong tim thay nha cung cap" });
      }

      await coSoDuLieu.nhaCungCap.delete({ where: { id } });

      await ghiNhatKy(
        req.nguoiDung.id,
        "XOA",
        "NHA_CUNG_CAP",
        id,
        duLieuCu,
        null,
      );

      return res.json({ thongBao: "Xóa nhà cung cấp thành công" });
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi khi xóa nhà cung cấp" });
    }
  },
);

module.exports = duongDan;
