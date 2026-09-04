const express = require("express");
const { coSoDuLieu } = require("../config/database");

const router = express.Router();


router.post("/sepay-webhook", async (req, res) => {
  try {
    const payload = req.body;
    console.log("[SEPAY WEBHOOK RECEIVED]", JSON.stringify(payload, null, 2));

    const content = payload.content;
    const transferType = payload.transferType || payload.transfer_type;
    const amount = payload.transferAmount || payload.amount;
    const transaction_id = payload.id || payload.transaction_id || payload.referenceCode;

    console.log(`[SEPAY] Processing: type=${transferType}, content="${content}", amount=${amount}`);

    if (transferType === "in" || transferType === "credit") {
      const match = content ? content.match(/DH\d+/) : null;
      
      if (match) {
        const maDonHang = match[0];
        console.log(`[SEPAY] Found Order ID: ${maDonHang}`);

        const donHang = await coSoDuLieu.donHang.findUnique({
          where: { maDonHang: maDonHang },
        });

        if (donHang) {
          if (donHang.trangThai === "MOI_TAO") {
            await coSoDuLieu.donHang.update({
              where: { id: donHang.id },
              data: { 
                trangThai: "DA_XAC_NHAN",
                ghiChu: (donHang.ghiChu ? donHang.ghiChu + "\n" : "") + 
                        `[SePay] Auto-confirmed. Amt: ${amount}. TxID: ${transaction_id}`
              },
            });
            console.log(`[SEPAY] SUCCESS: Order ${maDonHang} confirmed.`);
          } else {
            console.log(`[SEPAY] Order ${maDonHang} already in state: ${donHang.trangThai}`);
          }
        } else {
          console.warn(`[SEPAY] Order NOT FOUND: ${maDonHang}`);
        }
      } else {
        console.log(`[SEPAY] No valid Order ID found in content.`);
      }
    }

    return res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("[SEPAY WEBHOOK ERROR]", error);
    return res.status(200).json({ success: false, error: error.message });
  }
});


router.get("/kiem-tra/:maDonHang", async (req, res) => {
  try {
    const { maDonHang } = req.params;
    const donHang = await coSoDuLieu.donHang.findUnique({
      where: { maDonHang: maDonHang },
    });

    if (!donHang) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (donHang.trangThai === "DA_XAC_NHAN") {
      return res.json({ success: true, daThanhToan: true });
    }

    console.log(`[SEPAY] Proactively checking status for: ${maDonHang}`);
    
    const apiToken = process.env.SEPAY_API_TOKEN;
    if (!apiToken) {
      return res.json({ success: true, daThanhToan: false, note: "API Token missing" });
    }

    const response = await fetch("https://my.sepay.vn/userapi/transactions/list?limit=20", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    const data = await response.json();
    
    if (data.transactions && Array.isArray(data.transactions)) {
      const matchingTx = data.transactions.find(tx => {
        const contentMatch = tx.transaction_content && tx.transaction_content.includes(maDonHang);
        const amountMatch = Number(tx.amount_in || tx.amount || 0) >= (Number(donHang.tongThanhToan) - 100);
        return contentMatch && amountMatch;
      });

      if (matchingTx) {
        console.log(`[SEPAY] Manual match found via API: ${matchingTx.id}`);
        
        await coSoDuLieu.donHang.update({
          where: { id: donHang.id },
          data: { 
            trangThai: "DA_XAC_NHAN",
            ghiChu: (donHang.ghiChu ? donHang.ghiChu + "\n" : "") + 
                    `[SePay API Check] Confirmed. Amt: ${matchingTx.amount}. TxID: ${matchingTx.id}`
          },
        });

        return res.json({ success: true, daThanhToan: true });
      }
    }

    return res.json({ success: true, daThanhToan: false });
  } catch (error) {
    console.error("[SEPAY CHECK ERROR]", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
