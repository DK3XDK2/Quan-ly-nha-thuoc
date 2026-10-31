const { Server } = require("socket.io");
const { coSoDuLieu } = require("../config/database");
const { luuAnhTuVan } = require("../utils/chat_upload");

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

    // Lưu ý: Việc gửi tin nhắn hiện được thực hiện chuẩn qua REST API /api/tu-van/gui-tin
    // để đảm bảo xác thực JWT, phân quyền dược sĩ và chống trùng lặp tin nhắn.
    socket.on("send_message", async (data) => {
      // No-op: API /api/tu-van/gui-tin đã lưu DB và broadcast receive_message
      console.log(`[SOCKET_SEND_DEPRECATED] Bỏ qua socket send_message phòng room_${data?.phienId} để chống duplicate.`);
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

        io.to(`room_${phienId}`).emit("messages_seen", { 
          phienId: Number(phienId), 
          vaiTro, 
          daXemLuc: new Date() 
        });
      } catch (error) {
        console.error("Lỗi đánh dấu đã xem:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Thiết bị ngắt kết nối: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { khoiTaoSocket };
