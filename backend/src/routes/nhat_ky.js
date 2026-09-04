const express = require("express");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauVaiTro } = require("../middleware/xac_thuc");

const duongDan = express.Router();

duongDan.get("/", xacThucTruyCap, yeuCauVaiTro("QUAN_LY"), async (req, res) => {
  try {
    const { actionType, module, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (actionType && actionType !== "ALL") {
      where.hanhDong = actionType;
    }
    if (module && module !== "ALL") {
      where.doiTuong = module;
    }
    if (search) {
      where.OR = [
        { doiTuong: { contains: search } },
        { hanhDong: { contains: search } },
        { nguoiThucHien: { hoTen: { contains: search } } },
      ];
    }

    const [logs, total] = await Promise.all([
      coSoDuLieu.nhatKyHeThong.findMany({
        where,
        include: {
          nguoiThucHien: {
            select: {
              hoTen: true,
              vaiTro: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { taoLuc: "desc" },
        skip,
        take: Number(limit),
      }),
      coSoDuLieu.nhatKyHeThong.count({ where }),
    ]);

    return res.json({
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (loi) {
    console.error("Lỗi lấy nhật ký:", loi);
    return res.status(500).json({ thongBao: "Lỗi khi lấy nhật ký hệ thống" });
  }
});

duongDan.post("/", xacThucTruyCap, async (req, res) => {
    try {
        const { hanhDong, doiTuong, doiTuongId, truocThayDoi, sauThayDoi } = req.body;
        
        const log = await coSoDuLieu.nhatKyHeThong.create({
            data: {
                nguoiThucHienId: req.nguoiDung.id,
                hanhDong,
                doiTuong,
                doiTuongId,
                truocThayDoi,
                sauThayDoi,
                loaiTacNhan: "USER"
            }
        });
        
        return res.status(201).json(log);
    } catch (loi) {
        return res.status(400).json({ thongBao: "Lỗi khi tạo nhật ký" });
    }
});

module.exports = duongDan;
