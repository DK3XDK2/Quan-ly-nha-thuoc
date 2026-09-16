// @ts-nocheck

const OrderManager = {
    currentTab: 'online', // 'online' | 'pos'
    orders: [],
    invoices: [],
    currentPage: 1,
    itemsPerPage: 10,
    filteredOrders: [],
    filteredInvoices: [],

    mapOrder: function(o) {
        let statusText = 'Mới tạo';
        let statusClass = 'badge-primary';

        switch (o.trangThai) {
            case 'MOI_TAO': statusText = 'Mới tạo'; statusClass = 'badge-primary'; break;
            case 'DA_XAC_NHAN': statusText = 'Đã xác nhận'; statusClass = 'badge-info'; break;
            case 'DANG_GIAO': statusText = 'Đang giao'; statusClass = 'badge-warning'; break;
            case 'HOAN_TAT': statusText = 'Hoàn tất'; statusClass = 'badge-success'; break;
            case 'HUY': statusText = 'Đã hủy'; statusClass = 'badge-danger'; break;
            case 'YEU_CAU_HOAN_TIEN': statusText = 'Yêu cầu hoàn tiền'; statusClass = 'badge-warning'; break;
            case 'DA_HOAN_TIEN': statusText = 'Đã hoàn tiền'; statusClass = 'badge-danger'; break;
        }

        const items = (o.chiTietDonHang || []).map(ct => ({
            id: ct.thuocId,
            name: ct.thuoc ? ct.thuoc.tenThuoc : `Thuốc #${ct.thuocId}`,
            price: parseFloat(ct.donGia),
            quantity: ct.soLuong
        }));

        return {
            dbId: o.id,
            id: o.maDonHang || `DH${o.id}`,
            timestamp: o.taoLuc,
            customerName: o.tenNguoiNhan || (o.khachHang ? o.khachHang.hoTen : 'Khách hàng'),
            customerPhone: o.soDienThoaiNhan || (o.khachHang ? o.khachHang.soDienThoai : ''),
            customerAddress: o.diaChiGiao || '',
            status: o.trangThai,
            statusText,
            statusClass,
            paymentMethod: o.phuongThucThanhToan,
            items,
            summary: {
                subtotal: parseFloat(o.tongTienHang || o.tongThanhToan),
                tax: 0,
                discount: 0,
                total: parseFloat(o.tongThanhToan)
            },
            raw: o
        };
    },

    mapInvoice: function(inv) {
        const items = (inv.chiTietHoaDon || []).map(ct => ({
            id: ct.thuocId,
            name: ct.thuoc ? ct.thuoc.tenThuoc : (ct.tenThuoc || `Thuốc #${ct.thuocId}`),
            price: parseFloat(ct.donGia),
            quantity: ct.soLuong,
            thanhTien: parseFloat(ct.thanhTien || (ct.soLuong * ct.donGia))
        }));

        let paymentText = 'Tiền mặt';
        let paymentBadge = 'badge-success';
        if (inv.phuongThucThanhToan === 'CHUYEN_KHOAN' || inv.phuongThucThanhToan === 'BANK') {
            paymentText = 'Chuyển khoản';
            paymentBadge = 'badge-info';
        }

        return {
            dbId: inv.id,
            id: inv.maHoaDon || `HD${inv.id}`,
            timestamp: inv.taoLuc,
            customerName: inv.khachHang ? inv.khachHang.hoTen : 'Khách lẻ',
            customerPhone: inv.khachHang ? (inv.khachHang.soDienThoai || '') : '',
            cashierName: inv.nguoiTao ? (inv.nguoiTao.hoTen || inv.nguoiTao.tenDangNhap) : 'Admin Hệ Thống',
            paymentMethod: inv.phuongThucThanhToan,
            paymentText,
            paymentBadge,
            items,
            summary: {
                total: parseFloat(inv.tongTien)
            },
            raw: inv
        };
    },

    init: async function() {
        if (this.initialized) return;
        this.initialized = true;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tab') === 'pos' || window.location.hash === '#pos') {
            this.currentTab = 'pos';
        }

        this.bindEvents();
        await Promise.all([this.loadOrders(), this.loadInvoices()]);
        this.switchTab(this.currentTab);
    },

    switchTab: function(tab) {
        this.currentTab = tab;
        this.currentPage = 1;

        const tabOnline = document.getElementById('tab-online');
        const tabPos = document.getElementById('tab-pos');
        const filterStatus = document.getElementById('filter-status');
        const filterPayment = document.getElementById('filter-payment');
        const searchInput = document.getElementById('search-order');
        const theadRow = document.getElementById('table-header-row');

        if (tab === 'online') {
            if (tabOnline) {
                tabOnline.style.borderBottom = '3px solid var(--primary-color)';
                tabOnline.style.color = 'var(--primary-color)';
            }
            if (tabPos) {
                tabPos.style.borderBottom = '3px solid transparent';
                tabPos.style.color = 'var(--text-secondary)';
            }
            if (filterStatus) filterStatus.style.display = 'block';
            if (filterPayment) filterPayment.style.display = 'none';
            if (searchInput) searchInput.placeholder = '🔍 Tìm theo Mã đơn (DH...), Tên KH, SĐT...';

            if (theadRow) {
                theadRow.innerHTML = `
                    <th>Mã Đơn</th>
                    <th>Ngày tạo</th>
                    <th>Khách hàng</th>
                    <th>Kênh bán</th>
                    <th>Trạng thái</th>
                    <th style="text-align: right;">Tổng tiền</th>
                `;
            }
        } else {
            if (tabPos) {
                tabPos.style.borderBottom = '3px solid var(--primary-color)';
                tabPos.style.color = 'var(--primary-color)';
            }
            if (tabOnline) {
                tabOnline.style.borderBottom = '3px solid transparent';
                tabOnline.style.color = 'var(--text-secondary)';
            }
            if (filterStatus) filterStatus.style.display = 'none';
            if (filterPayment) filterPayment.style.display = 'block';
            if (searchInput) searchInput.placeholder = '🔍 Tìm theo Mã HĐ (HD...), Khách hàng, Thu ngân...';

            if (theadRow) {
                theadRow.innerHTML = `
                    <th>Mã Hóa Đơn</th>
                    <th>Ngày tạo</th>
                    <th>Khách hàng</th>
                    <th>Thu ngân</th>
                    <th>PT Thanh toán</th>
                    <th style="text-align: right;">Tổng tiền</th>
                `;
            }
        }

        try {
            history.replaceState(null, '', `?tab=${tab}`);
        } catch (e) {}

        this.renderList();
    },

    loadOrders: async function() {
        try {
            const list = await API.get('/api/don-hang/quan-ly');
            this.orders = (list || []).map(o => this.mapOrder(o));
            this.filteredOrders = [...this.orders];
            
            const badgeOnline = document.getElementById('badge-online-count');
            if (badgeOnline) badgeOnline.innerText = this.orders.length;
        } catch (e) {
            console.warn('Lỗi khi tải đơn hàng online:', e);
        }
    },

    loadInvoices: async function() {
        try {
            const list = await API.get('/api/hoa-don');
            this.invoices = (list || []).map(inv => this.mapInvoice(inv));
            this.filteredInvoices = [...this.invoices];

            const badgePos = document.getElementById('badge-pos-count');
            if (badgePos) badgePos.innerText = this.invoices.length;
        } catch (e) {
            console.warn('Lỗi khi tải hóa đơn POS:', e);
        }
    },

    bindEvents: function() {
        const searchInput = document.getElementById('search-order');
        if (searchInput) {
            searchInput.addEventListener('input', () => { this.currentPage = 1; this.renderList(); });
        }
        const statusSelect = document.getElementById('filter-status');
        if (statusSelect) {
            statusSelect.addEventListener('change', () => { this.currentPage = 1; this.renderList(); });
        }
        const paymentSelect = document.getElementById('filter-payment');
        if (paymentSelect) {
            paymentSelect.addEventListener('change', () => { this.currentPage = 1; this.renderList(); });
        }
    },

    renderList: function() {
        const tbody = document.getElementById('order-list');
        if (!tbody) return;

        const searchInput = document.getElementById('search-order');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        if (this.currentTab === 'online') {
            this.renderOnlineList(tbody, searchTerm);
        } else {
            this.renderPosList(tbody, searchTerm);
        }
    },

    renderOnlineList: function(tbody, searchTerm) {
        const statusSelect = document.getElementById('filter-status');
        const selectedStatus = statusSelect ? statusSelect.value : '';

        this.filteredOrders = this.orders;

        if (selectedStatus) {
            this.filteredOrders = this.filteredOrders.filter(o => o.status === selectedStatus || (selectedStatus === 'HUY' && o.status === 'DA_HOAN_TIEN'));
        }

        if (searchTerm) {
            this.filteredOrders = this.filteredOrders.filter(o => 
                o.id.toLowerCase().includes(searchTerm) || 
                (o.customerName && o.customerName.toLowerCase().includes(searchTerm)) ||
                (o.customerPhone && o.customerPhone.includes(searchTerm))
            );
        }

        const totalItems = this.filteredOrders.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const paginatedItems = this.filteredOrders.slice(startIdx, endIdx);

        this.updatePagination(paginatedItems.length, startIdx, endIdx, totalItems, totalPages, 'đơn hàng');

        if (paginatedItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Không tìm thấy đơn hàng online nào</td></tr>`;
            return;
        }

        let html = '';
        paginatedItems.forEach(o => {
            const date = new Date(o.timestamp).toLocaleString('vi-VN');

            html += `
                <tr class="order-row" onclick="OrderManager.viewOrder(${o.dbId})">
                    <td style="font-weight: 600; color: var(--primary-color);">${o.id}</td>
                    <td>${date}</td>
                    <td>
                        <div style="font-weight: 500;">${o.customerName}</div>
                        ${o.customerPhone ? `<small class="text-muted">${o.customerPhone}</small>` : ''}
                    </td>
                    <td><span class="badge badge-secondary"><i class="fa-solid fa-globe"></i> Website</span></td>
                    <td><span class="badge ${o.statusClass}">${o.statusText}</span></td>
                    <td style="text-align: right; font-weight: 600;">${App.formatCurrency(o.summary.total)}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    renderPosList: function(tbody, searchTerm) {
        const paymentSelect = document.getElementById('filter-payment');
        const selectedPayment = paymentSelect ? paymentSelect.value : '';

        this.filteredInvoices = this.invoices;

        if (selectedPayment) {
            this.filteredInvoices = this.filteredInvoices.filter(inv => inv.paymentMethod === selectedPayment || (selectedPayment === 'CHUYEN_KHOAN' && inv.paymentMethod === 'BANK'));
        }

        if (searchTerm) {
            this.filteredInvoices = this.filteredInvoices.filter(inv => 
                inv.id.toLowerCase().includes(searchTerm) || 
                (inv.customerName && inv.customerName.toLowerCase().includes(searchTerm)) ||
                (inv.cashierName && inv.cashierName.toLowerCase().includes(searchTerm))
            );
        }

        const totalItems = this.filteredInvoices.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const paginatedItems = this.filteredInvoices.slice(startIdx, endIdx);

        this.updatePagination(paginatedItems.length, startIdx, endIdx, totalItems, totalPages, 'hóa đơn POS');

        if (paginatedItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Chưa có hóa đơn bán tại quầy nào</td></tr>`;
            return;
        }

        let html = '';
        paginatedItems.forEach(inv => {
            const date = new Date(inv.timestamp).toLocaleString('vi-VN');

            html += `
                <tr class="order-row" onclick="OrderManager.viewInvoice(${inv.dbId})">
                    <td style="font-weight: 600; color: #16a34a;">${inv.id}</td>
                    <td>${date}</td>
                    <td>
                        <div style="font-weight: 500;">${inv.customerName}</div>
                        ${inv.customerPhone ? `<small class="text-muted">${inv.customerPhone}</small>` : ''}
                    </td>
                    <td><i class="fa-solid fa-user-tie text-muted"></i> ${inv.cashierName}</td>
                    <td><span class="badge ${inv.paymentBadge}">${inv.paymentText}</span></td>
                    <td style="text-align: right; font-weight: 600; color: #16a34a;">${App.formatCurrency(inv.summary.total)}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    updatePagination: function(itemsCount, startIdx, endIdx, totalItems, totalPages, label) {
        let paginationWrapper = document.getElementById('order-pagination');
        if (!paginationWrapper) {
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
                paginationWrapper = document.createElement('div');
                paginationWrapper.id = 'order-pagination';
                paginationWrapper.style.cssText = 'padding: var(--spacing-md); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;';
                paginationWrapper.innerHTML = `
                    <span class="text-muted" style="font-size: 0.875rem;" id="o-pagination-info">Hiển thị 0 ${label}</span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" id="o-btn-prev"><i class="fa-solid fa-chevron-left"></i></button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" id="o-btn-next"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                `;
                tableContainer.parentNode.insertBefore(paginationWrapper, tableContainer.nextSibling);
                
                document.getElementById('o-btn-prev').addEventListener('click', () => { if (this.currentPage > 1) { this.currentPage--; this.renderList(); } });
                document.getElementById('o-btn-next').addEventListener('click', () => { if (this.currentPage < totalPages) { this.currentPage++; this.renderList(); } });
            }
        }

        const pagInfo = document.getElementById('o-pagination-info');
        if (pagInfo) {
            pagInfo.innerText = `Hiển thị ${itemsCount > 0 ? startIdx + 1 : 0}-${Math.min(endIdx, totalItems)} / ${totalItems} ${label}`;
            const btnPrev = document.getElementById('o-btn-prev');
            const btnNext = document.getElementById('o-btn-next');
            if (btnPrev) btnPrev.disabled = this.currentPage === 1;
            if (btnNext) btnNext.disabled = this.currentPage >= totalPages;
        }
    },

    viewOrder: function(dbId) {
        const order = this.orders.find(o => o.dbId === dbId);
        if (!order) return;

        document.getElementById('modal-title').innerText = `Chi tiết Đơn hàng Online: ${order.id}`;

        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${item.name}<br><small>${item.quantity} x ${item.price.toLocaleString('vi-VN')} ₫</small></td>
                    <td style="text-align: right;">${(item.quantity * item.price).toLocaleString('vi-VN')} ₫</td>
                </tr>
            `;
        });

        const noteHtml = order.raw.ghiChu ? `<div style="margin-top: 4px; color: #d97706; background: #fffbe6; padding: 6px 10px; border-radius: 4px; border: 1px solid #ffe58f;"><strong>Ghi chú / Lý do:</strong> ${order.raw.ghiChu}</div>` : '';

        const html = `
            <div style="text-align: left; margin-bottom: 1rem; font-size: 0.875rem;">
                <div><strong>Mã đơn hàng:</strong> ${order.id}</div>
                <div><strong>Thời gian:</strong> ${new Date(order.timestamp).toLocaleString('vi-VN')}</div>
                <div><strong>Người nhận:</strong> ${order.customerName} (${order.customerPhone})</div>
                <div><strong>Địa chỉ giao:</strong> ${order.customerAddress}</div>
                <div><strong>Phương thức TT:</strong> ${order.paymentMethod === 'SEPAY' ? '<span style="color:#2563eb; font-weight:600;"><i class="fa-solid fa-qrcode"></i> Chuyển khoản QR (SePay)</span>' : '<span style="color:#16a34a; font-weight:600;"><i class="fa-solid fa-money-bill-1"></i> Tiền mặt (COD)</span>'}</div>
                <div><strong>Trạng thái:</strong> <span class="badge ${order.statusClass}">${order.statusText}</span></div>
                ${noteHtml}
            </div>
            
            <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;" id="order-actions-container">
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
                <div style="font-size: 1.25rem; font-weight: bold; margin-top: 0.5rem; color: var(--primary-color);">
                    TỔNG THANH TOÁN: ${order.summary.total.toLocaleString('vi-VN')} ₫
                </div>
            </div>
        `;

        document.getElementById('order-details-content').innerHTML = html;
        this.renderOrderActions(order);
        document.getElementById('order-modal').classList.add('active');
    },

    viewInvoice: function(dbId) {
        const inv = this.invoices.find(i => i.dbId === dbId);
        if (!inv) return;

        document.getElementById('modal-title').innerText = `Hóa đơn Bán lẻ: ${inv.id}`;

        let itemsHtml = '';
        inv.items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${item.name}<br><small>${item.quantity} x ${item.price.toLocaleString('vi-VN')} ₫</small></td>
                    <td style="text-align: right;">${item.thanhTien.toLocaleString('vi-VN')} ₫</td>
                </tr>
            `;
        });

        const html = `
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                <h2 style="font-size: 1.35rem; margin-bottom: 4px;">NHÀ THUỐC PHARMACY</h2>
                <p style="font-size: 0.85rem; color: #555; margin: 0;">Địa chỉ: Cửa hàng Dược phẩm AINA<br>ĐT: 0900.000.000</p>
            </div>
            <h3 style="margin: 0.75rem 0; text-align: center;">HÓA ĐƠN BÁN HÀNG TẠI QUẦY</h3>
            <div style="text-align: left; margin-bottom: 1rem; font-size: 0.875rem; line-height: 1.6;">
                <div><strong>Mã HĐ:</strong> ${inv.id}</div>
                <div><strong>Ngày:</strong> ${new Date(inv.timestamp).toLocaleString('vi-VN')}</div>
                <div><strong>Thu ngân:</strong> ${inv.cashierName}</div>
                <div><strong>Khách hàng:</strong> ${inv.customerName} ${inv.customerPhone ? `(${inv.customerPhone})` : ''}</div>
                <div><strong>Thanh toán:</strong> <span class="badge ${inv.paymentBadge}">${inv.paymentText}</span></div>
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
                <div style="font-size: 1.25rem; font-weight: bold; color: #16a34a;">
                    TỔNG CỘNG: ${inv.summary.total.toLocaleString('vi-VN')} ₫
                </div>
            </div>
            <div style="text-align: center; margin-top: 1.5rem; font-style: italic; color: #666; font-size: 0.875rem;">
                Cảm ơn quý khách và hẹn gặp lại!
            </div>
        `;

        document.getElementById('order-details-content').innerHTML = html;
        document.getElementById('order-actions-container')?.remove();
        document.getElementById('order-modal').classList.add('active');
    },

    renderOrderActions: function(order) {
        const container = document.getElementById('order-actions-container');
        if (!container) return;
        
        let actions = '';
        if (order.status === 'MOI_TAO') {
            actions += `<button class="btn btn-primary btn-sm" onclick="OrderManager.updateStatus(${order.dbId}, 'DANG_GIAO')">Xác nhận & Giao hàng</button>`;
            actions += `<button class="btn btn-outline btn-sm" style="color: var(--danger-color)" onclick="OrderManager.updateStatus(${order.dbId}, 'HUY')">Hủy đơn</button>`;
        } else if (order.status === 'DANG_GIAO' || order.status === 'DA_XAC_NHAN') {
            actions += `<button class="btn btn-primary btn-sm" onclick="OrderManager.updateStatus(${order.dbId}, 'HOAN_TAT')">Hoàn tất đơn hàng</button>`;
        } else if (order.status === 'YEU_CAU_HOAN_TIEN') {
            actions += `<button class="btn btn-success btn-sm" onclick="OrderManager.updateStatus(${order.dbId}, 'DA_HOAN_TIEN')">Đồng ý Hoàn tiền</button>`;
            actions += `<button class="btn btn-outline btn-sm" style="color: var(--danger-color)" onclick="OrderManager.updateStatus(${order.dbId}, 'HOAN_TAT')">Từ chối Yêu cầu</button>`;
        }
        
        container.innerHTML = actions;
    },

    updateStatus: async function(dbId, newStatus) {
        let msg = `Chuyển trạng thái đơn hàng?`;
        if (newStatus === 'HUY') msg = 'Bạn có chắc chắn muốn hủy đơn hàng này?';
        
        App.showConfirm(msg, async () => {
            try {
                App.showLoading();
                await API.patch(`/api/don-hang/${dbId}/trang-thai`, { trangThai: newStatus });
                App.showToast('Cập nhật trạng thái đơn hàng thành công!', 'success');
                this.closeModal();
                await this.loadOrders();
                this.renderList();
            } catch (e) {
                App.showToast(e.message || 'Cập nhật trạng thái thất bại!', 'error');
            } finally {
                App.hideLoading();
            }
        });
    },

    closeModal: function() {
        document.getElementById('order-modal').classList.remove('active');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    OrderManager.init();
});
