
const POS = {
    cart: [],
    products: [],
    customers: [],
    currentCustomer: 'GUEST',

    init: async function() {
        await this.loadData();
        this.renderProducts();
        this.renderCustomers();
        this.bindEvents();
    },

    loadData: async function() {
        try {
            App.showLoading();
            const [listThuoc, listKhach] = await Promise.all([
                API.get('/api/thuoc'),
                API.get('/api/khach-hang/quan-ly').catch(() => [])
            ]);

            this.products = (listThuoc || []).map(item => ({
                id: item.maThuoc || item.id,
                dbId: item.id,
                name: item.tenThuoc,
                category: item.danhMucThuoc?.tenDanhMuc || item.danhMuc || 'Khác',
                price: Number(item.giaBan),
                stock: item.loTonKho ? item.loTonKho.reduce((sum, lo) => sum + lo.soLuongTon, 0) : (item.tonKho || 0),
                unit: item.donViTinh || 'Viên',
                imageUrl: item.hinhAnh
            }));
            this.customers = listKhach || [];
        } catch (e) {
            App.showToast('Lỗi khi tải dữ liệu POS từ máy chủ', 'error');
        } finally {
            App.hideLoading();
        }
    },

    bindEvents: function() {
        const searchInput = document.getElementById('pos-search');
        const categorySelect = document.getElementById('pos-category');

        if (searchInput && categorySelect) {
            searchInput.addEventListener('input', (e) => this.renderProducts(e.target.value, categorySelect.value));
            categorySelect.addEventListener('change', (e) => this.renderProducts(searchInput.value, e.target.value));
        }

        const btnCheckout = document.getElementById('btn-checkout');
        if (btnCheckout) {
            btnCheckout.addEventListener('click', () => this.checkout());
        }

        const custSelect = document.getElementById('customer-select');
        if (custSelect) {
            custSelect.addEventListener('change', (e) => {
                this.currentCustomer = e.target.value;
                this.updateCartSummary();
            });
        }
    },

    renderProducts: function(searchTerm = '', category = '') {
        const grid = document.getElementById('product-grid');
        if (!grid) return;

        let filtered = this.products.filter(p => p.status === 'ACTIVE');

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) || 
                p.id.toLowerCase().includes(term) ||
                (p.activeIngredient && p.activeIngredient.toLowerCase().includes(term))
            );
        }

        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--text-muted);">Không tìm thấy sản phẩm</div>`;
            return;
        }

        let html = '';
        filtered.forEach(p => {
            const isOutOfStock = p.stock <= 0;
            const stockClass = isOutOfStock ? 'badge-danger' : (p.stock <= p.minStock ? 'badge-warning' : 'badge-success');
            const stockText = isOutOfStock ? 'Hết hàng' : `Tồn: ${p.stock}`;

            html += `
                <div class="pos-card ${isOutOfStock ? 'out-of-stock' : ''}" onclick="POS.addToCart('${p.id}')">
                    <div class="pos-card-header">
                        <div class="pos-card-title" title="${p.name}">${p.name}</div>
                        <span class="badge ${stockClass} pos-card-stock">${stockText}</span>
                    </div>
                    <div class="pos-card-footer">
                        <div class="pos-card-category" title="${p.category}">${p.category}</div>
                        <div class="pos-card-price">${App.formatCurrency(p.price)}</div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    },

    renderCustomers: function() {
        const select = document.getElementById('customer-select');
        if (!select) return;

        let html = '<option value="GUEST">Khách lẻ</option>';
        this.customers.forEach(c => {
            html += `<option value="${c.id}">${c.hoTen} - ${c.soDienThoai}</option>`;
        });
        select.innerHTML = html;
    },

    addToCart: function(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || product.stock <= 0) return;

        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                App.showToast(`Chỉ còn ${product.stock} sản phẩm trong kho!`, 'warning');
                return;
            }
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                dbId: product.dbId,
                id: product.id,
                name: product.name,
                unit: product.unit,
                price: product.price,
                quantity: 1,
                maxStock: product.stock
            });
        }

        this.renderCart();
    },

    updateQuantity: function(productId, change) {
        const item = this.cart.find(i => i.id === productId);
        if (!item) return;

        const newQty = item.quantity + change;
        
        if (newQty <= 0) {
            this.removeFromCart(productId);
            return;
        }

        if (newQty > item.maxStock) {
            App.showToast(`Kho chỉ còn ${item.maxStock} sản phẩm!`, 'warning');
            return;
        }

        item.quantity = newQty;
        this.renderCart();
    },

    setQuantity: function(productId, value) {
        const qty = parseInt(value);
        if (isNaN(qty) || qty <= 0) {
            this.renderCart();
            return;
        }

        const item = this.cart.find(i => i.id === productId);
        if (!item) return;

        if (qty > item.maxStock) {
            App.showToast(`Kho chỉ còn ${item.maxStock} sản phẩm!`, 'warning');
            item.quantity = item.maxStock;
        } else {
            item.quantity = qty;
        }

        this.renderCart();
    },

    removeFromCart: function(productId) {
        this.cart = this.cart.filter(i => i.id !== productId);
        this.renderCart();
    },

    clearCart: function() {
        this.cart = [];
        this.currentCustomer = 'GUEST';
        const select = document.getElementById('customer-select');
        if (select) select.value = 'GUEST';
        this.renderCart();
    },

    renderCart: function() {
        const container = document.getElementById('cart-items');
        if (!container) return;
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <i class="fa-solid fa-basket-shopping"></i>
                    <p>Chưa có sản phẩm nào trong giỏ hàng</p>
                </div>
            `;
            const btn = document.getElementById('btn-checkout');
            if (btn) btn.disabled = true;
            this.updateCartSummary();
            return;
        }

        let html = '';
        this.cart.forEach(item => {
            html += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${App.formatCurrency(item.price)}</div>
                        <div class="cart-item-controls">
                            <button class="qty-btn" onclick="POS.updateQuantity('${item.id}', -1)"><i class="fa-solid fa-minus"></i></button>
                            <input type="number" class="qty-input" value="${item.quantity}" onchange="POS.setQuantity('${item.id}', this.value)" min="1">
                            <button class="qty-btn" onclick="POS.updateQuantity('${item.id}', 1)"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between;">
                        <button class="remove-btn btn" onclick="POS.removeFromCart('${item.id}')"><i class="fa-solid fa-trash-can"></i></button>
                        <div class="cart-item-total">${App.formatCurrency(item.price * item.quantity)}</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        const btn = document.getElementById('btn-checkout');
        if (btn) btn.disabled = false;
        container.scrollTop = container.scrollHeight;
        
        this.updateCartSummary();
    },

    updateCartSummary: function() {
        let subtotal = 0;
        let totalItems = 0;

        this.cart.forEach(item => {
            subtotal += item.price * item.quantity;
            totalItems += item.quantity;
        });

        const total = subtotal;

        const countEl = document.getElementById('cart-count');
        if (countEl) countEl.innerText = totalItems;
        
        const subtotalEl = document.getElementById('cart-subtotal');
        if (subtotalEl) subtotalEl.innerText = App.formatCurrency(subtotal);
        
        const totalEl = document.getElementById('cart-total');
        if (totalEl) totalEl.innerText = App.formatCurrency(total);
        
        this.currentSummary = { subtotal, tax: 0, discount: 0, total };
    },

    checkout: function() {
        if (this.cart.length === 0) return;
        
        document.getElementById('payment-total-amount').innerText = App.formatCurrency(this.currentSummary.total);
        document.getElementById('payment-method').value = 'CASH';
        document.getElementById('amount-given').value = '';
        document.getElementById('amount-change').innerText = '0 ₫';
        this.handlePaymentMethodChange();

        document.getElementById('payment-modal').classList.add('active');
    },

    handlePaymentMethodChange: function() {
        const method = document.getElementById('payment-method').value;
        const cashDetails = document.getElementById('cash-payment-details');
        if (cashDetails) {
            cashDetails.style.display = method === 'CASH' ? 'block' : 'none';
            if (method === 'CASH') this.calculateChange();
        }
    },

    calculateChange: function() {
        const inputEl = document.getElementById('amount-given');
        if (!inputEl) return;
        const givenInput = inputEl.value.replace(/[^0-9]/g, '');
        const given = parseInt(givenInput) || 0;
        
        inputEl.value = givenInput ? given.toLocaleString('vi-VN') : '';

        const total = this.currentSummary ? this.currentSummary.total : 0;
        let change = given - total;
        if (change < 0) change = 0;

        const changeEl = document.getElementById('amount-change');
        if (changeEl) changeEl.innerText = App.formatCurrency(change);
    },

    processCheckout: async function() {
        if (this.cart.length === 0) return;
        
        const paymentMethodVal = document.getElementById('payment-method').value;
        const phuongThucThanhToan = paymentMethodVal === 'BANK' ? 'CHUYEN_KHOAN' : 'TIEN_MAT';

        document.getElementById('payment-modal').classList.remove('active');

        try {
            App.showLoading();
            
            const payload = {
                phuongThucThanhToan,
                khachHangId: (this.currentCustomer && this.currentCustomer !== 'GUEST') ? parseInt(this.currentCustomer) : null,
                chiTiet: this.cart.map(item => ({
                    thuocId: item.dbId,
                    soLuong: item.quantity,
                    donViTinh: item.unit || 'Hộp'
                }))
            };

            const createdInvoice = await API.post('/api/hoa-don', payload);
            
            App.showToast('Thanh toán thành công! Hóa đơn #' + createdInvoice.id, 'success');

            await this.loadData();
            this.renderProducts();

            this.showInvoice(createdInvoice);
            this.clearCart();
        } catch (error) {
            App.showToast(error.message || 'Lỗi khi xử lý thanh toán!', 'error');
        } finally {
            App.hideLoading();
        }
    },

    showInvoice: function(hoaDon) {
        let customerName = 'Khách lẻ';
        if (hoaDon.khachHang) {
            customerName = hoaDon.khachHang.hoTen;
        }

        let itemsHtml = '';
        (hoaDon.chiTietHoaDon || []).forEach(item => {
            const tenThuoc = item.thuoc ? item.thuoc.tenThuoc : 'Sản phẩm';
            itemsHtml += `
                <tr>
                    <td>${tenThuoc}<br><small>${item.soLuong} x ${parseFloat(item.donGia).toLocaleString('vi-VN')}</small></td>
                    <td style="text-align: right;">${parseFloat(item.thanhTien).toLocaleString('vi-VN')}</td>
                </tr>
            `;
        });

        const currentUser = Auth.getCurrentUser();

        const invoiceHtml = `
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                <h2>NHÀ THUỐC PHARMACY</h2>
                <p>Địa chỉ cửa hàng<br>ĐT: 0900.000.000</p>
            </div>
            <h3 style="margin: 1rem 0;">HÓA ĐƠN BÁN HÀNG</h3>
            <div style="text-align: left; margin-bottom: 1rem; font-size: 0.875rem;">
                <div>Mã HĐ: HD${hoaDon.id}</div>
                <div>Ngày: ${new Date(hoaDon.taoLuc || Date.now()).toLocaleString('vi-VN')}</div>
                <div>Thu ngân: ${currentUser ? currentUser.name : 'Nhân viên'}</div>
                <div>Khách hàng: ${customerName}</div>
            </div>
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th style="text-align: right;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <div style="text-align: right; font-size: 0.875rem; margin-top: 1rem;">
                <div class="invoice-total">TỔNG: ${parseFloat(hoaDon.tongTien).toLocaleString('vi-VN')} ₫</div>
            </div>
            <p style="margin-top: 2rem;">Cảm ơn quý khách và hẹn gặp lại!</p>
        `;

        document.getElementById('invoice-content').innerHTML = invoiceHtml;
        document.getElementById('invoice-modal').classList.add('active');
    }
};
