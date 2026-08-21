/**
 * API Client Module - Quản lý gọi REST API kết nối Backend
 */
(() => {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const API_BASE = isLocalhost ? "http://localhost:4000" : window.location.origin;

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
      // Dành cho tính tương thích ngược với code cũ
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
      // Xóa luôn các key cũ để sạch rác
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
        
        // Nếu không có, thử tìm ở currentUser nhưng phải đúng role
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
      // Tương thích code cũ
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
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
      }
    },

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

    delete: function (endpoint) {
      return this.request(endpoint, { method: "DELETE" });
    },
  };

  window.API = API;
})();
