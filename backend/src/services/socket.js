const { Server } = require("socket.io");
const { coSoDuLieu } = require("../config/database");
const { cloudinary } = require("../config/cloudinary");

function khoiTaoSocket(serverHttp) {
  const io = new Server(serverHttp, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  console.log("📡 Socket.io đã sẵn sàng!");

  io.on("connection", (socket) => {
    console.log(`🔌 Thiết bị kết nối: ${socket.id}`);

    socket.on("join_room", (phienId) => {
      socket.join(`room_${phienId}`);
      console.log(`🏠 Socket ${socket.id} đã tham gia phòng: room_${phienId}`);
    });

    socket.on("send_message", async (data) => {
      let { phienId, nguoiGuiId, vaiTroGui, noiDung, laHinhAnh } = data;
      
      try {
        if (laHinhAnh && noiDung.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(noiDung, {
                folder: 'chat_images',
                resource_type: 'auto'
            });
            noiDung = uploadRes.secure_url;
        }

        const tinNhan = await coSoDuLieu.tinNhanTuVan.create({
          data: {
            phienId: Number(phienId),
            nguoiGuiId: Number(nguoiGuiId),
            vaiTroGui,
            noiDung,
            laHinhAnh: !!laHinhAnh
          }
        });

        await coSoDuLieu.phienTuVan.update({
          where: { id: Number(phienId) },
          data: { capNhatLuc: new Date() }
        });

        io.to(`room_${phienId}`).emit("receive_message", tinNhan);
        
        if (vaiTroGui === 'KHACH_HANG') {
            io.emit("new_notification", { phienId, message: "Khách hàng đã gửi tin mới" });
        }

      } catch (error) {
        console.error("Lỗi xử lý tin nhắn socket:", error);
      }
    });

    socket.on("mark_seen", async (data) => {
        const { phienId, vaiTro } = data; 
        try {
            await coSoDuLieu.tinNhanTuVan.updateMany({
                where: {
                    phienId: Number(phienId),
                    vaiTroGui: vaiTro === 'KHACH_HANG' ? { not: 'KHACH_HANG' } : 'KHACH_HANG',
                    daXem: false
                },
                data: { daXem: true }
            });

            io.to(`room_${phienId}`).emit("messages_seen", { phienId, vaiTro });
        } catch (error) {
            console.error(" Lỗi đánh dấu đã xem:", error);
        }
    });

    socket.on("disconnect", () => {
      console.log(`Thiết bị ngắt kết nối: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { khoiTaoSocket };
