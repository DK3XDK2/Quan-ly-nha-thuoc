const express = require("express");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauVaiTro } = require("../middleware/xac_thuc");
const { ghiNhatKy } = require("../services/audit");

const duongDan = express.Router();

duongDan.get("/", xacThucTruyCap, async (req, res) => {
  const danhSach = await coSoDuLieu.donThuoc.findMany({
    include: {
      chiTietDonThuoc: {
        include: {
          thuoc: true,
        },
      },
      nguoiTao: true,
    },
    orderBy: { taoLuc: "desc" },
  });

  return res.json(danhSach);
});

duongDan.post(
  "/",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const { tenBenhNhan, tenBacSi, chiTiet } = req.body;

      if (!tenBenhNhan || !tenBacSi) {
        return res.status(400).json({ thongBao: "Tên bệnh nhân và Bác sĩ không được để trống" });
      }

      const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơ\s.]+$/;
      if (!nameRegex.test(tenBenhNhan) || !nameRegex.test(tenBacSi)) {
        return res.status(400).json({ thongBao: "Tên bệnh nhân hoặc bác sĩ chứa ký tự đặc biệt không hợp lệ" });
      }

      const don = await coSoDuLieu.donThuoc.create({
        data: {
          tenBenhNhan,
          tenBacSi,
          nguoiTaoId: req.nguoiDung.id,
          chiTietDonThuoc: {
            create: (chiTiet || []).map((dong) => {
              const lieuDungRegex = /^[a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơ\s.,/]+$/;
              if (dong.lieuDung && !lieuDungRegex.test(dong.lieuDung)) {
                throw new Error(`Liều dùng "${dong.lieuDung}" chứa ký tự không hợp lệ`);
              }
              return {
                thuocId: dong.thuocId,
                soLuong: dong.soLuong,
                lieuDung: dong.lieuDung,
              };
            }),
          },
        },
        include: {
          chiTietDonThuoc: {
            include: {
              thuoc: true,
            },
          },
        },
      });

      await ghiNhatKy(req.nguoiDung.id, "TAO", "DON_THUOC", don.id, null, don);

      return res.status(201).json(don);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi khi tạo đơn thuốc" });
    }
  },
);

duongDan.patch(
  "/:id/trang-thai",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { trangThai } = req.body;

      const duLieuCu = await coSoDuLieu.donThuoc.findUnique({ where: { id } });

      if (!duLieuCu) {
        return res.status(404).json({ thongBao: "Không tìm thấy đơn thuốc" });
      }

      const duLieuMoi = await coSoDuLieu.donThuoc.update({
        where: { id },
        data: { trangThai },
      });

      await ghiNhatKy(
        req.nguoiDung.id,
        "DUYET",
        "DON_THUOC",
        id,
        duLieuCu,
        duLieuMoi,
      );

      return res.json(duLieuMoi);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi khi cập nhật trạng thái đơn thuốc" });
    }
  },
);

module.exports = duongDan;
