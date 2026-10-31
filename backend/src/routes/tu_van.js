const express = require("express");
const multer = require("multer");
const { coSoDuLieu } = require("../config/database");
const { xacThucTruyCap, yeuCauKhachHang, yeuCauVaiTro } = require("../middleware/xac_thuc");
const { cloudinary } = require("../config/cloudinary");
const { luuAnhTuVan } = require("../utils/chat_upload");

const uploadChat = multer({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    storage: multer.memoryStorage()
});

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
    const hetHanChoLuc = new Date(Date.now() - NAM_PHUT);

    const MUOI_PHUT = 10 * 60 * 1000;
    const hetHanImLangLuc = new Date(Date.now() - MUOI_PHUT);

    try {
        // 1. Dọn dẹp phiên ĐANG CHỜ (CHO_TU_VAN) quá 5 phút mà chưa có Dược sĩ tiếp nhận
        const phienChoHetHan = await coSoDuLieu.phienTuVan.findMany({
            where: {
                trangThai: 'CHO_TU_VAN',
                taoLuc: { lt: hetHanChoLuc }
            }
        });

        for (const p of phienChoHetHan) {
            await coSoDuLieu.phienTuVan.update({
                where: { id: p.id },
                data: { 
                    trangThai: 'KET_THUC',
                    ghiChu: "Hệ thống tự động đóng: Dược sĩ đều đang bận, quá thời gian chờ tiếp nhận (5 phút)."
                }
            });
            console.log(`⏱️ Đã tự động đóng phiên chờ ${p.id} do quá 5 phút không có dược sĩ tiếp nhận.`);
            if (io) {
                io.to(`room_${p.id}`).emit("session_status_changed", { 
                    status: 'KET_THUC', 
                    phienId: p.id,
                    thongBao: "Tất cả Dược sĩ ca trực hiện đang bận hỗ trợ khách hàng khác. Quý khách vui lòng thử lại sau ít phút hoặc chat với Trợ lý AI 24/7 nhé!" 
                });
                io.emit("new_notification", { type: "SESSION_CLOSED", phienId: p.id });
            }
        }

        // 2. Dọn dẹp phiên ĐANG TƯ VẤN (DANG_TU_VAN) nhưng im lặng quá 10 phút
        const phienImLang = await coSoDuLieu.phienTuVan.findMany({
            where: {
                trangThai: 'DANG_TU_VAN',
                capNhatLuc: { lt: hetHanImLangLuc }
            }
        });

        for (const p of phienImLang) {
            await coSoDuLieu.phienTuVan.update({
                where: { id: p.id },
                data: { 
                    trangThai: 'KET_THUC',
                    ghiChu: "Hệ thống tự động đóng do quá thời gian phản hồi (10 phút im lặng)."
                }
            });
            console.log(`⏱️ Đã tự động đóng phiên tư vấn ${p.id} do im lặng quá 10 phút.`);
            if (io) {
                io.to(`room_${p.id}`).emit("session_status_changed", { 
                    status: 'KET_THUC', 
                    phienId: p.id,
                    thongBao: "Phiên tư vấn đã tự động kết thúc do quá thời gian phản hồi." 
                });
                io.emit("new_notification", { type: "SESSION_CLOSED", phienId: p.id });
            }
        }
    } catch (e) {
        console.error("Lỗi khi dọn dẹp phiên hết hạn:", e);
    }
}

duongDan.get("/hien-tai", xacThucTruyCap, yeuCauKhachHang, async (req, res) => {
    try {
        await donDepPhienHetHan(req.io);

        const khachHangId = req.nguoiDung.id;
        let phien = await coSoDuLieu.phienTuVan.findFirst({
            where: {
                khachHangId,
                trangThai: { not: 'KET_THUC' }
            },
            include: { 
                nhanVien: { select: { id: true, hoTen: true } },
                tinNhan: { orderBy: { taoLuc: 'asc' } }
            }
        });

        // Kiểm tra độc lập nếu phiên CHO_TU_VAN đã tạo quá 5 phút
        if (phien && phien.trangThai === 'CHO_TU_VAN') {
            const timeDiff = Date.now() - new Date(phien.taoLuc).getTime();
            if (timeDiff >= 5 * 60 * 1000) {
                await coSoDuLieu.phienTuVan.update({
                    where: { id: phien.id },
                    data: {
                        trangThai: 'KET_THUC',
                        ghiChu: "Hệ thống tự động đóng: Dược sĩ đều đang bận, quá thời gian chờ tiếp nhận (5 phút)."
                    }
                });
                if (req.io) {
                    req.io.to(`room_${phien.id}`).emit("session_status_changed", {
                        status: 'KET_THUC',
                        phienId: phien.id,
                        thongBao: "Tất cả Dược sĩ ca trực hiện đang bận hỗ trợ khách hàng khác."
                    });
                    req.io.emit("new_notification", { type: "SESSION_CLOSED", phienId: phien.id });
                }
                phien = null; // Trả về null để giao diện không bị kẹt ở màn hình chờ!
            }
        }

        return res.json(phien || null);
    } catch (error) {
        return res.status(500).json({ thongBao: "Lỗi lấy phiên hiện tại" });
    }
});

duongDan.post("/bat-dau", xacThucTruyCap, yeuCauKhachHang, async (req, res) => {
    try {
        await donDepPhienHetHan(req.io);
        const khachHangId = req.nguoiDung.id;

        let phien = await coSoDuLieu.phienTuVan.findFirst({
            where: {
                khachHangId,
                trangThai: { not: 'KET_THUC' }
            },
            include: { tinNhan: true, nhanVien: true }
        });

        // Nếu có phiên cũ CHO_TU_VAN đã quá 5 phút chờ
        if (phien && phien.trangThai === 'CHO_TU_VAN' && (Date.now() - new Date(phien.taoLuc).getTime() >= 5 * 60 * 1000)) {
            await coSoDuLieu.phienTuVan.update({
                where: { id: phien.id },
                data: {
                    trangThai: 'KET_THUC',
                    ghiChu: "Hệ thống tự động đóng phiên cũ do quá thời gian chờ tiếp nhận"
                }
            });
            phien = null;
        }

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
                    select: { id: true, hoTen: true, email: true, soDienThoai: true }
                },
                nhanVien: {
                    select: { id: true, hoTen: true }
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

duongDan.post("/tai-anh", xacThucTruyCap, uploadChat.single("image"), async (req, res) => {
    try {
        let fileUrl = "";
        if (req.file) {
            fileUrl = await luuAnhTuVan(req.file);
        } else if (req.body && req.body.base64) {
            fileUrl = await luuAnhTuVan(req.body.base64);
        } else {
            return res.status(400).json({ thongBao: "Vui lòng đính kèm tệp hình ảnh" });
        }

        if (!fileUrl) {
            return res.status(500).json({ thongBao: "Không thể lưu hình ảnh" });
        }

        return res.json({ url: fileUrl });
    } catch (error) {
        console.error("Lỗi upload ảnh tư vấn:", error);
        return res.status(500).json({ thongBao: "Lỗi tải ảnh lên máy chủ" });
    }
});

duongDan.post("/da-xem/:phienId", xacThucTruyCap, async (req, res) => {
    try {
        const phienId = Number(req.params.phienId);
        const vaiTro = (req.nguoiDung.vaiTro === 'KHACH_HANG' || req.nguoiDung.loaiTaiKhoan === 'KHACH_HANG') 
            ? 'KHACH_HANG' 
            : 'NHAN_VIEN';

        await coSoDuLieu.tinNhanTuVan.updateMany({
            where: {
                phienId,
                vaiTroGui: vaiTro === 'KHACH_HANG' ? { not: 'KHACH_HANG' } : 'KHACH_HANG',
                daXem: false
            },
            data: { daXem: true }
        });

        if (req.io) {
            req.io.to(`room_${phienId}`).emit("messages_seen", { 
                phienId, 
                vaiTro, 
                daXemLuc: new Date() 
            });
        }

        return res.json({ thanhCong: true });
    } catch (e) {
        return res.status(500).json({ thongBao: "Lỗi cập nhật đã xem" });
    }
});

duongDan.post("/gui-tin", xacThucTruyCap, async (req, res) => {
    try {
        let { phienId, noiDung, laHinhAnh, tempId } = req.body;
        if (!phienId || !noiDung) {
            return res.status(400).json({ thongBao: "Thiếu dữ liệu tin nhắn" });
        }

        const phien = await coSoDuLieu.phienTuVan.findUnique({
            where: { id: Number(phienId) },
            include: { nhanVien: true }
        });

        if (!phien) {
            return res.status(404).json({ thongBao: "Không tìm thấy phiên tư vấn" });
        }

        if (phien.trangThai === 'KET_THUC') {
            return res.status(400).json({ thongBao: "Phiên tư vấn này đã kết thúc" });
        }

        const vaiTroGui = (req.nguoiDung.vaiTro === 'KHACH_HANG' || req.nguoiDung.loaiTaiKhoan === 'KHACH_HANG') 
            ? 'KHACH_HANG' 
            : 'NHAN_VIEN';

        // Phân quyền chặt chẽ:
        if (vaiTroGui === 'NHAN_VIEN') {
            const isQuanLy = req.nguoiDung.vaiTro === 'QUAN_LY' || req.nguoiDung.vaiTro === 'ADMIN';
            const isAssigned = phien.nhanVienId && Number(phien.nhanVienId) === Number(req.nguoiDung.id);
            if (!isQuanLy && !isAssigned) {
                const tenPhuTrach = phien.nhanVien?.hoTen || "Dược sĩ khác";
                return res.status(403).json({ 
                    thongBao: `Phiên tư vấn này đang được phụ trách bởi ${tenPhuTrach}. Chỉ Dược sĩ phụ trách hoặc Quản lý mới có quyền gửi tin nhắn.` 
                });
            }
        } else {
            if (phien.khachHangId !== req.nguoiDung.id) {
                return res.status(403).json({ thongBao: "Bạn không có quyền gửi tin nhắn vào phiên tư vấn này" });
            }
        }

        if (laHinhAnh) {
            noiDung = await luuAnhTuVan(noiDung);
        }

        const tinNhan = await coSoDuLieu.tinNhanTuVan.create({
            data: {
                phienId: Number(phienId),
                nguoiGuiId: Number(req.nguoiDung.id),
                vaiTroGui,
                noiDung: String(noiDung),
                laHinhAnh: !!laHinhAnh,
                daXem: false
            }
        });

        await coSoDuLieu.phienTuVan.update({
            where: { id: Number(phienId) },
            data: { capNhatLuc: new Date() }
        });

        const payload = { ...tinNhan, tempId: tempId || null };

        if (req.io) {
            req.io.to(`room_${phienId}`).emit("receive_message", payload);
            if (vaiTroGui === 'KHACH_HANG') {
                req.io.emit("new_notification", { phienId, message: "Khách hàng đã gửi tin mới" });
            }
        }

        return res.status(201).json(payload);
    } catch (error) {
        console.error("Lỗi gửi tin nhắn:", error);
        return res.status(500).json({ thongBao: "Lỗi khi gửi tin nhắn" });
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

        if (phienHienTai.nhanVienId && Number(phienHienTai.nhanVienId) !== Number(nhanVienId)) {
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
        
        const phien = await coSoDuLieu.phienTuVan.findUnique({
            where: { id: phienId },
            include: { nhanVien: true }
        });

        if (!phien) {
            return res.status(404).json({ thongBao: "Không tìm thấy phiên tư vấn" });
        }

        const isKhachHang = (req.nguoiDung.vaiTro === 'KHACH_HANG' || req.nguoiDung.loaiTaiKhoan === 'KHACH_HANG');
        if (isKhachHang) {
            if (phien.khachHangId !== req.nguoiDung.id) {
                return res.status(403).json({ thongBao: "Bạn không có quyền xem tin nhắn của phiên này" });
            }
        } else {
            const isQuanLy = req.nguoiDung.vaiTro === 'QUAN_LY' || req.nguoiDung.vaiTro === 'ADMIN';
            const isAssigned = phien.nhanVienId && Number(phien.nhanVienId) === Number(req.nguoiDung.id);
            const isWaiting = phien.trangThai === 'CHO_TU_VAN';
            // Nhân viên thường không được xem nội dung hội thoại của Dược sĩ khác
            if (!isWaiting && !isQuanLy && !isAssigned) {
                return res.status(403).json({ thongBao: "Quyền truy cập bị hạn chế: Phiên tư vấn này do Dược sĩ khác phụ trách." });
            }
        }

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
        let lyDo = "Khách hàng đã chủ động kết thúc phiên tư vấn";
        if (req.body && req.body.lyDo) lyDo = req.body.lyDo;
        else if (req.query && req.query.lyDo) lyDo = req.query.lyDo;

        const phien = await coSoDuLieu.phienTuVan.findFirst({
            where: {
                khachHangId: req.nguoiDung.id,
                trangThai: { not: 'KET_THUC' }
            }
        });

        if (phien) {
            await coSoDuLieu.phienTuVan.update({
                where: { id: phien.id },
                data: { 
                    trangThai: 'KET_THUC',
                    ghiChu: lyDo
                }
            });
            if (req.io) {
                req.io.to(`room_${phien.id}`).emit("session_status_changed", { 
                    status: 'KET_THUC', 
                    phienId: phien.id,
                    thongBao: lyDo 
                });
                req.io.emit("new_notification", { type: "SESSION_CLOSED", phienId: phien.id });
            }
        }
        return res.json({ thongBao: lyDo });
    } catch (error) {
        console.error("Lỗi đóng phiên khách hàng:", error);
        return res.status(500).json({ thongBao: "Lỗi khi đóng phiên" });
    }
});

duongDan.post("/ket-thuc/:id", xacThucTruyCap, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const lyDo = (req.body && req.body.lyDo) ? req.body.lyDo : "Đã kết thúc phiên tư vấn";

        const phien = await coSoDuLieu.phienTuVan.findUnique({
            where: { id },
            include: { nhanVien: true }
        });

        if (!phien) {
            return res.status(404).json({ thongBao: "Không tìm thấy phiên tư vấn" });
        }

        const isKhachHang = (req.nguoiDung.vaiTro === 'KHACH_HANG' || req.nguoiDung.loaiTaiKhoan === 'KHACH_HANG');
        if (isKhachHang) {
            if (phien.khachHangId !== req.nguoiDung.id) {
                return res.status(403).json({ thongBao: "Bạn không có quyền kết thúc phiên tư vấn này" });
            }
        } else {
            const isQuanLy = req.nguoiDung.vaiTro === 'QUAN_LY' || req.nguoiDung.vaiTro === 'ADMIN';
            const isAssigned = phien.nhanVienId && Number(phien.nhanVienId) === Number(req.nguoiDung.id);
            if (!isQuanLy && !isAssigned) {
                const tenPhuTrach = phien.nhanVien?.hoTen || "Dược sĩ khác";
                return res.status(403).json({ 
                    thongBao: `Phiên tư vấn này đang được phụ trách bởi ${tenPhuTrach}. Chỉ Dược sĩ phụ trách hoặc Quản lý mới có quyền kết thúc phiên.` 
                });
            }
        }

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
        const { page = 1, limit = 20, tuKhoa = "", ngay = "", coAnh = "", nhanVienId = "" } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter = {
            trangThai: 'KET_THUC'
        };

        if (tuKhoa && tuKhoa.trim()) {
            const kw = tuKhoa.trim();
            filter.OR = [
                { khachHang: { hoTen: { contains: kw } } },
                { khachHang: { soDienThoai: { contains: kw } } },
                { nhanVien: { hoTen: { contains: kw } } }
            ];
        }

        if (nhanVienId) {
            filter.nhanVienId = Number(nhanVienId);
        }

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

        const homNayBatDau = new Date();
        homNayBatDau.setHours(0, 0, 0, 0);

        const [danhSach, tongCong, phienHomNay, phienCoAnh] = await Promise.all([
            coSoDuLieu.phienTuVan.findMany({
                where: filter,
                include: {
                    khachHang: { select: { id: true, hoTen: true, email: true, soDienThoai: true } },
                    nhanVien: { select: { id: true, hoTen: true, email: true } },
                    _count: { select: { tinNhan: true } }
                },
                orderBy: { taoLuc: 'desc' },
                skip: Number(skip),
                take: Number(limit)
            }),
            coSoDuLieu.phienTuVan.count({ where: filter }),
            coSoDuLieu.phienTuVan.count({
                where: { trangThai: 'KET_THUC', taoLuc: { gte: homNayBatDau } }
            }),
            coSoDuLieu.phienTuVan.count({
                where: { trangThai: 'KET_THUC', tinNhan: { some: { laHinhAnh: true } } }
            })
        ]);

        return res.json({
            danhSach,
            tongCong,
            hasMore: skip + danhSach.length < tongCong,
            thongKe: {
                tongPhien: tongCong,
                phienHomNay,
                phienCoAnh
            }
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

duongDan.donDepPhienHetHan = donDepPhienHetHan;
module.exports = duongDan;

