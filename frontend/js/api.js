// @ts-nocheck
(() => {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const API_BASE = isLocalhost ? "http://localhost:4000" : window.location.origin;

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
      const rawProducts = (window.Storage && window.Storage.get('products')) || [];
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
      const customers = (window.Storage && window.Storage.get('customers')) || [];
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
      let orders = (window.Storage && window.Storage.get('orders')) || [];
      
      if (cleanEndpoint.includes('/dat-hang')) {
        const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
        const newOrder = {
          id: Date.now(),
          maDonHang: `DH${Date.now().toString().slice(-6)}`,
          tenNguoiNhan: body.tenNguoiNhan || 'Khách hàng',
          soDienThoaiNhan: body.soDienThoaiNhan || '0900000000',
          diaChiGiao: body.diaChiGiao || 'Địa chỉ demo',
          tongTienHang: 150000,
          tongThanhToan: 150000,
          trangThai: 'MOI_TAO',
          phuongThucThanhToan: body.phuongThucThanhToan || 'CASH',
          taoLuc: new Date().toISOString(),
          chiTietDonHang: (body.chiTiet || []).map(ct => ({
            thuocId: ct.thuocId,
            soLuong: ct.soLuong,
            donGia: 50000,
            thuoc: { tenThuoc: `Thuốc #${ct.thuocId}` }
          }))
        };
        orders.unshift(newOrder);
        if (window.Storage) window.Storage.set('orders', orders);
        return Promise.resolve(newOrder);
      }

      if (cleanEndpoint.includes('/trang-thai') || cleanEndpoint.includes('/khach-hang-nhan-hang') || cleanEndpoint.includes('/khach-hang-huy-don') || cleanEndpoint.includes('/yeu-cau-tra-hang')) {
        const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
        const idMatch = cleanEndpoint.match(/\/api\/don-hang\/([^\/]+)\//);
        if (idMatch && window.Storage) {
          const currentOrders = window.Storage.get('orders') || [];
          const target = currentOrders.find(o => String(o.id) === idMatch[1] || String(o.dbId) === idMatch[1] || o.id === idMatch[1]);
          if (target && body.trangThai) {
            target.trangThai = body.trangThai;
            target.status = body.trangThai;
            window.Storage.set('orders', currentOrders);
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
      let invoices = (window.Storage && window.Storage.get('invoices')) || [];
      if (options.method === 'POST') {
        const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
        const calcTotal = (body.chiTiet || []).reduce((sum, item) => sum + (item.soLuong || 1) * 65000, 0) || 130000;
        const newInvoice = {
          id: Date.now(),
          maHoaDon: `HD${Date.now().toString().slice(-6)}`,
          tongTien: calcTotal,
          phuongThucThanhToan: body.phuongThucThanhToan || 'TIEN_MAT',
          taoLuc: new Date().toISOString(),
          khachHang: { hoTen: body.khachHangId ? 'Khách hàng thân thiết' : 'Khách lẻ' },
          chiTietHoaDon: (body.chiTiet || []).map(ct => ({
            soLuong: ct.soLuong || 1,
            donGia: 65000,
            thanhTien: (ct.soLuong || 1) * 65000,
            thuoc: { tenThuoc: `Thuốc #${ct.thuocId}` }
          }))
        };
        invoices.unshift(newInvoice);
        if (window.Storage) window.Storage.set('invoices', invoices);
        return Promise.resolve(newInvoice);
      }

      if (invoices.length === 0) {
        invoices = [
          { id: 101, maHoaDon: 'HD100101', tongTien: 350000, phuongThucThanhToan: 'TIEN_MAT', taoLuc: new Date(Date.now() - 3600000).toISOString(), chiTietHoaDon: [{ soLuong: 2, donGia: 175000, thanhTien: 350000, thuoc: { tenThuoc: 'Panadol Extra' } }] },
          { id: 102, maHoaDon: 'HD100102', tongTien: 450000, phuongThucThanhToan: 'CHUYEN_KHOAN', taoLuc: new Date(Date.now() - 7200000).toISOString(), chiTietHoaDon: [{ soLuong: 1, donGia: 450000, thanhTien: 450000, thuoc: { tenThuoc: 'Glucosamine 1500mg' } }] },
          { id: 103, maHoaDon: 'HD100103', tongTien: 950000, phuongThucThanhToan: 'TIEN_MAT', taoLuc: new Date(Date.now() - 86400000).toISOString(), chiTietHoaDon: [{ soLuong: 1, donGia: 950000, thanhTien: 950000, thuoc: { tenThuoc: 'Máy đo huyết áp Omron' } }] }
        ];
        if (window.Storage) window.Storage.set('invoices', invoices);
      }

      return Promise.resolve(invoices);
    }

    // 7. Danh sách Khách hàng
    if (cleanEndpoint.includes('/api/khach-hang')) {
      const customers = (window.Storage && window.Storage.get('customers')) || [];
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
      const users = (window.Storage && window.Storage.get('users')) || [];
      return Promise.resolve(users.map(u => ({
        id: u.id,
        hoTen: u.name,
        email: u.email,
        vaiTro: u.role === 'ADMIN' ? 'QUAN_LY' : 'NHAN_VIEN'
      })));
    }

    // 9. Nhà cung cấp
    if (cleanEndpoint.includes('/api/nha-cung-cap')) {
      const suppliers = (window.Storage && window.Storage.get('suppliers')) || [];
      return Promise.resolve(suppliers);
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
      const ctx = this.getContext();
      if (ctx === 'ADMIN') {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
      } else {
        localStorage.removeItem("shop_token");
        localStorage.removeItem("shop_user");
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user_token");
      localStorage.removeItem("currentUser");
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

      const token = this.getToken();
      if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
      }

      if (!(options.body instanceof FormData) && !options.headers["Content-Type"]) {
        options.headers["Content-Type"] = "application/json";
      }

      try {
        const response = await fetch(url, options);
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
            `Lỗi kết nối máy chủ (${response.status})`;
          
          if (response.status === 401) {
            console.warn("Phiên làm việc hết hạn hoặc chưa xác thực.");
          }
          throw new Error(message);
        }

        return data;
      } catch (error) {
        console.warn(`[API Offline Mode] Không thể kết nối tới Backend server (${endpoint}). Tự động dùng dữ liệu mẫu cho Demo.`, error.message);
        return handleMockFallback(endpoint, options);
      }
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

  window.API = API;
})();
