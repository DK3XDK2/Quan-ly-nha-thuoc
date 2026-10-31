// @ts-nocheck
(() => {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // CẤU HÌNH NHANH TRỰC TIẾP (Nếu không muốn dùng file env.js hay gõ console):
  // Bạn có thể dán link Ngrok trực tiếp vào biến DIRECT_BACKEND_URL này:
  const DIRECT_BACKEND_URL = ""; // Ví dụ: "https://your-domain.ngrok-free.app"

  // 1. Kiểm tra tham số ?backend=... trên URL (rất tiện khi gửi link demo cho thầy cô/bạn bè)
  try {
    if (typeof window !== "undefined" && window.location && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBackend = urlParams.get("backend");
      if (urlBackend && urlBackend.trim()) {
        const clean = urlBackend.trim().replace(/\/+$/, "");
        localStorage.setItem("BACKEND_URL", clean);
        console.log(`%c[API Config] Đã cấu hình Backend URL từ URL: ${clean}`, "color: #10b981; font-weight: bold;");
      }
    }
  } catch (e) {}

  // Tự động nạp cấu hình từ env.js nếu chưa có sẵn trong trang
  if (typeof window !== "undefined" && !window.__ENV__) {
    try {
      const xhr = new XMLHttpRequest();
      const envPath = window.location.pathname.includes("/pages/") ? "../../js/env.js" : "js/env.js";
      xhr.open("GET", envPath, false);
      xhr.send();
      if (xhr.status === 200 && xhr.responseText) {
        new Function(xhr.responseText)();
      }
    } catch (e) {}
  }

  // 2. Đọc cấu hình từ window.__ENV__ (từ file frontend/js/env.js)
  const envBackend = (window.__ENV__ && window.__ENV__.BACKEND_URL) || (window.ENV && window.ENV.BACKEND_URL);

  // 3. Đọc từ localStorage (đã lưu trước đó qua setBackendUrl hoặc query param)
  const customBackend = typeof localStorage !== "undefined" ? (localStorage.getItem("BACKEND_URL") || localStorage.getItem("API_BASE")) : null;

  // 4. Đường link mặc định dự phòng
  const defaultNgrok = "https://slighted-jelly-basis.ngrok-free.dev";

  // Thứ tự ưu tiên giải quyết URL Backend:
  // (1) localStorage -> (2) env.js -> (3) DIRECT_BACKEND_URL -> (4) Localhost:4000 hoặc defaultNgrok
  let API_BASE = "http://localhost:4000";

  if (customBackend && customBackend.trim()) {
    API_BASE = customBackend.trim().replace(/\/+$/, "");
  } else if (envBackend && envBackend.trim()) {
    API_BASE = envBackend.trim().replace(/\/+$/, "");
  } else if (DIRECT_BACKEND_URL && DIRECT_BACKEND_URL.trim()) {
    API_BASE = DIRECT_BACKEND_URL.trim().replace(/\/+$/, "");
  } else if (!isLocalhost) {
    API_BASE = defaultNgrok;
  }

  function safeGetStorage(key) {
    try {
      if (window.Storage && typeof window.Storage.get === 'function') {
        return window.Storage.get(key);
      }
      if (window.AppStorage && typeof window.AppStorage.get === 'function') {
        return window.AppStorage.get(key);
      }
      const item = localStorage.getItem(key);
      if (!item || item === 'null' || item === 'undefined') return null;
      return JSON.parse(item);
    } catch (e) {
      return null;
    }
  }

  function safeSetStorage(key, val) {
    try {
      if (window.Storage && typeof window.Storage.set === 'function') {
        return window.Storage.set(key, val);
      }
      if (window.AppStorage && typeof window.AppStorage.set === 'function') {
        return window.AppStorage.set(key, val);
      }
      if (val === null || val === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(val));
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function handleMockFallback(endpoint, options = {}) {
    if (window.MockData && typeof window.MockData.initialize === 'function') {
      window.MockData.initialize();
    }

    const cleanEndpoint = endpoint.split('?')[0];

    // 1. Danh mục thuốc
    if (cleanEndpoint.includes('/danh-muc')) {
      return Promise.resolve([
        { id: 1, tenDanhMuc: 'Thuốc' },
        { id: 2, tenDanhMuc: 'Thực phẩm bảo vệ sức khỏe' },
        { id: 3, tenDanhMuc: 'Vitamin & khoáng chất' },
        { id: 4, tenDanhMuc: 'Chăm sóc cá nhân' },
        { id: 5, tenDanhMuc: 'Thiết bị y tế' },
        { id: 6, tenDanhMuc: 'Dược mỹ phẩm' },
        { id: 7, tenDanhMuc: 'Mẹ & bé' },
        { id: 8, tenDanhMuc: 'Chăm sóc răng miệng' }
      ]);
    }

    // 2. Danh sách thuốc
    if (cleanEndpoint.includes('/api/thuoc')) {
      const rawProducts = safeGetStorage('products') || [];
      const mapped = rawProducts.map(p => {
        const numericId = parseInt((p.id || '').replace(/\D/g, '')) || Math.floor(Math.random() * 1000) + 1;
        return {
          id: numericId,
          maThuoc: p.id,
          tenThuoc: p.name,
          hoatChat: p.activeIngredient || p.ingredient || 'Paracetamol',
          hamLuong: '500mg',
          donViTinh: p.unit || 'Hộp',
          giaBan: p.price || 50000,
          giaVon: p.cost || (p.price ? p.price * 0.7 : 35000),
          tonKho: p.stock !== undefined ? p.stock : 50,
          danhMucThuoc: { id: 1, tenDanhMuc: p.category || 'Thuốc' },
          danhMuc: p.category || 'Thuốc',
          moTa: p.description || 'Sản phẩm chăm sóc sức khỏe chất lượng cao.',
          hinhAnh: p.image || '',
          conKinhDoanh: true,
          loTonKho: [
            { soLuongTon: p.stock !== undefined ? p.stock : 50, soLo: 'L01', hanSuDung: '2027-12-31' }
          ]
        };
      });

      if (cleanEndpoint.match(/\/api\/thuoc\/\d+$/)) {
        const id = Number(cleanEndpoint.split('/').pop());
        const found = mapped.find(m => m.id === id) || mapped[0];
        return Promise.resolve(found);
      }
      return Promise.resolve(mapped);
    }

    // 3. Đăng nhập / Đăng ký Khách hàng Online
    if (cleanEndpoint.includes('/api/khach-hang/dang-nhap') || cleanEndpoint.includes('/api/xac-thuc/khach-hang/dang-nhap')) {
      const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      const email = body.email || 'customer@ainapharmacy.com';
      const customers = safeGetStorage('customers') || [];
      let cust = customers.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
      const custName = cust ? cust.name : (email.split('@')[0] || 'Khách Hàng Demo');

      return Promise.resolve({
        token: 'demo_cust_token_' + Date.now(),
        thongBao: 'Đăng nhập thành công',
        khachHang: {
          id: cust ? cust.id : 999,
          hoTen: custName,
          email: email,
          soDienThoai: cust ? cust.phone : '0988888888',
          diaChi: cust ? cust.address : 'Số 123 Đường Nguyễn Trãi, Thanh Xuân, Hà Nội'
        }
      });
    }

    if (cleanEndpoint.includes('/api/khach-hang/dang-ky')) {
      const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      return Promise.resolve({
        token: 'demo_cust_token_' + Date.now(),
        thongBao: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.',
        khachHang: {
          id: Date.now(),
          hoTen: body.hoTen || 'Khách Hàng Mới',
          email: body.email,
          soDienThoai: body.soDienThoai || '0988888888',
          diaChi: body.diaChi || 'Hà Nội'
        }
      });
    }

    // 4. Đăng nhập Quản trị / Dược sĩ
    if (cleanEndpoint.includes('/api/xac-thuc/dang-nhap')) {
      const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      const email = (body.email || 'admin@ainapharmacy.com').toLowerCase();
      const isPharmacist = email.includes('pharmacist') || email.includes('duocsi');

      return Promise.resolve({
        token: 'demo_admin_token_' + Date.now(),
        thongBao: 'Đăng nhập thành công (Chế độ Demo)',
        nguoiDung: {
          id: isPharmacist ? 2 : 1,
          hoTen: isPharmacist ? 'Dược sĩ Trần Văn Minh' : 'Quản trị viên Nguyễn Admin',
          email: body.email || 'admin@ainapharmacy.com',
          vaiTro: isPharmacist ? 'DUOC_SI' : 'QUAN_LY',
          role: isPharmacist ? 'PHARMACIST' : 'ADMIN'
        }
      });
    }

    // 5. Quản lý Đơn hàng
    if (cleanEndpoint.includes('/api/don-hang')) {
      let orders = safeGetStorage('orders') || [];
      
      if (cleanEndpoint.includes('/dat-hang')) {
        const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
        const items = body.chiTiet || [];
        const calculatedTotal = items.reduce((sum, ct) => sum + ((Number(ct.donGia) || 0) * Number(ct.soLuong || 1)), 0);
        const orderTotal = Number(body.tongThanhToan) > 0 ? Number(body.tongThanhToan) : (calculatedTotal > 0 ? calculatedTotal : 3000);

        const newOrder = {
          id: Date.now(),
          maDonHang: `DH${Date.now()}`,
          tenNguoiNhan: body.tenNguoiNhan || 'Khách hàng',
          soDienThoaiNhan: body.soDienThoaiNhan || '0900000000',
          diaChiGiao: body.diaChiGiao || 'Địa chỉ demo',
          tongTienHang: orderTotal,
          phiGiaoHang: Number(body.phiGiaoHang || 0),
          tongThanhToan: orderTotal + Number(body.phiGiaoHang || 0),
          trangThai: 'MOI_TAO',
          phuongThucThanhToan: body.phuongThucThanhToan || 'CASH',
          taoLuc: new Date().toISOString(),
          chiTietDonHang: items.map(ct => ({
            thuocId: ct.thuocId,
            soLuong: ct.soLuong || 1,
            donGia: ct.donGia || (orderTotal / (items.length || 1)),
            thanhTien: (ct.donGia || (orderTotal / (items.length || 1))) * (ct.soLuong || 1),
            thuoc: ct.thuoc || { tenThuoc: `Thuốc #${ct.thuocId}` }
          }))
        };
        orders.unshift(newOrder);
        safeSetStorage('orders', orders);

        if (body.phuongThucThanhToan === 'SEPAY') {
          return Promise.resolve({
            thongBao: 'Khởi tạo thanh toán SePay thành công',
            duLieu: {
              ...newOrder,
              bankId: 'VietinBank',
              accountNo: '102882794225',
              accountName: 'VU QUANG HUY'
            }
          });
        }

        return Promise.resolve(newOrder);
      }

      if (cleanEndpoint.includes('/trang-thai') || cleanEndpoint.includes('/khach-hang-nhan-hang') || cleanEndpoint.includes('/khach-hang-huy-don') || cleanEndpoint.includes('/yeu-cau-tra-hang')) {
        const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
        const idMatch = cleanEndpoint.match(/\/api\/don-hang\/([^\/]+)\//);
        if (idMatch) {
          const currentOrders = safeGetStorage('orders') || [];
          const target = currentOrders.find(o => String(o.id) === idMatch[1] || String(o.dbId) === idMatch[1] || o.id === idMatch[1]);
          if (target && body.trangThai) {
            target.trangThai = body.trangThai;
            target.status = body.trangThai;
            safeSetStorage('orders', currentOrders);
          }
        }
        return Promise.resolve({ thongBao: 'Cập nhật thành công (Chế độ Demo)' });
      }

      const mappedOrders = orders.map(o => ({
        id: o.id || Date.now(),
        maDonHang: o.maDonHang || `DH${o.id}`,
        tenNguoiNhan: o.customerName || o.tenNguoiNhan || 'Khách Hàng',
        soDienThoaiNhan: o.customerPhone || o.soDienThoaiNhan || '0900000000',
        diaChiGiao: o.customerAddress || o.diaChiGiao || 'TP.HCM',
        tongThanhToan: o.total || o.summary?.total || o.tongThanhToan || 150000,
        trangThai: o.trangThai || (o.status === 'COMPLETED' ? 'HOAN_TAT' : (o.status === 'CANCELLED' ? 'HUY' : 'MOI_TAO')),
        phuongThucThanhToan: o.paymentMethod || 'CASH',
        taoLuc: o.timestamp || o.taoLuc || new Date().toISOString(),
        chiTietDonHang: (o.items || o.chiTietDonHang || []).map(i => ({
          thuocId: i.id || 1,
          soLuong: i.quantity || i.soLuong || 1,
          donGia: i.price || i.donGia || 50000,
          thuoc: { tenThuoc: i.name || i.tenThuoc || 'Sản phẩm' }
        }))
      }));
      return Promise.resolve(mappedOrders);
    }

    // 6. Quản lý Hóa đơn POS & Thống kê
    if (cleanEndpoint.includes('/api/hoa-don')) {
      let invoices = safeGetStorage('invoices') || [];
      if (options.method === 'POST') {
        const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
        const rawProducts = safeGetStorage('products') || [];
        const mappedItems = (body.chiTiet || []).map(ct => {
          const prod = rawProducts.find(p => p.id === ct.thuocId || p.dbId === ct.thuocId || String(p.id) === String(ct.thuocId));
          const donGia = prod ? (prod.price || prod.giaBan || 50000) : 50000;
          const qty = Number(ct.soLuong || 1);
          return {
            thuocId: ct.thuocId,
            soLuong: qty,
            donGia: donGia,
            thanhTien: qty * donGia,
            thuoc: { tenThuoc: prod ? (prod.name || prod.tenThuoc) : (ct.tenThuoc || `Thuốc #${ct.thuocId}`) }
          };
        });
        const calcTotal = mappedItems.reduce((sum, item) => sum + item.thanhTien, 0) || 50000;
        const newInvoice = {
          id: Date.now(),
          maHoaDon: `HD${Date.now().toString().slice(-6)}`,
          tongTien: calcTotal,
          phuongThucThanhToan: body.phuongThucThanhToan || 'TIEN_MAT',
          taoLuc: new Date().toISOString(),
          khachHang: { hoTen: body.khachHangId ? 'Khách hàng' : 'Khách lẻ' },
          chiTietHoaDon: mappedItems
        };
        invoices.unshift(newInvoice);
        safeSetStorage('invoices', invoices);
        return Promise.resolve(newInvoice);
      }

      if (invoices.length === 0) {
        invoices = [
          { id: 101, maHoaDon: 'HD100101', tongTien: 350000, phuongThucThanhToan: 'TIEN_MAT', taoLuc: new Date(Date.now() - 3600000).toISOString(), chiTietHoaDon: [{ soLuong: 2, donGia: 175000, thanhTien: 350000, thuoc: { tenThuoc: 'Panadol Extra' } }] },
          { id: 102, maHoaDon: 'HD100102', tongTien: 450000, phuongThucThanhToan: 'CHUYEN_KHOAN', taoLuc: new Date(Date.now() - 7200000).toISOString(), chiTietHoaDon: [{ soLuong: 1, donGia: 450000, thanhTien: 450000, thuoc: { tenThuoc: 'Glucosamine 1500mg' } }] },
          { id: 103, maHoaDon: 'HD100103', tongTien: 950000, phuongThucThanhToan: 'TIEN_MAT', taoLuc: new Date(Date.now() - 86400000).toISOString(), chiTietHoaDon: [{ soLuong: 1, donGia: 950000, thanhTien: 950000, thuoc: { tenThuoc: 'Máy đo huyết áp Omron' } }] }
        ];
        safeSetStorage('invoices', invoices);
      }

      return Promise.resolve(invoices);
    }

    // 7. Danh sách Khách hàng
    if (cleanEndpoint.includes('/api/khach-hang')) {
      const customers = safeGetStorage('customers') || [];
      return Promise.resolve(customers.map(c => ({
        id: c.id,
        hoTen: c.name,
        soDienThoai: c.phone,
        email: c.email,
        diaChi: c.address,
        tichDiem: c.points || 0
      })));
    }

    // 8. Danh sách Nhân viên
    if (cleanEndpoint.includes('/api/xac-thuc/nhan-vien')) {
      const users = safeGetStorage('users') || [];
      return Promise.resolve(users.map(u => ({
        id: u.id,
        hoTen: u.name,
        email: u.email,
        vaiTro: u.role === 'ADMIN' ? 'QUAN_LY' : 'NHAN_VIEN'
      })));
    }

    // 9. Nhà cung cấp
    if (cleanEndpoint.includes('/api/nha-cung-cap')) {
      const suppliers = safeGetStorage('suppliers') || [];
      return Promise.resolve(suppliers);
    }

    // 10. Kiểm tra thanh toán SePay
    if (cleanEndpoint.includes('/api/thanh-toan/kiem-tra')) {
      const maDon = cleanEndpoint.split('/').pop();
      const orders = safeGetStorage('orders') || [];
      const ord = orders.find(o => o.maDonHang === maDon || String(o.id) === maDon);
      const daThanhToan = ord && (ord.trangThai === 'DA_XAC_NHAN' || ord.status === 'CONFIRMED' || ord.daThanhToan);
      return Promise.resolve({ success: true, daThanhToan: !!daThanhToan });
    }

    return Promise.resolve([]);
  }

  const API = {
    baseUrl: API_BASE,

    getContext: function() {
      return window.location.pathname.includes('/admin/') ? 'ADMIN' : 'CUSTOMER';
    },

    getToken: function () {
      if (this.getContext() === 'ADMIN') {
        return localStorage.getItem("admin_token");
      }
      return localStorage.getItem("shop_token");
    },

    setToken: function (token, role = '') {
      if (role === 'KHACH_HANG' || this.getContext() === 'CUSTOMER') {
        localStorage.setItem("shop_token", token);
      } else {
        localStorage.setItem("admin_token", token);
      }

      localStorage.setItem("token", token);
    },

    clearAuth: function () {
      const keysToRemove = [
        "admin_token", "admin_user",
        "shop_token", "shop_user",
        "token", "user_token", "currentUser",
        "selectedProductId", "pos_cart", "cart",
        "draft_orders", "activePrescription", "active_tab",
        "aina_messenger_ai_history"
      ];
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      } catch (e) {}

      try {
        if (typeof document !== 'undefined' && document.cookie) {
          document.cookie.split(";").forEach(c => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
        }
      } catch (e) {}
    },

    getCurrentUser: function () {
      try {
        let u;
        if (this.getContext() === 'ADMIN') {
          u = localStorage.getItem("admin_user");
        } else {
          u = localStorage.getItem("shop_user");
        }

        if (!u) {
            const fallback = localStorage.getItem("currentUser");
            if (fallback) {
                const parsed = JSON.parse(fallback);
                if (this.getContext() === 'ADMIN' && parsed.vaiTro !== 'KHACH_HANG' && parsed.loaiTaiKhoan !== 'KHACH_HANG') {
                    u = fallback;
                } else if (this.getContext() === 'CUSTOMER' && (parsed.vaiTro === 'KHACH_HANG' || parsed.loaiTaiKhoan === 'KHACH_HANG')) {
                    u = fallback;
                }
            }
        }
        
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },

    setCurrentUser: function (user) {
      if (user.loaiTaiKhoan === "KHACH_HANG" || user.vaiTro === "KHACH_HANG" || this.getContext() === 'CUSTOMER') {
        localStorage.setItem("shop_user", JSON.stringify(user));
      } else {
        localStorage.setItem("admin_user", JSON.stringify(user));
      }

      localStorage.setItem("currentUser", JSON.stringify(user));
    },

    request: async function (endpoint, options = {}) {
      const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
      options.headers = options.headers || {};
      options.headers['ngrok-skip-browser-warning'] = 'true';

      const token = this.getToken();
      if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
      }

      if (!(options.body instanceof FormData) && !options.headers["Content-Type"]) {
        options.headers["Content-Type"] = "application/json";
      }

      let response;
      try {
        response = await fetch(url, options);
      } catch (networkError) {
        console.warn(`[API Offline Mode] Không thể kết nối tới Backend server (${endpoint}). Tự động dùng dữ liệu mẫu cho Demo.`, networkError.message);
        return handleMockFallback(endpoint, options);
      }

      let data;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const message =
          (typeof data === "object" && (data.thongBao || data.message)) ||
          `Lỗi máy chủ (${response.status})`;
        
        if (response.status === 401) {
          console.warn("Phiên làm việc hết hạn hoặc chưa xác thực.");
        }
        throw new Error(message);
      }

      return data;
    },

    handleMockFallback: handleMockFallback,

    get: function (endpoint) {
      return this.request(endpoint, { method: "GET" });
    },

    post: function (endpoint, body) {
      return this.request(endpoint, {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
      });
    },

    put: function (endpoint, body) {
      return this.request(endpoint, {
        method: "PUT",
        body: body instanceof FormData ? body : JSON.stringify(body),
      });
    },

    patch: function (endpoint, body) {
      return this.request(endpoint, {
        method: "PATCH",
        body: body instanceof FormData ? body : JSON.stringify(body),
      });
    },

    "delete": function (endpoint) {
      return this.request(endpoint, { method: "DELETE" });
    }
  };

  // Hàm tiện ích để đổi nhanh Backend ngay trên Console F12:
  window.setBackendUrl = function (url) {
    if (!url) {
      localStorage.removeItem("BACKEND_URL");
      localStorage.removeItem("API_BASE");
      console.log("%c[API] Đã xóa URL Backend tùy chỉnh. Đang dùng mặc định: " + API.baseUrl, "color: #10b981; font-weight: bold;");
    } else {
      const clean = url.trim().replace(/\/+$/, "");
      localStorage.setItem("BACKEND_URL", clean);
      console.log("%c[API] Đã chuyển Backend URL thành: " + clean + ". Trang sẽ tải lại sau 500ms...", "color: #3b82f6; font-weight: bold;");
      setTimeout(() => window.location.reload(), 500);
    }
  };

  window.getBackendUrl = function () {
    console.log("%c[API Backend Đang Kết Nối]: " + API.baseUrl, "color: #8b5cf6; font-weight: bold; font-size: 13px;");
    return API.baseUrl;
  };

  window.API = API;
})();
