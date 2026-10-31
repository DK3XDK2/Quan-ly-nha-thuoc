
const Auth = {

    login: async function(email, password) {
        try {
            App.showLoading();
            const res = await API.post('/api/xac-thuc/dang-nhap', { email, matKhau: password });
            
            if (res.token && res.nguoiDung) {
                API.setToken(res.token);
                const userSession = {
                    id: res.nguoiDung.id,
                    name: res.nguoiDung.hoTen,
                    email: res.nguoiDung.email,
                    role: res.nguoiDung.vaiTro,
                    avatarUrl: res.nguoiDung.avatarUrl
                };
                API.setCurrentUser(userSession);
                App.hideLoading();
                App.showToast('Đăng nhập thành công!', 'success');
                return true;
            }
        } catch (error) {
            App.hideLoading();
            App.showToast(error.message || 'Đăng nhập thất bại!', 'error');
            return false;
        }
    },

    loginCustomer: async function(email, password) {
        try {
            App.showLoading();
            const res = await API.post('/api/khach-hang/dang-nhap', { email, matKhau: password });
            
            if (res.token && res.khachHang) {
                API.setToken(res.token);
                const userSession = {
                    id: res.khachHang.id,
                    name: res.khachHang.hoTen,
                    email: res.khachHang.email,
                    phone: res.khachHang.soDienThoai,
                    address: res.khachHang.diaChi,
                    role: 'KHACH_HANG',
                    loaiTaiKhoan: 'KHACH_HANG',
                    isLoggedIn: true
                };
                API.setCurrentUser(userSession);
                Storage.set('shop_user', userSession);
                App.hideLoading();
                App.showToast('Đăng nhập thành công!', 'success');
                return true;
            }
        } catch (error) {
            App.hideLoading();
            App.showToast(error.message || 'Email hoặc mật khẩu không chính xác!', 'error');
            return false;
        }
    },

    registerCustomer: async function(data) {
        try {
            App.showLoading();
            const res = await API.post('/api/khach-hang/dang-ky', {
                hoTen: data.name,
                email: data.email,
                soDienThoai: data.phone,
                diaChi: data.address || '',
                matKhau: data.password
            });
            App.hideLoading();
            App.showToast(res.thongBao || 'Đăng ký thành công!', 'success');
            return true;
        } catch (error) {
            App.hideLoading();
            App.showToast(error.message || 'Đăng ký thất bại!', 'error');
            return false;
        }
    },

    logout: function() {
        try {
            const token = (window.API && API.getToken && API.getToken()) || localStorage.getItem('shop_token') || localStorage.getItem('token');
            const backendUrl = (window.__ENV__ && window.__ENV__.BACKEND_URL) || (window.API && API.baseUrl) || 'http://localhost:4000';
            if (token && typeof navigator !== 'undefined' && navigator.sendBeacon) {
                navigator.sendBeacon(`${backendUrl}/api/tu-van/khach-hang-ket-thuc?token=${token}`, JSON.stringify({ lyDo: "Khách hàng đã đăng xuất khỏi hệ thống" }));
            }
        } catch (e) {}

        API.clearAuth();
        try {
            if (window.Storage && typeof Storage.clear === 'function') {
                Storage.clear();
            }
        } catch (e) {}
        try {
            sessionStorage.clear();
        } catch (e) {}

        // Dọn sạch các biến lưu tạm trong bộ nhớ RAM
        window.allBatches = null;
        window.allProducts = null;
        window.currentCart = null;
        window.currentCustomer = null;

        const path = window.location.pathname;
        if (path.includes('/customer/')) {
            window.location.href = '../public/shop-login.html';
        } else if (path.includes('/public/')) {
            window.location.href = 'shop-login.html';
        } else {
            window.location.href = 'login.html';
        }
    },

    getCurrentUser: function() {
        return API.getCurrentUser();
    },

    requireAuth: function() {
        const user = this.getCurrentUser();
        const path = window.location.pathname;

        if (!user) {
            if (path.includes('/customer/')) {
                window.location.href = '../public/shop-login.html';
            } else if (path.includes('/public/')) {
                window.location.href = 'shop-login.html';
            } else {
                window.location.href = 'login.html';
            }
            return null;
        }

        if (user.role === 'KHACH_HANG' && path.includes('/admin/')) {

            window.location.href = '../public/index.html';
            return null;
        }

        return user;
    },

    hasPermission: function(module) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        const role = user.role || user.vaiTro;
        
        if (role === 'QUAN_LY' || role === 'ADMIN') return true;
        if (role === 'NHAN_VIEN' || role === 'PHARMACIST') {
            // Nhân viên KHÔNG ĐƯỢC PHÉP xem & thao tác: Nhà cung cấp, Báo cáo kinh doanh, Quản lý nhân viên, Giám sát API
            const forbiddenModules = ['employees', 'suppliers', 'reports', 'api-monitor'];
            return !forbiddenModules.includes(module);
        }
        if (role === 'KHACH_HANG') {
            return ['shop', 'checkout', 'my-orders', 'profile'].includes(module);
        }
        return false;
    }
};
