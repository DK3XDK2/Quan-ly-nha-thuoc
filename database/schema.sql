-- CreateTable
CREATE TABLE `nguoi_dung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ho_ten` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mat_khau` VARCHAR(191) NOT NULL,
    `vai_tro` ENUM('QUAN_LY', 'NHAN_VIEN') NOT NULL,
    `trang_thai` ENUM('HOAT_DONG', 'KHOA') NOT NULL DEFAULT 'HOAT_DONG',
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cap_nhat_luc` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nguoi_dung_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `danh_muc_thuoc` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ten_danh_muc` VARCHAR(191) NOT NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cap_nhat_luc` DATETIME(3) NOT NULL,

    UNIQUE INDEX `danh_muc_thuoc_ten_danh_muc_key`(`ten_danh_muc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thuoc` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ma_thuoc` VARCHAR(191) NOT NULL,
    `ten_thuoc` VARCHAR(191) NOT NULL,
    `hoat_chat` VARCHAR(191) NULL,
    `ham_luong` VARCHAR(191) NULL,
    `don_vi_tinh` VARCHAR(191) NOT NULL,
    `gia_ban` DECIMAL(12, 2) NOT NULL,
    `can_don_thuoc` BOOLEAN NOT NULL DEFAULT false,
    `con_kinh_doanh` BOOLEAN NOT NULL DEFAULT true,
    `danh_muc_thuoc_id` INTEGER NOT NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cap_nhat_luc` DATETIME(3) NOT NULL,

    UNIQUE INDEX `thuoc_ma_thuoc_key`(`ma_thuoc`),
    INDEX `thuoc_ten_thuoc_idx`(`ten_thuoc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lo_ton_kho` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thuoc_id` INTEGER NOT NULL,
    `so_lo` VARCHAR(191) NOT NULL,
    `han_su_dung` DATETIME(3) NOT NULL,
    `so_luong_ton` INTEGER NOT NULL DEFAULT 0,
    `gia_nhap` DECIMAL(12, 2) NOT NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cap_nhat_luc` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `don_thuoc` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ten_benh_nhan` VARCHAR(191) NULL,
    `ten_bac_si` VARCHAR(191) NULL,
    `trang_thai` ENUM('MOI_TAO', 'DA_DUYET', 'TU_CHOI') NOT NULL DEFAULT 'MOI_TAO',
    `nguoi_tao_id` INTEGER NOT NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cap_nhat_luc` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chi_tiet_don_thuoc` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `don_thuoc_id` INTEGER NOT NULL,
    `thuoc_id` INTEGER NOT NULL,
    `so_luong` INTEGER NOT NULL,
    `lieu_dung` VARCHAR(191) NOT NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hoa_don` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nguoi_tao_id` INTEGER NOT NULL,
    `don_thuoc_id` INTEGER NULL,
    `tong_tien` DECIMAL(12, 2) NOT NULL,
    `phuong_thuc_thanh_toan` VARCHAR(191) NOT NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hoa_don_don_thuoc_id_idx`(`don_thuoc_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chi_tiet_hoa_don` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hoa_don_id` INTEGER NOT NULL,
    `thuoc_id` INTEGER NOT NULL,
    `so_luong` INTEGER NOT NULL,
    `don_vi_tinh` VARCHAR(191) NOT NULL,
    `don_gia` DECIMAL(12, 2) NOT NULL,
    `thanh_tien` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goi_y_ai` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loai` ENUM('TON_KHO_THAP', 'SAP_HET_HAN', 'XU_HUONG_MUA') NOT NULL,
    `du_lieu_dau_vao` JSON NOT NULL,
    `du_lieu_dau_ra` JSON NOT NULL,
    `do_tin_cay` DOUBLE NOT NULL,
    `trang_thai` ENUM('CHO_DUYET', 'DA_DUYET', 'TU_CHOI') NOT NULL DEFAULT 'CHO_DUYET',
    `duyet_boi_id` INTEGER NULL,
    `ghi_chu_duyet` VARCHAR(191) NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nhat_ky_he_thong` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nguoi_thuc_hien_id` INTEGER NULL,
    `loai_tac_nhan` ENUM('USER', 'HE_THONG') NOT NULL DEFAULT 'USER',
    `hanh_dong` VARCHAR(191) NOT NULL,
    `doi_tuong` VARCHAR(191) NOT NULL,
    `doi_tuong_id` INTEGER NULL,
    `truoc_thay_doi` JSON NULL,
    `sau_thay_doi` JSON NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `khach_hang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ho_ten` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `so_dien_thoai` VARCHAR(191) NOT NULL,
    `dia_chi` VARCHAR(191) NULL,
    `mat_khau` VARCHAR(191) NOT NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cap_nhat_luc` DATETIME(3) NOT NULL,

    UNIQUE INDEX `khach_hang_email_key`(`email`),
    INDEX `khach_hang_so_dien_thoai_idx`(`so_dien_thoai`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `don_hang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ma_don_hang` VARCHAR(191) NOT NULL,
    `khach_hang_id` INTEGER NULL,
    `ten_nguoi_nhan` VARCHAR(191) NOT NULL,
    `so_dien_thoai_nhan` VARCHAR(191) NOT NULL,
    `email_nguoi_nhan` VARCHAR(191) NULL,
    `dia_chi_giao` VARCHAR(191) NOT NULL,
    `ghi_chu` VARCHAR(191) NULL,
    `tong_tien_hang` DECIMAL(12, 2) NOT NULL,
    `phi_giao_hang` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `tong_thanh_toan` DECIMAL(12, 2) NOT NULL,
    `trang_thai` ENUM('MOI_TAO', 'DA_XAC_NHAN', 'DANG_GIAO', 'HOAN_TAT', 'HUY') NOT NULL DEFAULT 'MOI_TAO',
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cap_nhat_luc` DATETIME(3) NOT NULL,

    UNIQUE INDEX `don_hang_ma_don_hang_key`(`ma_don_hang`),
    INDEX `don_hang_khach_hang_id_idx`(`khach_hang_id`),
    INDEX `don_hang_so_dien_thoai_nhan_idx`(`so_dien_thoai_nhan`),
    INDEX `don_hang_tao_luc_idx`(`tao_luc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chi_tiet_don_hang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `don_hang_id` INTEGER NOT NULL,
    `thuoc_id` INTEGER NOT NULL,
    `so_luong` INTEGER NOT NULL,
    `don_gia` DECIMAL(12, 2) NOT NULL,
    `thanh_tien` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lich_su_xuat_kho` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lo_ton_kho_id` INTEGER NOT NULL,
    `so_luong_xuat` INTEGER NOT NULL,
    `nguoi_xuat_id` INTEGER NOT NULL,
    `li_do_xuat` ENUM('BAN_HANG', 'HU_HANG', 'KIEM_KE', 'HET_HAN') NOT NULL,
    `tham_chieu_id` INTEGER NULL,
    `loai_tham_chieu` ENUM('HOA_DON', 'DON_HANG') NULL,
    `tao_luc` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `thuoc` ADD CONSTRAINT `thuoc_danh_muc_thuoc_id_fkey` FOREIGN KEY (`danh_muc_thuoc_id`) REFERENCES `danh_muc_thuoc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lo_ton_kho` ADD CONSTRAINT `lo_ton_kho_thuoc_id_fkey` FOREIGN KEY (`thuoc_id`) REFERENCES `thuoc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `don_thuoc` ADD CONSTRAINT `don_thuoc_nguoi_tao_id_fkey` FOREIGN KEY (`nguoi_tao_id`) REFERENCES `nguoi_dung`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_don_thuoc` ADD CONSTRAINT `chi_tiet_don_thuoc_don_thuoc_id_fkey` FOREIGN KEY (`don_thuoc_id`) REFERENCES `don_thuoc`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_don_thuoc` ADD CONSTRAINT `chi_tiet_don_thuoc_thuoc_id_fkey` FOREIGN KEY (`thuoc_id`) REFERENCES `thuoc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hoa_don` ADD CONSTRAINT `hoa_don_nguoi_tao_id_fkey` FOREIGN KEY (`nguoi_tao_id`) REFERENCES `nguoi_dung`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hoa_don` ADD CONSTRAINT `hoa_don_don_thuoc_id_fkey` FOREIGN KEY (`don_thuoc_id`) REFERENCES `don_thuoc`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_hoa_don` ADD CONSTRAINT `chi_tiet_hoa_don_hoa_don_id_fkey` FOREIGN KEY (`hoa_don_id`) REFERENCES `hoa_don`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_hoa_don` ADD CONSTRAINT `chi_tiet_hoa_don_thuoc_id_fkey` FOREIGN KEY (`thuoc_id`) REFERENCES `thuoc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goi_y_ai` ADD CONSTRAINT `goi_y_ai_duyet_boi_id_fkey` FOREIGN KEY (`duyet_boi_id`) REFERENCES `nguoi_dung`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nhat_ky_he_thong` ADD CONSTRAINT `nhat_ky_he_thong_nguoi_thuc_hien_id_fkey` FOREIGN KEY (`nguoi_thuc_hien_id`) REFERENCES `nguoi_dung`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `don_hang` ADD CONSTRAINT `don_hang_khach_hang_id_fkey` FOREIGN KEY (`khach_hang_id`) REFERENCES `khach_hang`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_don_hang` ADD CONSTRAINT `chi_tiet_don_hang_don_hang_id_fkey` FOREIGN KEY (`don_hang_id`) REFERENCES `don_hang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_don_hang` ADD CONSTRAINT `chi_tiet_don_hang_thuoc_id_fkey` FOREIGN KEY (`thuoc_id`) REFERENCES `thuoc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lich_su_xuat_kho` ADD CONSTRAINT `lich_su_xuat_kho_lo_ton_kho_id_fkey` FOREIGN KEY (`lo_ton_kho_id`) REFERENCES `lo_ton_kho`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lich_su_xuat_kho` ADD CONSTRAINT `lich_su_xuat_kho_nguoi_xuat_id_fkey` FOREIGN KEY (`nguoi_xuat_id`) REFERENCES `nguoi_dung`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

