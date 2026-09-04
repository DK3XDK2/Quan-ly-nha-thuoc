const express = require("express");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauVaiTro } = require("../middleware/xac_thuc");
const ExcelJS = require("exceljs");
const PdfPrinter = require("pdfmake/js/Printer").default;
const path = require("path");

const FONTS = {
  Roboto: {
    normal: path.join(__dirname, "../../node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../../node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../../node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "../../node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf")
  }
};
const printer = new PdfPrinter(FONTS, null, {
  resolve: (url) => url,
  resolved: () => Promise.resolve()
});

const duongDan = express.Router();

duongDan.get(
  "/doanh-thu",
  xacThucTruyCap,
  yeuCauVaiTro("QUAN_LY"),
  async (req, res) => {
    const ketQua = await coSoDuLieu.hoaDon.aggregate({
      _sum: { tongTien: true },
      _count: { id: true },
    });

    return res.json({
      tongHoaDon: ketQua._count.id,
      tongDoanhThu: Number(ketQua._sum.tongTien || 0),
    });
  },
);

duongDan.get("/export/excel", xacThucTruyCap, async (req, res) => {
  try {
    const { start, end, scope } = req.query;
    let where = {};
    if (start && end) {
      where.taoLuc = { gte: new Date(start), lte: new Date(end) };
    }

    const data = await coSoDuLieu.hoaDon.findMany({
      where,
      include: {
        chiTietHoaDon: { include: { thuoc: { include: { danhMucThuoc: true } } } },
        nguoiTao: true
      },
      orderBy: { taoLuc: "desc" }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Báo cáo doanh thu");

    sheet.columns = [
      { header: "Mã HĐ", key: "id", width: 10 },
      { header: "Ngày tạo", key: "date", width: 20 },
      { header: "Người tạo", key: "creator", width: 20 },
      { header: "Tổng tiền", key: "total", width: 15 },
      { header: "PT Thanh toán", key: "method", width: 20 },
      { header: "Danh mục / Thuốc", key: "items", width: 50 },
    ];

    data.forEach((h) => {
      const items = h.chiTietHoaDon
        .map(ct => `[${ct.thuoc?.danhMucThuoc?.tenDanhMuc || "Khác"}] ${ct.thuoc?.tenThuoc} (x${ct.soLuong})`)
        .join(", ");

      sheet.addRow({
        id: h.id,
        date: new Date(h.taoLuc).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }),
        creator: h.nguoiTao?.hoTen || "N/A",
        total: Number(h.tongTien),
        method: h.phuongThucThanhToan,
        items
      });
    });

    sheet.getRow(1).font = { bold: true };
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=BaoCaoDoanhThu.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi xuất Excel");
  }
});

duongDan.get("/export/pdf", xacThucTruyCap, async (req, res) => {
  try {
    const { start, end } = req.query;
    let where = {};
    if (start && end) {
      where.taoLuc = { gte: new Date(start), lte: new Date(end) };
    }

    const data = await coSoDuLieu.hoaDon.findMany({
      where,
      include: { nguoiTao: true },
      orderBy: { taoLuc: "desc" }
    });

    const totalRevenue = data.reduce((sum, h) => sum + Number(h.tongTien), 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "---";

    const docDefinition = {
      content: [
        { text: "BÁO CÁO DOANH THU NHÀ THUỐC", style: "header" },
        { text: `Thời gian: ${start ? fmtDate(start) : "Tất cả"} - ${end ? fmtDate(end) : "Hiện tại"}`, margin: [0, 0, 0, 20], alignment: "center" },
        {
          table: {
            headerRows: 1,
            widths: ["auto", "*", "auto", "auto"],
            body: [
              [
                { text: "Mã HĐ", style: "tableHeader" },
                { text: "Ngày tạo", style: "tableHeader" },
                { text: "Người tạo", style: "tableHeader" },
                { text: "Thành tiền", style: "tableHeader" },
              ],
              ...data.map(h => [
                h.id.toString(),
                new Date(h.taoLuc).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }),
                h.nguoiTao?.hoTen || "N/A",
                { text: Number(h.tongTien).toLocaleString("vi-VN") + " đ", alignment: "right" }
              ]),
              [
                { text: "TỔNG CỘNG", colSpan: 3, bold: true },
                {},
                {},
                { text: totalRevenue.toLocaleString("vi-VN") + " đ", bold: true, alignment: "right" }
              ]
            ]
          }
        }
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: "center", margin: [0, 0, 0, 10] },
        tableHeader: { bold: true, fillColor: "#eeeeee" }
      },
      defaultStyle: { font: "Roboto" }
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=BaoCaoDoanhThu.pdf");
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi xuất PDF");
  }
});

module.exports = duongDan;
