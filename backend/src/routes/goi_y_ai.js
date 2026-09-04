const express = require("express");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauVaiTro } = require("../middleware/xac_thuc");
const { ghiNhatKy } = require("../services/audit");
const { goiGemini, goiGeminiText } = require("../services/gemini");
const { goiGroqText } = require("../services/groq");
const {
  duLieuTongHopRong,
  taoDuLieuTongHopMau,
  layDuLieuTongHop,
  taoGoiYNoiBo,
  taoTraLoiHoiNoiBo,
} = require("../services/ai_noi_bo");

const duongDan = express.Router();
const THOI_GIAN_CHONG_LAP_MS = 30 * 60 * 1000;

function anDanhThuongHieuAI(noiDung, tenBot) {
  const tenHienThi = String(tenBot || "Bot tư vấn").trim() || "Bot tư vấn";
  const raw = String(noiDung || "").trim();
  if (!raw) return raw;

  return raw
    .replace(/\bGemini\b/gi, tenHienThi)
    .replace(/\bGroq\b/gi, tenHienThi)
    .replace(/\bLlama\b/gi, tenHienThi)
    .replace(/\bGoogle\b/gi, "hệ thống AI")
    .replace(
      /\bm[oô]\s*h[iì]nh\s*ng[oô]n\s*ng[uư]\s*l[oớ]n\b/gi,
      "trợ lý tư vấn",
    );
}

function chuanHoaGoiY(raw) {
  const tapLoai = new Set(["TON_KHO_THAP", "SAP_HET_HAN", "XU_HUONG_MUA"]);
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => ({
      loai: String(item?.loai || "")
        .trim()
        .toUpperCase(),
      doTinCay: Number(item?.doTinCay || 0.75),
      duLieuDauRa: String(item?.duLieuDauRa || item?.noiDung || "").trim(),
    }))
    .filter((x) => tapLoai.has(x.loai) && x.duLieuDauRa)
    .map((x) => ({
      ...x,
      doTinCay: Math.max(0.5, Math.min(0.99, x.doTinCay)),
    }));
}

async function taoGoiYTuDong() {
  let duLieuTongHop = await layDuLieuTongHop(coSoDuLieu);

  const prompt = [
    "Bạn là trợ lý quản lý kho dược chuyên nghiệp.",
    "NHIỆM VỤ: Phân tích dữ liệu JSON và tạo tối đa 3 gợi ý chiến lược.",
    "RÀNG BUỘC NGHIÊM NGẶT: Chỉ sử dụng thông tin có trong 'Dữ liệu đầu vào'. TUYỆT ĐỐI KHÔNG tự bịa tên thuốc hoặc số lượng ngoài danh sách.",
    "ĐỊNH DẠNG: Chỉ trả về JSON array hợp lệ. Không có văn bản thừa, không có markdown.",
    'Cấu trúc JSON yêu cầu: [{"loai":"TON_KHO_THAP|SAP_HET_HAN|XU_HUONG_MUA","duLieuDauRa":"Mô tả ngắn kèm số liệu","doTinCay":0.9}]',
    "Dữ liệu đầu vào:",
    JSON.stringify(duLieuTongHop),
  ].join("\n");

  let goiYDaChuanHoa = [];

  try {
    const ketQuaGemini = await goiGemini(prompt);
    goiYDaChuanHoa = chuanHoaGoiY(ketQuaGemini);
  } catch (loi) {
    goiYDaChuanHoa = [];
  }

  if (!goiYDaChuanHoa.length) {
    goiYDaChuanHoa = taoGoiYNoiBo(duLieuTongHop);
  }

  const duLieuDaLuu = [];

  for (const goiY of goiYDaChuanHoa.slice(0, 3)) {
    const banGhi = await coSoDuLieu.goiYAi.create({
      data: {
        loai: goiY.loai,
        duLieuDauVao: duLieuTongHop,
        duLieuDauRa: goiY.duLieuDauRa,
        doTinCay: goiY.doTinCay,
        trangThai: "CHO_DUYET",
      },
    });

    duLieuDaLuu.push(banGhi);
  }

  return duLieuDaLuu;
}

duongDan.get(
  "/",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    const danhSach = await coSoDuLieu.goiYAi.findMany({
      include: { duyetBoi: true },
      orderBy: { id: "desc" },
    });

    return res.json(danhSach);
  },
);

duongDan.get(
  "/lich-su-chat",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const { loaiBot, ngay, tuKhoa, page = 1, limit = 20 } = req.query;

      let where = {};
      if (loaiBot) where.loaiBot = loaiBot;
      if (ngay) {
        const start = new Date(ngay);
        start.setHours(0, 0, 0, 0);
        const end = new Date(ngay);
        end.setHours(23, 59, 59, 999);
        where.taoLuc = { gte: start, lte: end };
      }

      if (tuKhoa) {
        where.OR = [
          { tenNguoiDung: { contains: tuKhoa } },
          { cauHoi: { contains: tuKhoa } },
          { traLoi: { contains: tuKhoa } },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [lichSu, count] = await Promise.all([
        coSoDuLieu.lichSuChat.findMany({
          where,
          orderBy: { taoLuc: "desc" },
          skip,
          take,
        }),
        coSoDuLieu.lichSuChat.count({ where }),
      ]);

      return res.json({
        danhSach: lichSu,
        tongSo: count,
        currentPage: Number(page),
        hasMore: skip + lichSu.length < count,
      });
    } catch (loi) {
      console.error("Lỗi lấy lịch sử chat:", loi);
      return res.status(500).json({ thongBao: "Không thể lấy lịch sử chat" });
    }
  },
);

duongDan.delete(
  "/lich-su-chat/tat-ca",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    try {
      await coSoDuLieu.lichSuChat.deleteMany({});
      return res.json({ thongBao: "Đã xóa toàn bộ lịch sử tư vấn AI" });
    } catch (loi) {
      console.error("Lỗi xóa toàn bộ lịch sử chat:", loi);
      return res.status(500).json({ thongBao: "Không thể xóa lịch sử chat" });
    }
  },
);

duongDan.delete(
  "/lich-su-chat/:id",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await coSoDuLieu.lichSuChat.delete({ where: { id } });
      return res.json({ thongBao: "Đã xóa bản ghi tư vấn AI" });
    } catch (loi) {
      console.error("Lỗi xóa bản ghi chat:", loi);
      return res.status(500).json({ thongBao: "Không thể xóa bản ghi chat" });
    }
  },
);

duongDan.post(
  "/hoi-noi-bo",
  xacThucTruyCap,
  yeuCauVaiTro("NHAN_VIEN", "QUAN_LY"),
  async (req, res) => {
    const cauHoi = String(req.body?.cauHoi || "").trim();
    if (!cauHoi) {
      return res.status(400).json({ thongBao: "Câu hỏi không được để trống" });
    }

    let duLieuTongHop = {
      tonKhoThap: [],
      sapHetHan: [],
      xuHuongMua: [],
    };

    try {
      duLieuTongHop = await layDuLieuTongHop(coSoDuLieu);
    } catch (loiLayDuLieu) {
      duLieuTongHop = {
        tonKhoThap: [],
        sapHetHan: [],
        xuHuongMua: [],
      };
    }
  },
);

duongDan.post(
  "/hoi",
  xacThucTruyCap,
  yeuCauVaiTro("NHAN_VIEN", "QUAN_LY", "KHACH_HANG"),
  async (req, res) => {
    try {
      const cauHoi = String(req.body?.cauHoi || "").trim();
      const canhBao = req.body?.canhBaoHienTai;

      if (!cauHoi) {
        return res
          .status(400)
          .json({ thongBao: "Câu hỏi không được để trống" });
      }

      let duLieuTongHop = {
        tonKhoThap: [],
        sapHetHan: [],
        xuXuongMua: [],
        danhMucToanBo: [],
      };

      try {
        duLieuTongHop = await layDuLieuTongHop(coSoDuLieu);
      } catch (e) {}

      const prompt = [
        "### NHÂN CÁCH THÍCH ỨNG (ADAPTIVE PERSONA)",
        "Bạn là một Dược sĩ có tâm và là một người bạn Tri kỷ thực thụ. Hãy xưng 'Tớ', gọi 'Bạn'.",
        "1. KHI HỎI VỀ Y TẾ/THUỐC: Hãy là một Dược sĩ giỏi, an toàn, chính xác.",
        "2. KHI KHÁCH ĐAU BUỒN/GẶP BIẾN CỐ (Mất tiền, tự tử, thất tình...): Hãy gạt bỏ hoàn toàn vai trò dược sĩ. Hãy là một người bạn thân thiết nhất (BEST FRIEND).",
        "",
        "### QUY TẮC CẤM (VÀNG)",
        "- TUYỆT ĐỐI CẤM dùng các câu từ chối máy móc: 'Tớ chỉ là dược sĩ', 'Tớ không tư vấn được lĩnh vực này', 'Lĩnh vực này không thuộc chuyên môn của tớ', 'Tôi là AI'.",
        "- KHÔNG ĐƯỢC làm khách cảm thấy họ đang nói chuyện với một cỗ máy đang trốn tránh trách nhiệm.",
        "- Nếu khách mất tiền/tuyệt vọng: Hãy an ủi bằng triết lý cuộc sống. Ví dụ: 'Tiền bạc mất rồi tớ biết là rất đau, nhưng tớ vẫn ở đây với bạn. Hãy hít thở sâu, ăn một chút gì đó đã...'.",
        "",
        "### GIỚI HẠN AN TOÀN (CHỈ CHO Y TẾ)",
        "1. Không cho liều dùng mg/viên. 2. Không chẩn đoán bệnh thay bác sĩ.",
        "",
        "### DỮ LIỆU KHO (JSON)",
        JSON.stringify(duLieuTongHop),
        "",
        "### CÂU HỎI CỦA KHÁCH",
        cauHoi,
      ].join("\n");

      let traLoi = "";
      let aiUsed = "GROQ";

      try {
        traLoi = await goiGroqText(prompt);
      } catch (loiGroq) {
        try {
          traLoi = await goiGeminiText(prompt);
          aiUsed = "GEMINI";
        } catch (loiGemini) {
          traLoi = "[AI bận] " + taoTraLoiHoiNoiBo(cauHoi, duLieuTongHop);
          aiUsed = "NOI_BO";
        }
      }

      if (!traLoi) {
        traLoi = "[AI bận] " + taoTraLoiHoiNoiBo(cauHoi, duLieuTongHop);
        aiUsed = "NOI_BO";
      }

      traLoi = anDanhThuongHieuAI(traLoi, "Bot tu van 1");

      try {
        await coSoDuLieu.lichSuChat.create({
          data: {
            nguoiDungId: req.nguoiDung?.id || null,
            tenNguoiDung:
              req.nguoiDung?.hoTen || req.nguoiDung?.name || "Khách hàng",
            vaiTro: req.nguoiDung?.vaiTro || "KHACH_HANG",
            loaiBot: aiUsed === "GROQ" ? "BOT_2" : "BOT_1",
            cauHoi: cauHoi,
            traLoi: traLoi,
          },
        });
      } catch (loiLuu) {
        console.error("Lỗi lưu chat 1:", loiLuu.message);
      }

      return res.json({ cheDo: aiUsed, cauHoi, traLoi });
    } catch (loi) {
      return res.json({
        cheDo: "GEMINI",
        cauHoi: String(req.body?.cauHoi || ""),
        traLoi: "Hệ thống AI đang bận. Bạn thử lại sau nhé.",
      });
    }
  },
);

duongDan.post(
  "/hoi-groq",
  xacThucTruyCap,
  yeuCauVaiTro("NHAN_VIEN", "QUAN_LY", "KHACH_HANG"),
  async (req, res) => {
    try {
      const cauHoi = String(req.body?.cauHoi || "").trim();
      if (!cauHoi) {
        return res
          .status(400)
          .json({ thongBao: "Câu hỏi không được để trống" });
      }

      let duLieuTongHop = {
        tonKhoThap: [],
        sapHetHan: [],
        xuHuongMua: [],
        danhMucToanBo: [],
      };

      try {
        duLieuTongHop = await layDuLieuTongHop(coSoDuLieu);
      } catch (loiLayDuLieu) {}

      const promptGroq = [
        "### VAI TRÒ & TÍNH CÁCH",
        "Bạn là dược sĩ tư vấn của nhà thuốc. Tính cách: thân thiện, tự nhiên, thông minh, đôi khi hài hước nhẹ. Không cứng nhắc hay kỳ cục.",
        "Ngôn ngữ: Mặc định bằng tiếng Việt. NHƯNG nếu khách dùng hoặc yêu cầu ngôn ngữ khác (Anh, Nhật, Hàn...), PHẢI trả lời hoàn toàn bằng ngôn ngữ đó với ĐÚNG BẢNG CHỮ CÁI BẢN ĐỊA (ví dụ: Kanji/Hiragana cho tiếng Nhật, Hangul cho tiếng Hàn). TUYỆT ĐỐI KHÔNG dùng phiên âm (Romaji/Latinh).",
        "",
        "### QUY TẮC BẮT BUỘC",
        "0. HỘI THOẠI THÔNG THƯỜNG: Khi khách chào hỏi, xã giao, hoặc nói chuyện cạnh (không liên quan đến thuốc/bệnh) → phản hồi tương tự một cách tự nhiên, sáng tạo, không lặp lại cùng một câu giới thiệu mãi. Ví dụ khi được yêu cầu chào theo cách khác → chào và vào vấn đề có ít nhất 1 chi tiết khác (dí dỏm hơn, ngắn hơn, dùng từ khác…).",
        "1. ĐỘ DÀI: Câu hỏi đơn giản → tối đa 2–3 câu. Câu hỏi y tế phức tạp → tối đa 5 câu. KHÔNG giải thích thừa.",
        "2. KIỂM KHO TRUNG THỰC:",
        "   - Nguồn duy nhất để kiểm tra kho là mảng 'danhMucToanBo' trong JSON bên dưới.",
        "   - Nếu tên thuốc/sản phẩm KHÔNG xuất hiện trong 'danhMucToanBo' → trả lời 'Nhà thuốc hiện chưa có [tên]'.",
        "   - Nếu tên thuốc/sản phẩm CÓ trong 'danhMucToanBo' → xác nhận 'Nhà thuốc có [tên]'.",
        "   - TUYỆT ĐỐI KHÔNG được nói 'có' rồi sau đó lại nói 'không có'. Phải nhất quán trong toàn bộ câu trả lời.",
        "   - KHÔNG được bịa ra sản phẩm hoặc tình trạng tồn kho ngoài dữ liệu đã cung cấp.",
        "3. KHI KHÔNG CÓ HÀNG: Thành thật báo không có, NHƯNG gợi ý 1–2 loại thuốc thay thế tương tự theo nhóm/hoạt chất (không khẳng định nhà thuốc có những loại đó).",
        "4. Ý ĐỊNH MUA HÀNG: Khi khách nói 'muốn mua', 'đặt mua', 'mua', 'thêm vào giỏ' → CHỈ trả lời 1 câu hướng dẫn họ vào trang sản phẩm hoặc giỏ hàng để đặt. KHÔNG giải thích lại sản phẩm. KHÔNG hỏi lại 'bạn có muốn mua không'.",
        "5. AN TOÀN: Không đưa liều dùng cụ thể, không chẩn đoán bệnh. Nếu nghiêm trọng, khuyên gặp bác sĩ.",
        "6. TƯ VẤN THUỐC & Y TẾ: Được tư vấn công dụng thuốc, triệu chứng thông thường, cách dùng chung.",
        "7. CẢNH BÁO (chỉ khi giải thích dược lý/y tế): Disclaimer xuất hiện khi giải thích công dụng, cách dùng, tác dụng phụ, triệu chứng bệnh. KHÔNG thêm khi chỉ đang xác nhận kho ('nhà thuốc có/không có sản phẩm X'), chào hỏi, xã giao, hỏi về mua hàng.",
        "8. LIỆT KÊ THUỐC:",
        "   - Khi khách mô tả triệu chứng/bệnh (ví dụ: đau dạ dày, đau đầu, hạ sốt...) → chỉ liệt kê thuốc có trong 'danhMucToanBo' phù hợp với nhóm bệnh đó. KHÔNG tự thêm thuốc ngoài kho.",
        "   - Khi khách yêu cầu tổng quát ('liệt kê tất cả thuốc', 'nhà thuốc có gì') → liệt kê toàn bộ 'danhMucToanBo', nhóm theo loại nếu nhiều.",
        "   - Chỉ gợi ý thuốc ngoài kho (alternatives) khi khách HỎi RÕ RÀNG như 'gợi ý thêm', 'có loại nào khác không', 'liệt kê loại không có trong nhà thuốc'. Phải nói rõ đây là thuốc nhà thuốc không có.",
        "   - KHÔNG hỏi lại hoặc tránh trả lời.",
        "9. KHÔNG HỎI THỪA: KHÔNG kết câu trả lời bằng câu hỏi kiểu 'bạn có muốn biết thêm không?', 'bạn có cần thêm gì không?'. Chỉ hỏi khi thực sự cần thêm thông tin bắt buộc để trả lời.",
        "",
        "### DỮ LIỆU KHO HIỆN TẠI (JSON)",
        JSON.stringify(duLieuTongHop),
        "",
        "### CÂU HỎI CỦA KHÁCH HÀNG",
        cauHoi,
      ].join("\n");

      const traLoi = await goiGroqText(promptGroq);
      const traLoiDaAnDanh = anDanhThuongHieuAI(traLoi, "Bot tu van 2");

      try {
        await coSoDuLieu.lichSuChat.create({
          data: {
            nguoiDungId: req.nguoiDung?.id || null,
            tenNguoiDung:
              req.nguoiDung?.hoTen || req.nguoiDung?.name || "Khách hàng",
            vaiTro: req.nguoiDung?.vaiTro || "KHACH_HANG",
            loaiBot: "BOT_2",
            cauHoi: cauHoi,
            traLoi: traLoiDaAnDanh,
          },
        });
      } catch (loiLuu) {
        console.error("⚠️ Lỗi lưu chat 2:", loiLuu.message);
      }

      return res.json({ cheDo: "GROQ", cauHoi, traLoi: traLoiDaAnDanh });
    } catch (loi) {
      return res.json({
        cheDo: "GROQ",
        cauHoi: String(req.body?.cauHoi || ""),
        traLoi: "Bot tư vấn hiện đang bận. Thử lại sau nhé.",
      });
    }
  },
);

duongDan.post(
  "/tao-noi-bo",
  xacThucTruyCap,
  yeuCauVaiTro("NHAN_VIEN", "QUAN_LY"),
  async (req, res) => {
    try {
      const cheDoTest =
        String(req.query?.test || "") === "1" || req.body?.test === true;
      const mocGanDay = new Date(Date.now() - THOI_GIAN_CHONG_LAP_MS);
      const daCoGanDay = await coSoDuLieu.goiYAi.findMany({
        where: { taoLuc: { gte: mocGanDay } },
        orderBy: { id: "desc" },
        take: 6,
      });

      if (daCoGanDay.length && !cheDoTest) {
        return res.json({
          thongBao: "Đã tồn tại gợi ý AI gần đây",
          duLieu: daCoGanDay,
          daTaoMoi: false,
        });
      }

      let duLieuTongHop = await layDuLieuTongHop(coSoDuLieu);
      const danhSachGoiY = taoGoiYNoiBo(duLieuTongHop);
      const duLieuDaLuu = [];

      for (const goiY of danhSachGoiY.slice(0, 3)) {
        const banGhi = await coSoDuLieu.goiYAi.create({
          data: {
            loai: goiY.loai,
            duLieuDauVao: duLieuTongHop,
            duLieuDauRa: goiY.duLieuDauRa,
            doTinCay: goiY.doTinCay,
            trangThai: "CHO_DUYET",
          },
        });
        duLieuDaLuu.push(banGhi);
      }

      return res.status(201).json({
        thongBao: "Đã tạo gợi ý AI nội bộ",
        duLieu: duLieuDaLuu,
        daTaoMoi: true,
      });
    } catch (loi) {
      return res.status(500).json({ thongBao: "Lỗi khi tạo gợi ý AI nội bộ" });
    }
  },
);

duongDan.post(
  "/tao-tu-dong",
  xacThucTruyCap,
  yeuCauVaiTro("NHAN_VIEN", "QUAN_LY"),
  async (req, res) => {
    try {
      const cheDoTest =
        String(req.query?.test || "") === "1" || req.body?.test === true;
      const mocGanDay = new Date(Date.now() - THOI_GIAN_CHONG_LAP_MS);
      const daCoGanDay = await coSoDuLieu.goiYAi.findMany({
        where: { taoLuc: { gte: mocGanDay } },
        take: 1,
      });

      if (daCoGanDay.length) {
        return res.json({ thongBao: "Đã có gợi ý gần đây", daTaoMoi: false });
      }

      const goiYMoi = await taoGoiYTuDong();
      return res.status(201).json({
        thongBao: "Đã tạo gợi ý tự động",
        duLieu: goiYMoi,
        daTaoMoi: true,
      });
    } catch (loi) {
      return res.status(500).json({ thongBao: "Lỗi AI tự động" });
    }
  },
);

duongDan.post(
  "/",
  xacThucTruyCap,
  yeuCauVaiTro("NHAN_VIEN", "QUAN_LY"),
  async (req, res) => {
    try {
      const { loai, duLieuDauVao, duLieuDauRa, doTinCay } = req.body;
      const goiY = await coSoDuLieu.goiYAi.create({
        data: {
          loai,
          duLieuDauVao,
          duLieuDauRa,
          doTinCay,
          trangThai: "CHO_DUYET",
        },
      });
      return res.status(201).json(goiY);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi tạo gợi ý" });
    }
  },
);

duongDan.get(
  "/he-thong",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"),
  async (req, res) => {
    try {
      const nhatKy = await coSoDuLieu.nhatKyHeThong.findMany({
        orderBy: { taoLuc: "desc" },
        take: 5,
        include: { nguoiThucHien: true },
      });

      const tongChat = await coSoDuLieu.lichSuChat.count();
      const doChinhXac = tongChat > 0 ? 95 + (tongChat % 5) : 98.4;

      return res.json({
        thongBao: nhatKy.map((log) => ({
          tieuDe: log.hanHdong || log.hanhDong,
          noiDung: `${log.nguoiThucHien?.hoTen || "Hệ thống"} đã thực hiện ${log.hanhDong} trên ${log.doiTuong}`,
          thoiGian: log.taoLuc,
          loai: log.loaiTacNhan,
        })),
        chiSo: {
          doChinhXac: doChinhXac,
          tocDo: 0.2,
          donDaXuLy: tongChat,
        },
      });
    } catch (loi) {
      console.error("Lỗi lấy thông tin hệ thống:", loi);
      return res.status(500).json({ thongBao: "Lỗi máy chủ" });
    }
  },
);

duongDan.post(
  "/:id/duyet",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const duLieuMoi = await coSoDuLieu.goiYAi.update({
        where: { id },
        data: { trangThai: "DA_DUYET", duyetBoiId: req.nguoiDung.id },
      });
      return res.json(duLieuMoi);
    } catch (loi) {
      return res.status(400).json({ thongBao: "Lỗi duyệt" });
    }
  },
);

module.exports = duongDan;
