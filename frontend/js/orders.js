
const OrderManager = {
    orders: [],
    currentPage: 1,
    itemsPerPage: 10,
    filteredOrders: [],

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

    init: async function() {
        await this.loadOrders();
        this.bindEvents();
    },

    loadOrders: async function() {
        try {
            App.showLoading();
            const list = await API.get('/api/don-hang/quan-ly');
            this.orders = (list || []).map(o => this.mapOrder(o));
            this.filteredOrders = [...this.orders];
            this.renderList();
        } catch (e) {
            App.showToast('Lỗi khi tải danh sách đơn hàng từ máy chủ', 'error');
        } finally {
            App.hideLoading();
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
    },

    renderList: function() {
        const tbody = document.getElementById('order-list');
        if (!tbody) return;

        const searchInput = document.getElementById('search-order');
        const statusSelect = document.getElementById('filter-status');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
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

        let paginationWrapper = document.getElementById('order-pagination');
        if (!paginationWrapper) {
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
                paginationWrapper = document.createElement('div');
                paginationWrapper.id = 'order-pagination';
                paginationWrapper.style.cssText = 'padding: var(--spacing-md); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;';
                paginationWrapper.innerHTML = `
                    <span class="text-muted" style="font-size: 0.875rem;" id="o-pagination-info">Hiển thị 0 đơn hàng</span>
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
            pagInfo.innerText = `Hiển thị ${paginatedItems.length > 0 ? startIdx + 1 : 0}-${Math.min(endIdx, totalItems)} / ${totalItems} đơn hàng`;
            document.getElementById('o-btn-prev').disabled = this.currentPage === 1;
            document.getElementById('o-btn-next').disabled = this.currentPage === totalPages;
        }

        if (paginatedItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Chưa có đơn hàng nào</td></tr>`;
            return;
        }

        let html = '';
        paginatedItems.forEach(o => {
            const date = new Date(o.timestamp).toLocaleString('vi-VN');

            html += `
                <tr class="order-row" onclick="OrderManager.viewOrder(${o.dbId})">
                    <td style="font-weight: 600; color: var(--primary-color);">${o.id}</td>
                    <td>${date}</td>
                    <td>${o.customerName}</td>
                    <td>Online</td>
                    <td><span class="badge ${o.statusClass}">${o.statusText}</span></td>
                    <td style="text-align: right; font-weight: 600;">${App.formatCurrency(o.summary.total)}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    viewOrder: function(dbId) {
        const order = this.orders.find(o => o.dbId === dbId);
        if (!order) return;

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
                    TỔNG TỔNG THANH TOÁN: ${order.summary.total.toLocaleString('vi-VN')} ₫
                </div>
            </div>
        `;

        document.getElementById('order-details-content').innerHTML = html;
        this.renderOrderActions(order);
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
