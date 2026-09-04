const express = require("express");
const { coSoDuLieu } = require("../config/database");
const {
  xacThucTruyCap,
  yeuCauKhachHang,
  yeuCauVaiTro,
} = require("../middleware/xac_thuc");

const duongDan = express.Router();

function taoMaDonHang() {
  return `DH${Date.now()}`;
}

async function tinhChiTietDonHang(chiTiet, tx = null) {
  const db = tx || coSoDuLieu;
  const danhSachThuoc = await Promise.all(
    chiTiet.map((dong) =>
      db.thuoc.findUnique({
        where: { id: dong.thuocId },
        include: {
          loTonKho: {
            where: { soLuongTon: { gt: 0 } },
          },
        },
      }),
    ),
  );

  const duLieuChiTiet = [];
  let tongTienHang = 0;

  for (let i = 0; i < chiTiet.length; i += 1) {
    const dong = chiTiet[i];
    const thuoc = danhSachThuoc[i];

    if (!thuoc) {
      throw new Error(`Sản phẩm ID ${dong.thuocId} không tồn tại hoặc đã ngừng kinh doanh`);
    }

    const soLuongYeuCau = Number(dong.soLuong || 0);
    const tonKhoTuLo = thuoc.loTonKho && thuoc.loTonKho.length > 0 ? thuoc.loTonKho.reduce((s, lo) => s + lo.soLuongTon, 0) : 0;
    const tongTonKho = tonKhoTuLo > 0 ? tonKhoTuLo : (thuoc.tonKho !== null && thuoc.tonKho !== undefined ? Number(thuoc.tonKho) : 999);

    if (tongTonKho < soLuongYeuCau) {
      throw new Error(
        `Sản phẩm "${thuoc.tenThuoc}" chỉ còn ${tongTonKho} sản phẩm trong kho (bạn yêu cầu ${soLuongYeuCau}).`,
      );
    }

    const donGia = Number(thuoc.giaBan);
    const thanhTien = donGia * soLuongYeuCau;
    tongTienHang += thanhTien;

    duLieuChiTiet.push({
      thuocId: dong.thuocId,
      soLuong: soLuongYeuCau,
      donGia,
      thanhTien,
    });
  }

  return { duLieuChiTiet, tongTienHang };
}

async function truTonKho(donHangId, nguoiThucHienId) {
  const donHang = await coSoDuLieu.donHang.findUnique({
    where: { id: donHangId },
    include: {
      chiTietDonHang: true,
    },
  });

  if (!donHang || donHang.daTruKho) return;

  let idNhanVienThucHien = nguoiThucHienId;
  if (!idNhanVienThucHien) {
    const nhanVien = await coSoDuLieu.nguoiDung.findFirst({
      select: { id: true },
    });
    idNhanVienThucHien = nhanVien ? nhanVien.id : 1;
  }

  for (const chiTiet of donHang.chiTietDonHang) {
    let soLuongCanTru = chiTiet.soLuong;
    const danhSachLo = await coSoDuLieu.loTonKho.findMany({
      where: {
        thuocId: chiTiet.thuocId,
        soLuongTon: { gt: 0 },
      },
      orderBy: [
        { hanSuDung: "asc" },
        { id: "asc" },
      ],
    });

    for (const lo of danhSachLo) {
      if (soLuongCanTru <= 0) break;

      const soLuongTruTuLoNay = Math.min(lo.soLuongTon, soLuongCanTru);

      await coSoDuLieu.loTonKho.update({
        where: { id: lo.id },
        data: {
          soLuongTon: { decrement: soLuongTruTuLoNay },
        },
      });

      await coSoDuLieu.lichSuXuatKho.create({
        data: {
          loTonKhoId: lo.id,
          soLuongXuat: soLuongTruTuLoNay,
          nguoiXuatId: idNhanVienThucHien,
          liDoXuat: "BAN_HANG",
          thamChieuId: donHang.id,
          loaiThamChieu: "DON_HANG",
        },
      });

      soLuongCanTru -= soLuongTruTuLoNay;
    }
  }

  await coSoDuLieu.donHang.update({
    where: { id: donHangId },
    data: { daTruKho: true },
  });
}

function xacThucTuyChon(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const jwt = require("jsonwebtoken");
      const giaiMa = jwt.verify(token, process.env.JWT_SECRET || "bi_mat_khong_tiet_lo");
      req.nguoiDung = giaiMa;
    } catch (e) {}
  }
  next();
}

duongDan.post(
  ["/dat-hang", "/dat-hang-da-dang-nhap"],
  xacThucTuyChon,
  async (req, res) => {
    try {
      const {
        tenNguoiNhan,
        soDienThoaiNhan,
        emailNguoiNhan,
        diaChiGiao,
        ghiChu,
        phiGiaoHang,
        chiTiet,
        phuongThucThanhToan,
      } = req.body;

      if (
        !tenNguoiNhan ||
        !soDienThoaiNhan ||
        !diaChiGiao ||
        !Array.isArray(chiTiet) ||
        chiTiet.length === 0
      ) {
        return res.status(400).json({ thongBao: "Vui lòng nhập đầy đủ dữ liệu đặt hàng" });
      }

      if (tenNguoiNhan.trim().length < 2) {
        return res.status(400).json({ thongBao: "Họ và tên nhận hàng phải có ít nhất 2 ký tự" });
      }
      const sdtRegex = /^[0-9]{10,11}$/;
      const sdtSach = soDienThoaiNhan.replace(/[\s\.]/g, "");
      if (!sdtRegex.test(sdtSach)) {
        return res.status(400).json({ thongBao: "Số điện thoại nhận hàng không hợp lệ (phải gồm 10-11 chữ số)" });
      }
      if (diaChiGiao.trim().length < 5) {
        return res.status(400).json({ thongBao: "Địa chỉ giao hàng quá ngắn, vui lòng nhập chi tiết hơn" });
      }

      // Xử lý xác định id Khách hàng (hoặc tự tạo nếu chưa có)
      let targetKhachHangId = null;
      if (req.nguoiDung && req.nguoiDung.id) {
        const foundKh = await coSoDuLieu.khachHang.findUnique({ where: { id: req.nguoiDung.id } });
        if (foundKh) targetKhachHangId = foundKh.id;
      }
      if (!targetKhachHangId) {
        let kh = await coSoDuLieu.khachHang.findFirst({ where: { soDienThoai: sdtSach } });
        if (!kh) {
          kh = await coSoDuLieu.khachHang.create({
            data: {
              hoTen: tenNguoiNhan,
              soDienThoai: sdtSach,
              email: emailNguoiNhan || `${sdtSach}@ainapharmacy.vn`,
              matKhau: "123456"
            }
          });
        }
        targetKhachHangId = kh.id;
      }

      const donHang = await coSoDuLieu.$transaction(async (tx) => {
        const { duLieuChiTiet, tongTienHang } = await tinhChiTietDonHang(chiTiet, tx);
        const giaShip = Number(phiGiaoHang || 0);
        const tongThanhToan = tongTienHang + giaShip;

        return await tx.donHang.create({
          data: {
            maDonHang: taoMaDonHang(),
            khachHangId: targetKhachHangId,
            tenNguoiNhan,
            soDienThoaiNhan,
            emailNguoiNhan,
            diaChiGiao,
            ghiChu,
            tongTienHang,
            phiGiaoHang: giaShip,
            tongThanhToan,
            phuongThucThanhToan: phuongThucThanhToan || "CASH",
            chiTietDonHang: {
              create: duLieuChiTiet,
            },
          },
          include: { chiTietDonHang: true },
        });
      });

      if (phuongThucThanhToan === "SEPAY") {
        return res.status(201).json({
          thongBao: "Khởi tạo thanh toán SePay thành công",
          duLieu: { 
            ...donHang, 
            maDonHang: donHang.maDonHang,
            tongThanhToan: donHang.tongThanhToan,
            bankId: process.env.BANK_ID || "ICB",
            accountNo: process.env.BANK_ACCOUNT_NO || "CHUA_CO_STK",
            accountName: process.env.BANK_ACCOUNT_NAME || "CHUA_CO_TEN"
          }
        });
      }

      return res
        .status(201)
        .json({ thongBao: "Đặt hàng thành công", duLieu: donHang });
    } catch (loi) {
      console.error("Lỗi đặt hàng:", loi);
      return res.status(400).json({ thongBao: loi.message || "Lỗi khi đặt hàng" });
    }
  },
);

duongDan.get("/lich-su", xacThucTruyCap, yeuCauKhachHang, async (req, res) => {
  const danhSach = await coSoDuLieu.donHang.findMany({
    where: { khachHangId: req.nguoiDung.id },
    include: {
      chiTietDonHang: {
        include: {
          thuoc: true,
        },
      },
    },
    orderBy: { taoLuc: "desc" },
  });

  return res.json(danhSach);
});

duongDan.get(
  "/quan-ly",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    const danhSach = await coSoDuLieu.donHang.findMany({
      include: {
        khachHang: true,
        chiTietDonHang: {
          include: {
            thuoc: true,
          },
        },
      },
      orderBy: { taoLuc: "desc" },
    });

    return res.json(danhSach);
  },
);

duongDan.get("/:id", xacThucTruyCap, yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const donHang = await coSoDuLieu.donHang.findUnique({
      where: { id },
      include: {
        khachHang: true,
        chiTietDonHang: {
          include: {
            thuoc: true,
          },
        },
      }
    });

    if (!donHang) {
      return res.status(404).json({ thongBao: "Không tìm thấy đơn hàng" });
    }

    return res.json(donHang);
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi lấy chi tiết đơn hàng" });
  }
});

duongDan.patch(
  "/khach-hang-huy-don/:id",
  xacThucTruyCap,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const khachHangId = req.nguoiDung.id;

      const donHang = await coSoDuLieu.donHang.findUnique({
        where: { id },
      });

      if (!donHang) {
        return res.status(404).json({ thongBao: "Không tìm thấy đơn hàng" });
      }

      if (donHang.khachHangId !== khachHangId && req.nguoiDung.vaiTro === "KHACH_HANG") {
        return res
          .status(403)
          .json({ thongBao: "Bạn không có quyền hủy đơn hàng này" });
      }

      if (donHang.trangThai !== "MOI_TAO" && donHang.trangThai !== "DA_XAC_NHAN" && donHang.trangThai !== "DANG_GIAO") {
        return res.status(400).json({
          thongBao: "Không thể hủy đơn hàng ở trạng thái hiện tại",
        });
      }

      let trangThaiMoi = "HUY";
      let thongBao = "Hủy đơn hàng thành công";

      if (donHang.phuongThucThanhToan !== "CASH" && (donHang.trangThai === "DA_XAC_NHAN" || donHang.trangThai === "DANG_GIAO")) {
        trangThaiMoi = "YEU_CAU_HOAN_TIEN";
        thongBao = "Đơn hàng đã được ghi nhận hủy. Hệ thống sẽ tiến hành hoàn tiền cho bạn.";
      }

      const duLieuMoi = await coSoDuLieu.donHang.update({
        where: { id },
        data: { trangThai: trangThaiMoi },
      });

      return res.json({
        thongBao,
        duLieu: duLieuMoi,
      });
    } catch (loi) {
      console.error("Lỗi hủy đơn hàng:", loi);
      return res.status(400).json({ thongBao: "Lỗi khi hủy đơn hàng" });
    }
  },
);

duongDan.patch(
  "/:id/khach-hang-nhan-hang",
  xacThucTruyCap,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const khachHangId = req.nguoiDung.id;

      const donHang = await coSoDuLieu.donHang.findUnique({
        where: { id },
      });

      if (!donHang) {
        return res.status(404).json({ thongBao: "Không tìm thấy đơn hàng" });
      }

      if (donHang.khachHangId !== khachHangId) {
        return res
          .status(403)
          .json({ thongBao: "Bạn không có quyền xác nhận đơn hàng này" });
      }

      if (donHang.trangThai !== "DA_XAC_NHAN" && donHang.trangThai !== "DANG_GIAO") {
        return res.status(400).json({
          thongBao: "Trạng thái đơn hàng không hợp lệ để xác nhận đã nhận",
        });
      }

      const duLieuMoi = await coSoDuLieu.donHang.update({
        where: { id },
        data: { trangThai: "HOAN_TAT" },
      });

      await truTonKho(id, null);

      return res.json({
        thongBao: "Xác nhận đã nhận hàng thành công",
        duLieu: duLieuMoi,
      });
    } catch (loi) {
      console.error("Lỗi xác nhận nhận hàng:", loi);
      return res.status(400).json({ thongBao: "Lỗi khi xác nhận nhận hàng" });
    }
  },
);

duongDan.patch(
  "/:id/yeu-cau-tra-hang",
  xacThucTruyCap,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { lyDo } = req.body || {};

      const donHang = await coSoDuLieu.donHang.findUnique({
        where: { id },
      });

      if (!donHang) {
        return res.status(404).json({ thongBao: "Không tìm thấy đơn hàng" });
      }

      if (donHang.trangThai !== "HOAN_TAT") {
        return res.status(400).json({ thongBao: "Chỉ đơn hàng đã hoàn thành mới có thể gửi yêu cầu trả hàng / hoàn tiền" });
      }

      const ghiChuMoi = `[YÊU CẦU TRẢ HÀNG]: ${lyDo || "Khách không ghi lý do"}. (Ghi chú cũ: ${donHang.ghiChu || "Không"})`;

      const duLieuMoi = await coSoDuLieu.donHang.update({
        where: { id },
        data: {
          trangThai: "YEU_CAU_HOAN_TIEN",
          ghiChu: ghiChuMoi,
        },
      });

      return res.json({
        thongBao: "Đã gửi yêu cầu trả hàng / hoàn tiền thành công",
        duLieu: duLieuMoi,
      });
    } catch (loi) {
      console.error("Lỗi yêu cầu trả hàng:", loi);
      return res.status(400).json({ thongBao: "Lỗi khi gửi yêu cầu trả hàng" });
    }
  },
);

duongDan.patch(
  "/:id/trang-thai",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { trangThai } = req.body;

      const donHangHienTai = await coSoDuLieu.donHang.findUnique({
        where: { id },
      });

      if (!donHangHienTai) {
        return res.status(404).json({ thongBao: "Không tìm thấy đơn hàng" });
      }

      if (donHangHienTai.trangThai === trangThai) {
        return res.status(400).json({ thongBao: `Đơn hàng đã ở trạng thái "${trangThai}" từ trước!` });
      }

      const duLieuMoi = await coSoDuLieu.donHang.update({
        where: { id },
        data: { trangThai },
      });

      if (trangThai === "HOAN_TAT") {
        await truTonKho(id, req.nguoiDung.id);
      }

      return res.json(duLieuMoi);
    } catch (loi) {
      return res
        .status(400)
        .json({ thongBao: "Lỗi khi cập nhật trạng thái đơn hàng" });
    }
  },
);

module.exports = duongDan;
