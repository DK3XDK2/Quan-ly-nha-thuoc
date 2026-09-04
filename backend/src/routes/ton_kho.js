const express = require("express");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauVaiTro } = require("../middleware/xac_thuc");
const { ghiNhatKy } = require("../services/audit");

const duongDan = express.Router();

duongDan.get("/lo", xacThucTruyCap, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all", categoryId = "all", sortBy = "newest" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    let where = {};
    
    // Tìm kiếm text
    if (search) {
      where.OR = [
        { soLo: { contains: search } },
        { thuoc: { tenThuoc: { contains: search } } },
        { thuoc: { maThuoc: { contains: search } } },
      ];
    }

    // Lọc theo Danh mục
    if (categoryId !== "all" && categoryId !== "") {
      where.thuoc = { ...(where.thuoc || {}), danhMucThuocId: Number(categoryId) };
    }

    // Lọc theo Trạng thái
    if (status !== "all") {
      switch (status) {
        case "low-stock":
          where.soLuongTon = { lte: 20 };
          break;
        case "expiring":
          where.hanSuDung = { gte: now, lte: thirtyDaysLater, not: null };
          where.soLuongTon = { gt: 0 };
          break;
        case "expired":
          where.hanSuDung = { lt: now, not: null };
          break;
        case "stable":
          where.soLuongTon = { gt: 20 };
          where.OR = [
            { hanSuDung: { gt: thirtyDaysLater } },
            { hanSuDung: null }
          ];
          break;
      }
    }

    // Sắp xếp
    let orderBy = { id: "desc" };
    switch (sortBy) {
      case "expiry-asc":
        orderBy = { hanSuDung: "asc" };
        break;
      case "quantity-asc":
        orderBy = { soLuongTon: "asc" };
        break;
      case "name-asc":
        orderBy = { thuoc: { tenThuoc: "asc" } };
        break;
    }

    const [danhSach, total] = await Promise.all([
      coSoDuLieu.loTonKho.findMany({
        where,
        include: {
          thuoc: {
            include: {
              danhMucThuoc: true,
            },
          },
        },
        orderBy,
        skip: skip,
        take: Number(limit),
      }),
      coSoDuLieu.loTonKho.count({ where })
    ]);

    return res.json({
      danhSach,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (loi) {
    console.error("Lỗi lấy tồn kho:", loi);
    return res.status(500).json({ thongBao: "Lỗi khi lấy dữ liệu tồn kho" });
  }
});

duongDan.get("/thong-ke", xacThucTruyCap, async (req, res) => {
  try {
    const homNay = new Date();
    const baMuoiNgayToi = new Date();
    baMuoiNgayToi.setDate(homNay.getDate() + 30);

    const [tongLo, sapHetHang, sapHetHan, tongSoLuong] = await Promise.all([
      coSoDuLieu.loTonKho.count(),
      coSoDuLieu.loTonKho.count({ where: { soLuongTon: { lte: 20, gt: 0 } } }),
      coSoDuLieu.loTonKho.count({ 
        where: { 
          hanSuDung: { gte: homNay, lte: baMuoiNgayToi },
          soLuongTon: { gt: 0 }
        } 
      }),
      coSoDuLieu.loTonKho.aggregate({ _sum: { soLuongTon: true } })
    ]);

    return res.json({
      tongLo,
      sapHetHang,
      sapHetHan,
      tongSoLuong: tongSoLuong._sum.soLuongTon || 0
    });
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi lấy thống kê" });
  }
});

duongDan.post(
  "/lo",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const { thuocId, soLo, hanSuDung, soLuongTon, giaNhap } = req.body;

      if (soLo && !/^[a-zA-Z0-9]+$/.test(soLo)) {
        return res.status(400).json({ thongBao: "Số lô chỉ được chứa chữ cái và số" });
      }

      const loMoi = await coSoDuLieu.loTonKho.create({
        data: {
          thuocId,
          soLo,
          hanSuDung: hanSuDung ? new Date(hanSuDung) : null,
          soLuongTon,
          giaNhap,
        },
      });

      await ghiNhatKy(
        req.nguoiDung.id,
        "NHAP_KHO",
        "LO_TON_KHO",
        loMoi.id,
        null,
        loMoi,
      );

      return res.status(201).json(loMoi);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi khi tạo lô tồn kho" });
    }
  },
);

duongDan.patch(
  "/lo/:id",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const duLieuCu = await coSoDuLieu.loTonKho.findUnique({ where: { id } });

      if (!duLieuCu) {
        return res.status(404).json({ thongBao: "Không tìm thấy lô tồn kho" });
      }

      const duLieuCapNhat = {
        ...req.body,
      };

      if (duLieuCapNhat.hanSuDung !== undefined) {
        duLieuCapNhat.hanSuDung = duLieuCapNhat.hanSuDung ? new Date(duLieuCapNhat.hanSuDung) : null;
      }

      if (duLieuCapNhat.soLo && !/^[a-zA-Z0-9]+$/.test(duLieuCapNhat.soLo)) {
        return res.status(400).json({ thongBao: "Số lô chỉ được chứa chữ cái và số" });
      }

      const loMoi = await coSoDuLieu.loTonKho.update({
        where: { id },
        data: duLieuCapNhat,
      });

      await ghiNhatKy(
        req.nguoiDung.id,
        "CAP_NHAT",
        "LO_TON_KHO",
        loMoi.id,
        duLieuCu,
        loMoi,
      );

      return res.json(loMoi);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi khi cập nhật lô tồn kho" });
    }
  },
);

duongDan.get("/lich-su-xuat", xacThucTruyCap, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (search) {
      where.OR = [
        { loTonKho: { soLo: { contains: search } } },
        { loTonKho: { thuoc: { tenThuoc: { contains: search } } } },
        { maLienQuan: { contains: search } }
      ];
    }

    const [danhSach, total] = await Promise.all([
      coSoDuLieu.lichSuXuatKho.findMany({
        where,
        include: {
          loTonKho: {
            include: {
              thuoc: true
            }
          }
        },
        orderBy: { taoLuc: "desc" },
        skip,
        take: Number(limit),
      }),
      coSoDuLieu.lichSuXuatKho.count({ where })
    ]);

    return res.json({
      danhSach,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (loi) {
    console.error("Lỗi lấy lịch sử xuất kho:", loi);
    return res.status(500).json({ thongBao: "Lỗi hệ thống" });
  }
});

module.exports = duongDan;
