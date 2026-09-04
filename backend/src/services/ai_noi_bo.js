function duLieuTongHopRong(duLieuTongHop) {
  return (
    !duLieuTongHop.tonKhoThap.length &&
    !duLieuTongHop.sapHetHan.length &&
    !duLieuTongHop.xuHuongMua.length
  );
}

function taoDuLieuTongHopMau() {
  return {
    tonKhoThap: [
      { thuocId: 101, tenThuoc: "Paracetamol 500mg", soLuongTon: 8 },
      { thuocId: 102, tenThuoc: "Vitamin C", soLuongTon: 12 },
    ],
    sapHetHan: [
      {
        loId: 301,
        thuocId: 103,
        tenThuoc: "Amoxicillin 500mg",
        soLo: "AMX-2026-01",
        soLuongTon: 15,
        soNgayConLai: 18,
      },
    ],
    xuHuongMua: [
      {
        thuocId: 104,
        tenThuoc: "Men tieu hoa",
        soLuongGanDay: 48,
        soLuongTruoc: 22,
        tyLeTang: 118,
      },
    ],
  };
}

function ngayConLai(ngay) {
  const hienTai = new Date();
  const han = new Date(ngay);
  return Math.ceil((han.getTime() - hienTai.getTime()) / (24 * 60 * 60 * 1000));
}

async function layDuLieuTongHop(coSoDuLieu) {
  const danhSachLo = await coSoDuLieu.loTonKho.findMany({
    include: {
      thuoc: {
        include: { danhMucThuoc: true },
      },
    },
  });

  const tongTheoThuoc = new Map();
  for (const lo of danhSachLo) {
    const key = lo.thuocId;
    if (!tongTheoThuoc.has(key)) {
      tongTheoThuoc.set(key, {
        thuocId: lo.thuocId,
        tenThuoc: lo.thuoc?.tenThuoc || `Thuoc ${lo.thuocId}`,
        hoatChat: lo.thuoc?.hoatChat || "",
        danhMuc: lo.thuoc?.danhMucThuoc?.tenDanhMuc || "Chưa phân loại",
        canDon: lo.thuoc?.canDonThuoc || false,
        soLuongTon: 0,
      });
    }
    const hienCo = tongTheoThuoc.get(key);
    hienCo.soLuongTon += Number(lo.soLuongTon || 0);
  }

  const tonKhoThap = Array.from(tongTheoThuoc.values())
    .filter((x) => x.soLuongTon > 0 && x.soLuongTon <= 20)
    .sort((a, b) => a.soLuongTon - b.soLuongTon)
    .slice(0, 10);

  const sapHetHan = danhSachLo
    .map((lo) => ({
      loId: lo.id,
      thuocId: lo.thuocId,
      tenThuoc: lo.thuoc?.tenThuoc || `Thuoc ${lo.thuocId}`,
      soLo: lo.soLo,
      soLuongTon: Number(lo.soLuongTon || 0),
      soNgayConLai: ngayConLai(lo.hanSuDung),
    }))
    .filter(
      (x) => x.soLuongTon > 0 && x.soNgayConLai >= 0 && x.soNgayConLai <= 60,
    )
    .sort((a, b) => a.soNgayConLai - b.soNgayConLai)
    .slice(0, 12);

  const hienTai = new Date();
  const baMuoiNgay = 30 * 24 * 60 * 60 * 1000;
  const mocGanDay = new Date(hienTai.getTime() - baMuoiNgay);
  const mocTruocDo = new Date(hienTai.getTime() - baMuoiNgay * 2);

  const hoaDon = await coSoDuLieu.hoaDon.findMany({
    where: { taoLuc: { gte: mocTruocDo } },
    include: { chiTietHoaDon: { include: { thuoc: true } } },
  });

  const mapGanDay = new Map();
  const mapTruocDo = new Map();

  for (const hd of hoaDon) {
    const isGanDay = new Date(hd.taoLuc).getTime() >= mocGanDay.getTime();
    const bucket = isGanDay ? mapGanDay : mapTruocDo;

    for (const ct of hd.chiTietHoaDon || []) {
      const key = ct.thuocId;
      const hienCo = bucket.get(key) || {
        thuocId: key,
        tenThuoc: ct.thuoc?.tenThuoc || `Thuoc ${key}`,
        soLuong: 0,
      };
      hienCo.soLuong += Number(ct.soLuong || 0);
      bucket.set(key, hienCo);
    }
  }

  const xuHuongMua = [];
  for (const [thuocId, duLieuGanDay] of mapGanDay.entries()) {
    const duLieuTruoc = mapTruocDo.get(thuocId);
    const soLuongGanDay = duLieuGanDay.soLuong;
    const soLuongTruoc = Number(duLieuTruoc?.soLuong || 0);
    if (soLuongGanDay < 5) continue;

    const tyLeTang =
      soLuongTruoc === 0
        ? 100
        : Math.round(((soLuongGanDay - soLuongTruoc) / soLuongTruoc) * 100);

    if (tyLeTang <= 20) continue;

    xuHuongMua.push({
      thuocId,
      tenThuoc: duLieuGanDay.tenThuoc,
      soLuongGanDay,
      soLuongTruoc,
      tyLeTang,
    });
  }

  xuHuongMua.sort((a, b) => b.tyLeTang - a.tyLeTang);

  const danhMucToanBo = Array.from(tongTheoThuoc.values())
    .filter((x) => x.soLuongTon > 0)
    .map((x) => ({
      ten: x.tenThuoc,
      loai: x.danhMuc,
      hChat: x.hoatChat,
      don: x.canDon ? "Cần đơn" : "Không đơn",
    }));

  return {
    tonKhoThap,
    sapHetHan,
    xuHuongMua: xuHuongMua.slice(0, 10),
    danhMucToanBo,
  };
}


function taoGoiYNoiBo(duLieuTongHop) {
  const tonKhoThap = duLieuTongHop.tonKhoThap.slice(0, 3);
  const sapHetHan = duLieuTongHop.sapHetHan.slice(0, 3);
  const xuHuongMua = duLieuTongHop.xuHuongMua.slice(0, 3);

  const ketQua = [];

  if (tonKhoThap.length) {
    ketQua.push({
      loai: "TON_KHO_THAP",
      doTinCay: 0.95,
      duLieuDauRa: `Cảnh báo tồn kho thấp cho: ${tonKhoThap
        .map((x) => `${x.tenThuoc} (còn ${x.soLuongTon})`)
        .join(", ")}. Đề xuất nhập hàng bổ sung trong 24-48h tới.`,
    });
  }

  if (sapHetHan.length) {
    ketQua.push({
      loai: "SAP_HET_HAN",
      doTinCay: 0.98,
      duLieuDauRa: `Có ${sapHetHan.length} lô thuốc sắp hết hạn: ${sapHetHan
        .map((x) => `${x.tenThuoc} (hạn còn ${x.soNgayConLai} ngày)`)
        .join(", ")}. Cần ưu tiên xuất bán hoặc áp dụng chương trình khuyến mãi.`,
    });
  }

  if (xuHuongMua.length) {
    ketQua.push({
      loai: "XU_HUONG_MUA",
      doTinCay: 0.85,
      duLieuDauRa: `Nhu cầu thị trường đang tăng mạnh đối với: ${xuHuongMua
        .map((x) => `${x.tenThuoc} (+${x.tyLeTang}%)`)
        .join(", ")}. Đề xuất chuẩn bị nguồn cung để tránh đứt gãy hàng hóa.`,
    });
  }

  return ketQua;
}

function taoTraLoiHoiNoiBo(cauHoi, duLieuTongHop) {
  const cauHoiThuong = String(cauHoi || "")
    .toLowerCase()
    .trim();

  const chuanHoaKhongDau = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"));
  const cauHoiKhongDau = chuanHoaKhongDau(cauHoiThuong);

  const tuLoiChao = [
    "hi",
    "hello",
    "chao",
    "hey",
    "xin chao",
    "alo",
    "chao ban",
    "xin chao ban",
  ];
  if (
    tuLoiChao.some(
      (t) => cauHoiKhongDau === t || cauHoiKhongDau.startsWith(t + " "),
    )
  ) {
    return "Xin chào! Tôi là trợ lý AI nội bộ của nhà thuốc. Tôi có thể giúp bạn phân tích tồn kho, cảnh báo thuốc sắp hết hạn và dự báo xu hướng mua hàng. Bạn cần tôi hỗ trợ thông tin gì không?";
  }

  const tuHoiChung = [
    "ban la ai",
    "may la ai",
    "ai day",
    "la gi",
    "ban co the",
    "giup gi",
    "ho tro gi",
  ];
  if (tuHoiChung.some((t) => cauHoiKhongDau.includes(t))) {
    return "Tôi là hệ thống AI phân tích nội bộ. Nhiệm vụ của tôi là quét dữ liệu trực tiếp từ kho hàng và hóa đơn để đưa ra các cảnh báo về: Tồn kho thấp, Thuốc sắp hết hạn, và các mặt hàng đang có xu hướng mua tăng mạnh.";
  }

  const tonKho = duLieuTongHop.tonKhoThap.slice(0, 3);
  const hetHan = duLieuTongHop.sapHetHan.slice(0, 3);
  const xuHuong = duLieuTongHop.xuHuongMua.slice(0, 3);

  if (!tonKho.length && !hetHan.length && !xuHuong.length) {
    return "Hiện tại hệ thống chưa ghi nhận các cảnh báo đặc biệt về kho hàng. Bạn hãy tiếp tục cập nhật dữ liệu tồn kho và hóa đơn để tôi có thể phân tích chính xác hơn nhé.";
  }

  if (cauHoiThuong.includes("nhap") || cauHoiThuong.includes("thieu")) {
    if (tonKho.length) {
      return `Dựa trên dữ liệu kho, bạn nên ưu tiên nhập thêm: ${tonKho
        .map((x) => `${x.tenThuoc} (hiện còn ${x.soLuongTon})`)
        .join(", ")}.`;
    }
  }

  if (cauHoiThuong.includes("het han") || cauHoiThuong.includes("han")) {
    if (hetHan.length) {
      return `Các lô thuốc cần xử lý gấp do sắp hết hạn: ${hetHan
        .map((x) => `${x.tenThuoc} (hạn còn ${x.soNgayConLai} ngày)`)
        .join(", ")}.`;
    }
  }

  return [
    tonKho.length
      ? `Tồn kho thấp: ${tonKho.map((x) => x.tenThuoc).join(", ")}.`
      : null,
    hetHan.length
      ? `Sắp hết hạn: ${hetHan.map((x) => x.tenThuoc).join(", ")}.`
      : null,
    xuHuong.length
      ? `Xu hướng mua tăng: ${xuHuong.map((x) => x.tenThuoc).join(", ")}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
}

module.exports = {
  duLieuTongHopRong,
  taoDuLieuTongHopMau,
  layDuLieuTongHop,
  taoGoiYNoiBo,
  taoTraLoiHoiNoiBo,
};
