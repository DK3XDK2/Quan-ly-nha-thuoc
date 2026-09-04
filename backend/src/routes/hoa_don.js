const express = require("express");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauVaiTro } = require("../middleware/xac_thuc");
const { ghiNhatKy } = require("../services/audit");

const duongDan = express.Router();

duongDan.get("/", xacThucTruyCap, async (req, res) => {
  const danhSach = await coSoDuLieu.hoaDon.findMany({
    include: {
      chiTietHoaDon: {
        include: {
          thuoc: {
            include: { danhMucThuoc: true }
          }
        }
      },
      nguoiTao: true,
      donThuoc: true,
    },
    orderBy: { taoLuc: "desc" },
  });

  return res.json(danhSach);
});

duongDan.get("/:id", xacThucTruyCap, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const hoaDon = await coSoDuLieu.hoaDon.findUnique({
      where: { id },
      include: {
        chiTietHoaDon: {
          include: {
            thuoc: {
              include: { danhMucThuoc: true }
            }
          }
        },
        nguoiTao: true,
        donThuoc: true,
      }
    });

    if (!hoaDon) {
      return res.status(404).json({ thongBao: "Không tìm thấy hóa đơn" });
    }

    return res.json(hoaDon);
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi lấy chi tiết hóa đơn" });
  }
});

duongDan.post(
  "/",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const { phuongThucThanhToan, chiTiet, donThuocId, khachHangId } = req.body;

      for (const dong of chiTiet || []) {
        const thuoc = await coSoDuLieu.thuoc.findUnique({
          where: { id: dong.thuocId },
          include: { loTonKho: { where: { soLuongTon: { gt: 0 } } } }
        });

        if (!thuoc) throw new Error(`Thuốc id ${dong.thuocId} không tồn tại`);
        
        const tongTon = thuoc.loTonKho.reduce((s, l) => s + l.soLuongTon, 0);
        if (Number(dong.soLuong) > tongTon) {
          throw new Error(`Thuốc "${thuoc.tenThuoc}" không đủ hàng (Còn ${tongTon}, yêu cầu ${dong.soLuong})`);
        }
      }

      const danhSachThuoc = await Promise.all(
        (chiTiet || []).map((dong) =>
          coSoDuLieu.thuoc.findUnique({
            where: { id: dong.thuocId },
            select: { id: true, giaBan: true, donViTinh: true },
          }),
        ),
      );

      let tongTien = 0;
      const duLieuChiTiet = (chiTiet || []).map((dong, chiSo) => {
        const thuoc = danhSachThuoc[chiSo];
        const donGia = Number(thuoc?.giaBan || 0);
        const thanhTien = donGia * Number(dong.soLuong || 0);
        tongTien += thanhTien;

        return {
          thuocId: dong.thuocId,
          soLuong: Number(dong.soLuong),
          donViTinh: dong.donViTinh || thuoc?.donViTinh || "Cái",
          donGia,
          thanhTien,
        };
      });

      const hoaDon = await coSoDuLieu.hoaDon.create({
        data: {
          nguoiTaoId: req.nguoiDung.id,
          donThuocId: donThuocId || null,
          khachHangId: khachHangId || null,
          tongTien,
          phuongThucThanhToan,
          chiTietHoaDon: {
            create: duLieuChiTiet,
          },
        },
        include: { chiTietHoaDon: true },
      });

      for (const item of duLieuChiTiet) {
        let soLuongCanTru = item.soLuong;
        
        const danhSachLo = await coSoDuLieu.loTonKho.findMany({
          where: { thuocId: item.thuocId, soLuongTon: { gt: 0 } },
          orderBy: [{ hanSuDung: "asc" }, { id: "asc" }]
        });

        for (const lo of danhSachLo) {
          if (soLuongCanTru <= 0) break;
          const truNay = Math.min(lo.soLuongTon, soLuongCanTru);

          await coSoDuLieu.loTonKho.update({
            where: { id: lo.id },
            data: { soLuongTon: { decrement: truNay } }
          });

          await coSoDuLieu.lichSuXuatKho.create({
            data: {
              loTonKhoId: lo.id,
              soLuongXuat: truNay,
              nguoiXuatId: req.nguoiDung.id,
              liDoXuat: "BAN_TAI_QUAY",
              thamChieuId: hoaDon.id,
              loaiThamChieu: "HOA_DON",
            }
          });

          soLuongCanTru -= truNay;
        }
      }

      await ghiNhatKy(
        req.nguoiDung.id,
        "TAO",
        "HOA_DON",
        hoaDon.id,
        null,
        hoaDon,
      );

      return res.status(201).json(hoaDon);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Loi tao hoa don" });
    }
  },
);

module.exports = duongDan;
