const fs = require('fs');
const path = require('path');
const { cloudinary } = require('../config/cloudinary');

/**
 * Xử lý lưu ảnh tư vấn (Cloudinary ưu tiên, nếu chưa cấu hình thì lưu vào thư mục /uploads/chat)
 */
async function luuAnhTuVan(fileOrBase64) {
    if (!fileOrBase64) return "";

    const hasCloudinary = Boolean(
        process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_API_KEY && 
        process.env.CLOUDINARY_API_SECRET
    );

    // 1. Nếu là chuỗi base64 (data:image/...)
    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:image')) {
        if (hasCloudinary) {
            try {
                const uploadRes = await cloudinary.uploader.upload(fileOrBase64, {
                    folder: 'chat_images',
                    resource_type: 'auto'
                });
                return uploadRes.secure_url;
            } catch (err) {
                console.warn('⚠️ Lỗi upload Cloudinary qua Base64, chuyển sang lưu nội bộ:', err.message);
            }
        }

        // Fallback lưu local
        try {
            const matches = fileOrBase64.match(/^data:image\/([a-zA-Z0-9\+\.]+);base64,(.+)$/);
            if (matches) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                const uploadDir = path.join(__dirname, '../../uploads/chat');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
                fs.writeFileSync(path.join(uploadDir, fileName), buffer);
                const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.CONG_SERVER || 4000}`;
                return `${baseUrl}/uploads/chat/${fileName}`;
            }
        } catch (e) {
            console.error('Lỗi khi lưu ảnh Base64 local:', e);
        }
    }

    // 2. Nếu là Multer Buffer File ({ buffer, originalname, mimetype })
    if (fileOrBase64 && fileOrBase64.buffer) {
        if (hasCloudinary) {
            try {
                const uploadRes = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'chat_images', resource_type: 'auto' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    stream.end(fileOrBase64.buffer);
                });
                return uploadRes.secure_url;
            } catch (err) {
                console.warn('⚠️ Lỗi upload Cloudinary qua Buffer, chuyển sang lưu nội bộ:', err.message);
            }
        }

        // Fallback lưu local
        try {
            const uploadDir = path.join(__dirname, '../../uploads/chat');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const ext = path.extname(fileOrBase64.originalname || '.jpg') || '.jpg';
            const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
            fs.writeFileSync(path.join(uploadDir, fileName), fileOrBase64.buffer);
            const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.CONG_SERVER || 4000}`;
            return `${baseUrl}/uploads/chat/${fileName}`;
        } catch (e) {
            console.error('Lỗi khi lưu buffer ảnh local:', e);
        }
    }

    // Nếu đã là link URL hoàn chỉnh
    return typeof fileOrBase64 === 'string' ? fileOrBase64 : "";
}

module.exports = { luuAnhTuVan };
