
const Checkout = {
    cartItems: [],
    total: 0,
    isBuyNow: false,

    init: function() {
        const urlParams = new URLSearchParams(window.location.search);
        this.isBuyNow = urlParams.get('mode') === 'buynow';

        if (this.isBuyNow) {
            this.cartItems = Storage.get('buy_now_item') || [];
        } else {
            this.cartItems = Storage.get('shop_cart') || [];
        }

        if (this.cartItems.length === 0) {
            alert('Không có sản phẩm để thanh toán! Đang quay lại trang chủ.');
            window.location.href = 'index.html';
            return;
        }

        const user = Auth.getCurrentUser();
        if (user) {
            const nameEl = document.getElementById('co-name');
            const phoneEl = document.getElementById('co-phone');
            const addrEl = document.getElementById('co-address');

            if (nameEl && !nameEl.value) nameEl.value = user.name || '';
            if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || '';
            if (addrEl && !addrEl.value) addrEl.value = user.address || '';
        }

        this.bindEvents();
        this.renderOrderSummary();
    },

    bindEvents: function() {
        const phoneInput = document.getElementById('co-phone');
        const nameInput = document.getElementById('co-name');
        const addressInput = document.getElementById('co-address');

        if (phoneInput) {
            phoneInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
                const err = document.getElementById('err-phone');
                if (this.value.length > 0 && !this.value.match(/^[0-9]{10,11}$/)) {
                    this.style.borderColor = '#ef4444';
                    if (err) { err.innerText = 'Số điện thoại phải từ 10 đến 11 chữ số'; err.style.display = 'block'; }
                } else {
                    this.style.borderColor = 'var(--shop-border)';
                    if (err) err.style.display = 'none';
                }
            });
        }

        if (nameInput) {
            nameInput.addEventListener('input', function() {
                const err = document.getElementById('err-name');
                if (this.value.trim().length > 0 && this.value.trim().length < 2) {
                    this.style.borderColor = '#ef4444';
                    if (err) { err.innerText = 'Họ và tên phải ít nhất 2 ký tự'; err.style.display = 'block'; }
                } else {
                    this.style.borderColor = 'var(--shop-border)';
                    if (err) err.style.display = 'none';
                }
            });
        }

        if (addressInput) {
            addressInput.addEventListener('input', function() {
                const err = document.getElementById('err-address');
                if (this.value.trim().length > 0 && this.value.trim().length < 5) {
                    this.style.borderColor = '#ef4444';
                    if (err) { err.innerText = 'Địa chỉ giao hàng quá ngắn (tối thiểu 5 ký tự)'; err.style.display = 'block'; }
                } else {
                    this.style.borderColor = 'var(--shop-border)';
                    if (err) err.style.display = 'none';
                }
            });
        }
    },

    renderOrderSummary: function() {
        const container = document.getElementById('co-items');
        if (!container) return;

        let html = '';
        this.total = 0;

        this.cartItems.forEach(item => {
            const itemTotal = item.price * item.quantity;
            this.total += itemTotal;
            html += `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.875rem;">
                    <div style="flex:1; padding-right:10px;">${item.name} <strong style="color:var(--shop-primary);">x${item.quantity}</strong></div>
                    <div style="font-weight:600;">${App.formatCurrency(itemTotal)}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        const subtotalEl = document.getElementById('co-subtotal');
        if (subtotalEl) subtotalEl.innerText = App.formatCurrency(this.total);
        const totalEl = document.getElementById('co-total');
        if (totalEl) totalEl.innerText = App.formatCurrency(this.total);
    },

    placeOrder: async function() {
        const name = document.getElementById('co-name').value.trim();
        const phone = document.getElementById('co-phone').value.trim();
        const address = document.getElementById('co-address').value.trim();
        const note = (document.getElementById('co-note')?.value || '').trim();
        const paymentElem = document.querySelector('input[name="payment"]:checked');
        const payment = paymentElem ? paymentElem.value : 'CASH';

        ['name', 'phone', 'address'].forEach(id => {
            const el = document.getElementById(`co-${id}`);
            const err = document.getElementById(`err-${id}`);
            if (el) el.style.borderColor = 'var(--shop-border)';
            if (err) err.style.display = 'none';
        });

        if (!name || name.length < 2) {
            document.getElementById('co-name').style.borderColor = '#ef4444';
            const err = document.getElementById('err-name');
            if (err) { err.innerText = 'Vui lòng nhập họ và tên hợp lệ (tối thiểu 2 ký tự)'; err.style.display = 'block'; }
            document.getElementById('co-name').focus();
            return;
        }

        if (!phone || !phone.match(/^[0-9]{10,11}$/)) {
            document.getElementById('co-phone').style.borderColor = '#ef4444';
            const err = document.getElementById('err-phone');
            if (err) { err.innerText = 'Số điện thoại không hợp lệ (phải gồm 10 đến 11 chữ số)'; err.style.display = 'block'; }
            document.getElementById('co-phone').focus();
            return;
        }

        if (!address || address.length < 5) {
            document.getElementById('co-address').style.borderColor = '#ef4444';
            const err = document.getElementById('err-address');
            if (err) { err.innerText = 'Vui lòng nhập địa chỉ giao hàng cụ thể hơn (tối thiểu 5 ký tự)'; err.style.display = 'block'; }
            document.getElementById('co-address').focus();
            return;
        }

        try {
            App.showLoading();

            const user = Auth.getCurrentUser();
            const payload = {
                tenNguoiNhan: name,
                soDienThoaiNhan: phone,
                emailNguoiNhan: user?.email || `${phone}@domain.com`,
                diaChiGiao: address,
                ghiChu: note,
                phiGiaoHang: 0,
                phuongThucThanhToan: payment === 'SEPAY' || payment === 'BANK' ? 'SEPAY' : 'CASH',
                chiTiet: this.cartItems.map(item => ({
                    thuocId: Number(item.dbId || item.id),
                    soLuong: Number(item.quantity)
                }))
            };

            const endpoint = '/api/don-hang/dat-hang';

            const res = await API.post(endpoint, payload);

            if (this.isBuyNow) {
                Storage.set('buy_now_item', []);
            } else {
                Storage.set('shop_cart', []);
            }

            const createdOrder = res.duLieu || res;
            const orderCode = createdOrder.maDonHang || `DH${createdOrder.id || Date.now()}`;

            App.showToast('Đặt hàng thành công!', 'success');
            window.location.href = `order-success.html?id=${orderCode}`;
        } catch (error) {
            App.showToast(error.message || 'Đặt hàng thất bại!', 'error');
        } finally {
            App.hideLoading();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Checkout.init();
});
