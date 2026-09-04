const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { coSoDuLieu } = require("../config/database");
const {
  xacThucTruyCap,
  yeuCauKhachHang,
  yeuCauVaiTro,
} = require("../middleware/xac_thuc");

const duongDan = express.Router();

duongDan.get(
  "/quan-ly",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    const danhSachKhachHang = await coSoDuLieu.khachHang.findMany({
      select: {
        id: true,
        hoTen: true,
        email: true,
        soDienThoai: true,
        diaChi: true,
        taoLuc: true,
        _count: {
          select: {
            donHang: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });

    return res.json(danhSachKhachHang);
  },
);

duongDan.post(
  "/quan-ly",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const { hoTen, email, soDienThoai, diaChi, matKhau } = req.body;

      if (!hoTen || !email || !soDienThoai || !matKhau) {
        return res
          .status(400)
          .json({ thongBao: "Vui lòng nhập đầy đủ thông tin khách hàng" });
      }

      const matKhauDaMaHoa = await bcrypt.hash(matKhau, 10);

      const khachMoi = await coSoDuLieu.khachHang.create({
        data: {
          hoTen,
          email,
          soDienThoai,
          diaChi,
          matKhau: matKhauDaMaHoa,
        },
        select: {
          id: true,
          hoTen: true,
          email: true,
          soDienThoai: true,
          diaChi: true,
          taoLuc: true,
        },
      });

      return res.status(201).json({
        thongBao: "Tạo khách hàng thành công",
        duLieu: khachMoi,
      });
    } catch (loi) {
      return res.status(500).json({ thongBao: "Lỗi khi tạo khách hàng" });
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

      if (!id) {
        return res.status(400).json({ thongBao: "Id khach hang khong hop le" });
      }

      const { hoTen, email, soDienThoai, diaChi, matKhau } = req.body;
      const duLieuCapNhat = {};

      if (typeof hoTen === "string") duLieuCapNhat.hoTen = hoTen;
      if (typeof email === "string") duLieuCapNhat.email = email;
      if (typeof soDienThoai === "string")
        duLieuCapNhat.soDienThoai = soDienThoai;
      if (typeof diaChi === "string") duLieuCapNhat.diaChi = diaChi;

      if (typeof matKhau === "string" && matKhau.trim()) {
        duLieuCapNhat.matKhau = await bcrypt.hash(matKhau, 10);
      }

      if (Object.keys(duLieuCapNhat).length === 0) {
        return res
          .status(400)
          .json({ thongBao: "Không có dữ liệu mới để cập nhật" });
      }

      if (duLieuCapNhat.email || duLieuCapNhat.soDienThoai) {
        const dieuKienXungDot = [];
        if (duLieuCapNhat.email) {
          dieuKienXungDot.push({ email: duLieuCapNhat.email });
        }
        if (duLieuCapNhat.soDienThoai) {
          dieuKienXungDot.push({ soDienThoai: duLieuCapNhat.soDienThoai });
        }

        const banGhiXungDot = await coSoDuLieu.khachHang.findFirst({
          where: {
            id: { not: id },
            OR: dieuKienXungDot,
          },
        });

        if (banGhiXungDot) {
          return res
            .status(409)
            .json({ thongBao: "Email hoặc số điện thoại này đã tồn tại" });
        }
      }

      const khachHang = await coSoDuLieu.khachHang.update({
        where: { id },
        data: duLieuCapNhat,
        select: {
          id: true,
          hoTen: true,
          email: true,
          soDienThoai: true,
          diaChi: true,
          taoLuc: true,
          capNhatLuc: true,
        },
      });

      return res.json({
        thongBao: "Cập nhật khách hàng thành công",
        duLieu: khachHang,
      });
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi khi cập nhật khách hàng" });
    }
  },
);

duongDan.get(
  "/:id/lich-su-mua-hang",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({ thongBao: "ID khách hàng không hợp lệ" });
    }

    const khachHang = await coSoDuLieu.khachHang.findUnique({
      where: { id },
      select: {
        id: true,
        hoTen: true,
        email: true,
        soDienThoai: true,
        diaChi: true,
        donHang: {
          include: {
            chiTietDonHang: {
              include: {
                thuoc: true,
              },
            },
          },
          orderBy: { id: "desc" },
        },
      },
    });

    if (!khachHang) {
      return res.status(404).json({ thongBao: "Khong tim thay khach hang" });
    }

    return res.json({
      khachHang: {
        id: khachHang.id,
        hoTen: khachHang.hoTen,
        email: khachHang.email,
        soDienThoai: khachHang.soDienThoai,
        diaChi: khachHang.diaChi,
      },
      lichSuMuaHang: khachHang.donHang,
    });
  },
);

async function dangKyKhachHang(req, res) {
  try {
    const { hoTen, email, soDienThoai, diaChi, matKhau } = req.body;

    if (!hoTen || !email || !soDienThoai || !matKhau) {
      return res.status(400).json({ thongBao: "Vui lòng nhập đầy đủ thông tin đăng ký" });
    }

    if (hoTen.length > 50) {
      return res.status(400).json({ thongBao: "Họ tên không được vượt quá 50 ký tự" });
    }

    const regexTen = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠỨỪỬỮỰẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăâêôơứừửữựấầẩẫậắằẳẵặẹẻẽềềểÊỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
    if (!regexTen.test(hoTen)) {
      return res.status(400).json({ thongBao: "Họ tên chỉ được chứa chữ cái và khoảng trắng" });
    }

    const khachDaCo = await coSoDuLieu.khachHang.findFirst({
      where: {
        OR: [{ email }, { soDienThoai }],
      },
    });

    if (khachDaCo) {
      return res
        .status(409)
        .json({ thongBao: "Email hoặc số điện thoại đã tồn tại" });
    }

    const matKhauDaMaHoa = await bcrypt.hash(matKhau, 10);

    const khachMoi = await coSoDuLieu.khachHang.create({
      data: {
        hoTen,
        email,
        soDienThoai,
        diaChi,
        matKhau: matKhauDaMaHoa,
      },
    });

    return res.status(201).json({
      thongBao: "Đăng ký thành công! Chào mừng bạn",
      duLieu: {
        id: khachMoi.id,
        hoTen: khachMoi.hoTen,
        email: khachMoi.email,
        soDienThoai: khachMoi.soDienThoai,
      },
    });
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi đăng ký khách hàng" });
  }
}

async function dangNhapKhachHang(req, res) {
  try {
    const { email, matKhau } = req.body;

    if (!email || !matKhau) {
      return res.status(400).json({ thongBao: "Vui lòng nhập Email và Mật khẩu" });
    }

    const khachHang = await coSoDuLieu.khachHang.findUnique({
      where: { email },
    });

    if (!khachHang) {
      return res
        .status(401)
        .json({ thongBao: "Thông tin đăng nhập không chính xác" });
    }

    const dungMatKhau = await bcrypt.compare(matKhau, khachHang.matKhau);

    if (!dungMatKhau) {
      return res
        .status(401)
        .json({ thongBao: "Thong tin dang nhap khong dung" });
    }

    const token = jwt.sign(
      {
        id: khachHang.id,
        email: khachHang.email,
        hoTen: khachHang.hoTen,
        vaiTro: "KHACH_HANG",
        loaiTaiKhoan: "KHACH_HANG",
      },
      process.env.KHOA_BI_MAT_JWT,
      { expiresIn: "6h" },
    );

    return res.json({
      thongBao: "Đăng nhập thành công",
      token,
      khachHang: {
        id: khachHang.id,
        hoTen: khachHang.hoTen,
        email: khachHang.email,
        soDienThoai: khachHang.soDienThoai,
        diaChi: khachHang.diaChi,
      },
    });
  } catch (loi) {
    return res.status(500).json({ thongBao: "Lỗi hệ thống khi đăng nhập" });
  }
}

duongDan.post(["/dang-ky", "/dang-ky-tai-khoan", "/register"], dangKyKhachHang);

duongDan.post(
  ["/dang-nhap", "/dang-nhap-tai-khoan", "/login"],
  dangNhapKhachHang,
);

duongDan.get(
  "/thong-tin",
  xacThucTruyCap,
  yeuCauKhachHang,
  async (req, res) => {
    const khachHang = await coSoDuLieu.khachHang.findUnique({
      where: { id: req.nguoiDung.id },
      select: {
        id: true,
        hoTen: true,
        email: true,
        soDienThoai: true,
        diaChi: true,
        taoLuc: true,
      },
    });

    if (!khachHang) {
      return res.status(404).json({ thongBao: "Khong tim thay khach hang" });
    }

    return res.json(khachHang);
  },
);

duongDan.get(
  "/ai-insights",
  xacThucTruyCap,
  yeuCauKhachHang,
  async (req, res) => {
    try {
      const khId = req.nguoiDung.id;
      
      const khachHang = await coSoDuLieu.khachHang.findUnique({
        where: { id: khId },
        include: {
          donHang: {
            where: { trangThai: 'HOAN_TAT' },
            include: {
              chiTietDonHang: {
                include: {
                  thuoc: {
                    include: { danhMucThuoc: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!khachHang) return res.status(404).json({ thongBao: "Không tìm thấy khách hàng" });

      const categoryCounts = {};
      const sensitiveCategories = ["Giảm đau - Hạ sốt", "Thuốc ngủ - An thần", "Dược phẩm đặc trị"];
      let healthAlert = null;

      // Phân tích lịch sử 30 ngày qua
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      let recentSensitiveQty = 0;
      let recentSensitiveOrders = 0;

      khachHang.donHang.forEach(dh => {
        const isRecent = new Date(dh.taoLuc) >= sevenDaysAgo;
        let hasSensitiveInOrder = false;

        dh.chiTietDonHang.forEach(ct => {
          const catName = ct.thuoc.danhMucThuoc.tenDanhMuc;
          categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;

          if (sensitiveCategories.includes(catName)) {
            if (isRecent) {
              recentSensitiveQty += ct.soLuong;
              hasSensitiveInOrder = true;
            }
          }
        });

        if (isRecent && hasSensitiveInOrder) recentSensitiveOrders++;
      });

      // QUY TẮC CẢNH BÁO BƯỚC TIẾN MỚI: Nhận diện nguy cơ lạm dụng hoặc tự hại
      if (recentSensitiveQty >= 10 || recentSensitiveOrders >= 3) {
        healthAlert = {
          type: "OVERDOSE_RISK",
          level: "CRITICAL",
          message: `Tớ nhận thấy bạn đang mua khá nhiều thuốc hỗ trợ giảm đau trong thời gian ngắn... Bạn có đang thực sự ổn không? Đừng giữ những nỗi niềm một mình nhé, tớ ở đây để lắng nghe và giúp bạn mà. Dùng thuốc quá liều rất nguy hiểm cho bản thân, bạn hãy hứa với tớ là sẽ tư vấn kỹ với bác sĩ hoặc chia sẻ với người thân trước khi dùng nhé?`,
          category: "Giảm đau - Hạ sốt"
        };
      } else if (recentSensitiveOrders === 2) {
        healthAlert = {
          type: "RECURRING_PAIN",
          level: "WARNING",
          message: `Tớ thấy bạn phải dùng thuốc giảm đau liên tục mấy ngày qua. Cơn đau vẫn chưa thuyên giảm sao? Đừng chủ quan nhé, nếu đau kéo dài bạn nên đi kiểm tra chuyên sâu để tìm nguyên nhân gốc rễ, tớ rất lo cho sức khỏe của bạn đấy!`,
          category: "Giảm đau - Hạ sốt"
        };
      }

      let topCategory = null;
      let maxCount = 0;
      for (const [cat, count] of Object.entries(categoryCounts)) {
        if (count > maxCount) {
          maxCount = count;
          topCategory = cat;
        }
      }

      return res.json({
        hoTen: khachHang.hoTen,
        interestCategory: topCategory,
        orderCount: khachHang.donHang.length,
        healthAlert: healthAlert
      });
    } catch (e) {
      console.error("Lỗi lấy AI insights:", e);
      return res.status(500).json({ thongBao: "Lỗi hệ thống" });
    }
  }
);

module.exports = duongDan;
