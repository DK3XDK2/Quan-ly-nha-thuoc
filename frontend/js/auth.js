/**
 * Module xử lý xác thực người dùng kết nối Backend API
 */
const Auth = {
    // Đăng nhập cho Nhân viên / Quản lý
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
                    role: res.nguoiDung.vaiTro, // 'QUAN_LY' hoặc 'NHAN_VIEN'
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

    // Đăng nhập cho Khách hàng (Shop Online)
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

    // Đăng ký cho Khách hàng
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
        API.clearAuth();
        Storage.remove('shop_user');
        localStorage.removeItem('shop_user');
        localStorage.removeItem('shop_token');
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

        // Chặn khách hàng vào trang admin
        if (user.role === 'KHACH_HANG' && path.includes('/admin/')) {
            // Chuyển hướng về trang chủ cửa hàng
            window.location.href = '../public/shop.html';
            return null;
        }

        return user;
    },

    hasPermission: function(module) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        const role = user.role;
        
        if (role === 'QUAN_LY' || role === 'ADMIN') return true;
        if (role === 'NHAN_VIEN' || role === 'PHARMACIST') {
            return module !== 'employees';
        }
        if (role === 'KHACH_HANG') {
            return ['shop', 'checkout', 'my-orders', 'profile'].includes(module);
        }
        return false;
    }
};
