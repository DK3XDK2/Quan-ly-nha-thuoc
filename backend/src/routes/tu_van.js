const express = require("express");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauKhachHang, yeuCauVaiTro } = require("../middleware/xac_thuc");
const { cloudinary } = require("../config/cloudinary");

function getPublicIdFromUrl(url) {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
        const parts = url.split('/');
        const fileName = parts[parts.length - 1].split('.')[0];
        const folder = parts[parts.length - 2];
        return `${folder}/${fileName}`;
    } catch (e) { return null; }
}

const duongDan = express.Router();

async function donDepPhienHetHan(io) {
    const NAM_PHUT = 5 * 60 * 1000;
    const hetHanLuc = new Date(Date.now() - NAM_PHUT);

    try {
        const phienHetHan = await coSoDuLieu.phienTuVan.findMany({
            where: {
                trangThai: { not: 'KET_THUC' },
                capNhatLuc: { lt: hetHanLuc }
            }
        });

        for (const p of phienHetHan) {
            await coSoDuLieu.phienTuVan.update({
                where: { id: p.id },
                data: { 
                    trangThai: 'KET_THUC',
                    ghiChu: "Hệ thống tự động đóng do quá thời gian phản hồi (5 phút im lặng)"
                }
            });
            console.log(` Hệ thống tự động đóng phiên ${p.id} do hết hạn (5 phút im lặng).`);
            if (io) {
                io.to(`room_${p.id}`).emit("session_status_changed", { 
                    status: 'KET_THUC', 
                    thongBao: "Phiên tư vấn đã tự động đóng do quá thời gian phản hồi." 
                });
                io.emit("new_notification", { type: "SESSION_CLOSED", phienId: p.id });
            }
        }
    } catch (e) {
        console.error("Lỗi khi dọn dẹp phiên hết hạn:", e);
    }
}

duongDan.post("/bat-dau", xacThucTruyCap, yeuCauKhachHang, async (req, res) => {
    try {
        const khachHangId = req.nguoiDung.id;

        let phien = await coSoDuLieu.phienTuVan.findFirst({
            where: {
                khachHangId,
                trangThai: { not: 'KET_THUC' }
            },
            include: { tinNhan: true, nhanVien: true }
        });

        if (!phien) {
            phien = await coSoDuLieu.phienTuVan.create({
                data: {
                    khachHangId,
                    trangThai: 'CHO_TU_VAN'
                },
                include: { tinNhan: true, nhanVien: true }
            });
            if (req.io) {
                req.io.emit("new_notification", { type: "NEW_SESSION", phienId: phien.id });
            }
        }

        return res.status(200).json(phien);
    } catch (error) {
        console.error("Lỗi bắt đầu tư vấn:", error);
        return res.status(500).json({ thongBao: "Lỗi khi bắt đầu tư vấn" });
    }
});

duongDan.get("/danh-sach", xacThucTruyCap, yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"), async (req, res) => {
    try {
        await donDepPhienHetHan(req.io);
        const phien = await coSoDuLieu.phienTuVan.findMany({
            where: {
                trangThai: { not: 'KET_THUC' }
            },
            include: {
                khachHang: {
                    select: { id: true, hoTen: true, email: true }
                },
                tinNhan: {
                    orderBy: { taoLuc: 'desc' },
                    take: 1
                }
            },
            orderBy: { capNhatLuc: 'desc' }
        });
        return res.json(phien);
    } catch (error) {
        return res.status(500).json({ thongBao: "Lỗi lấy danh sách tư vấn" });
    }
});

duongDan.post("/nhan-phien/:id", xacThucTruyCap, yeuCauVaiTro("QUAN_LY", "NHAN_VIEN"), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const nhanVienId = req.nguoiDung.id;

        const phienHienTai = await coSoDuLieu.phienTuVan.findUnique({
            where: { id },
            include: { nhanVien: true }
        });

        if (!phienHienTai) {
            return res.status(404).json({ thongBao: "Không tìm thấy phiên tư vấn" });
        }

        if (phienHienTai.nhanVienId && phienHienTai.nhanVienId !== nhanVienId) {
            const tenNhanVien = phienHienTai.nhanVien?.hoTen || "dược sĩ khác";
            return res.status(400).json({ 
                thongBao: `Phiên này đã được ${tenNhanVien} tiếp nhận.` 
            });
        }

        const phien = await coSoDuLieu.phienTuVan.update({
            where: { id },
            data: {
                nhanVienId,
                trangThai: 'DANG_TU_VAN'
            },
            include: { khachHang: true }
        });

        if (req.io) {
            req.io.to(`room_${id}`).emit("session_status_changed", { status: 'DANG_TU_VAN' });
            req.io.emit("new_notification", { type: "SESSION_ACCEPTED", phienId: id });
        }

        return res.json(phien);
    } catch (error) {
        return res.status(500).json({ thongBao: "Lỗi khi nhận phiên tư vấn" });
    }
});

duongDan.get("/lich-su/:phienId", xacThucTruyCap, async (req, res) => {
    try {
        const phienId = Number(req.params.phienId);
        
        const tinNhan = await coSoDuLieu.tinNhanTuVan.findMany({
            where: { phienId },
            orderBy: { taoLuc: 'asc' }
        });

        return res.json(tinNhan);
    } catch (error) {
        return res.status(500).json({ thongBao: "Lỗi lấy lịch sử tin nhắn" });
    }
});

duongDan.post("/khach-hang-ket-thuc", xacThucTruyCap, yeuCauKhachHang, async (req, res) => {
    try {
        const phien = await coSoDuLieu.phienTuVan.findFirst({
            where: {
                khachHangId: req.nguoiDung.id,
                trangThai: { not: 'KET_THUC' }
            }
        });

        if (phien) {
            await coSoDuLieu.phienTuVan.updateMany({
                where: { id: phien.id },
                data: { 
                    trangThai: 'KET_THUC',
                    ghiChu: "Khách hàng đã chủ động kết thúc phiên tư vấn"
                }
            });
            if (req.io) {
                req.io.to(`room_${phien.id}`).emit("session_status_changed", { 
                    status: 'KET_THUC', 
                    phienId: phien.id,
                    thongBao: "Khách hàng đã kết thúc phiên tư vấn" 
                });
                req.io.emit("new_notification", { type: "SESSION_CLOSED", phienId: phien.id });
            }
        }
        return res.json({ thongBao: "Đã đóng phiên tư vấn" });
    } catch (error) {
        console.error("Lỗi đóng phiên khách hàng:", error);
        return res.status(500).json({ thongBao: "Lỗi khi đóng phiên" });
    }
});

duongDan.post("/ket-thuc/:id", xacThucTruyCap, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const lyDo = (req.body && req.body.lyDo) ? req.body.lyDo : "Đã kết thúc phiên tư vấn";

        console.log(`Bắt đầu đóng phiên: ${id} | Lý do: ${lyDo}`);

        const phienUpdate = await coSoDuLieu.phienTuVan.updateMany({
            where: { id },
            data: { 
                trangThai: 'KET_THUC',
                ghiChu: lyDo
            }
        });

        console.log(`Kết quả Prisma:`, phienUpdate);

        if (req.io) {
            console.log(`📡 Phát tín hiệu Socket cho room_${id}`);
            req.io.to(`room_${id}`).emit("session_status_changed", { 
                status: 'KET_THUC',
                phienId: id,
                thongBao: lyDo
            });
            req.io.emit("new_notification", { type: "SESSION_CLOSED", phienId: id });
        }

        return res.json({ thongBao: lyDo });
    } catch (error) {
        console.error("LỖI NGHIÊM TRỌNG KHI KẾT THÚC TƯ VẤN:", error);
        return res.status(500).json({ thongBao: "Lỗi hệ thống khi kết thúc phiên" });
    }
});

duongDan.get("/tat-ca-lich-su", xacThucTruyCap, yeuCauVaiTro("QUAN_LY"), async (req, res) => {
    try {
        const { page = 1, limit = 20, tuKhoa = "", ngay = "", coAnh = "" } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = {
            trangThai: 'KET_THUC',
            OR: [
                { khachHang: { hoTen: { contains: tuKhoa } } },
                { nhanVien: { hoTen: { contains: tuKhoa } } }
            ]
        };

        if (coAnh === "true") {
            filter.tinNhan = {
                some: { laHinhAnh: true }
            };
        }

        if (ngay) {
            const batDau = new Date(ngay);
            batDau.setHours(0, 0, 0, 0);
            const ketThuc = new Date(ngay);
            ketThuc.setHours(23, 59, 59, 999);
            filter.taoLuc = { gte: batDau, lte: ketThuc };
        }

        const [danhSach, tongCong] = await Promise.all([
            coSoDuLieu.phienTuVan.findMany({
                where: filter,
                include: {
                    khachHang: { select: { id: true, hoTen: true, email: true } },
                    nhanVien: { select: { id: true, hoTen: true, email: true } }
                },
                orderBy: { taoLuc: 'desc' },
                skip: Number(skip),
                take: Number(limit)
            }),
            coSoDuLieu.phienTuVan.count({ where: filter })
        ]);

        return res.json({
            danhSach,
            tongCong,
            hasMore: skip + danhSach.length < tongCong
        });
    } catch (error) {
        console.error("Lỗi lấy toàn bộ lịch sử:", error);
        return res.status(500).json({ thongBao: "Lỗi hệ thống khi lấy lịch sử" });
    }
});

duongDan.delete("/xoa-phien/:id", xacThucTruyCap, yeuCauVaiTro("QUAN_LY"), async (req, res) => {
    try {
        const id = Number(req.params.id);
        
        const tinNhanAnh = await coSoDuLieu.tinNhanTuVan.findMany({
            where: { phienId: id, laHinhAnh: true }
        });

        if (tinNhanAnh.length > 0) {
            const pids = tinNhanAnh.map(m => getPublicIdFromUrl(m.noiDung)).filter(pid => pid);
            for (const pid of pids) {
                await cloudinary.uploader.destroy(pid).catch(err => 
                    console.error(`Lỗi xóa ảnh Cloudinary ${pid}:`, err)
                );
            }
            console.log(`[MANUAL_DELETE] Đã xóa ${pids.length} ảnh trên Cloudinary của phiên ${id}`);
        }

        await coSoDuLieu.phienTuVan.delete({ where: { id } });

        return res.json({ thongBao: "Đã xóa vĩnh viễn phiên tư vấn và toàn bộ dữ liệu liên quan." });
    } catch (error) {
        console.error("Lỗi khi xóa phiên tư vấn:", error);
        return res.status(500).json({ thongBao: "Lỗi hệ thống khi xóa phiên tư vấn" });
    }
});

module.exports = duongDan;
