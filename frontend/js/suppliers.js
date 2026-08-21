/**
 * Module Quản lý Nhà Cung Cấp - Kết nối Backend API
 */
const SupplierManager = {
    suppliers: [],
    currentPage: 1,
    itemsPerPage: 10,
    filteredSuppliers: [],

    mapSupplier: function(s) {
        return {
            dbId: s.id,
            id: s.maNhaCungCap || `NCC${s.id.toString().padStart(3, '0')}`,
            name: s.tenNhaCungCap,
            phone: s.soDienThoai,
            email: s.email || '',
            address: s.diaChi || '',
            raw: s
        };
    },

    init: async function() {
        await this.loadSuppliers();
    },

    loadSuppliers: async function() {
        try {
            App.showLoading();
            const list = await API.get('/api/nha-cung-cap');
            this.suppliers = (list || []).map(s => this.mapSupplier(s));
            this.filteredSuppliers = [...this.suppliers];
            this.renderList();
        } catch (e) {
            App.showToast('Lỗi khi tải danh sách nhà cung cấp!', 'error');
        } finally {
            App.hideLoading();
        }
    },

    renderList: function() {
        const tbody = document.getElementById('supplier-list');
        if (!tbody) return;

        const totalItems = this.filteredSuppliers.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const paginatedItems = this.filteredSuppliers.slice(startIdx, endIdx);

        let paginationWrapper = document.getElementById('supplier-pagination');
        if (!paginationWrapper) {
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
                paginationWrapper = document.createElement('div');
                paginationWrapper.id = 'supplier-pagination';
                paginationWrapper.style.cssText = 'padding: var(--spacing-md); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;';
                paginationWrapper.innerHTML = `
                    <span class="text-muted" style="font-size: 0.875rem;" id="s-pagination-info">Hiển thị 0 NCC</span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" id="s-btn-prev"><i class="fa-solid fa-chevron-left"></i></button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" id="s-btn-next"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                `;
                tableContainer.parentNode.insertBefore(paginationWrapper, tableContainer.nextSibling);
                
                document.getElementById('s-btn-prev').addEventListener('click', () => { if (this.currentPage > 1) { this.currentPage--; this.renderList(); } });
                document.getElementById('s-btn-next').addEventListener('click', () => { if (this.currentPage < totalPages) { this.currentPage++; this.renderList(); } });
            }
        }

        const pagInfo = document.getElementById('s-pagination-info');
        if (pagInfo) {
            pagInfo.innerText = `Hiển thị ${paginatedItems.length > 0 ? startIdx + 1 : 0}-${Math.min(endIdx, totalItems)} / ${totalItems} NCC`;
            document.getElementById('s-btn-prev').disabled = this.currentPage === 1;
            document.getElementById('s-btn-next').disabled = this.currentPage === totalPages;
        }

        if (paginatedItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">Không có nhà cung cấp</td></tr>`;
            return;
        }

        let html = '';
        paginatedItems.forEach(s => {
            html += `
                <tr>
                    <td style="font-weight: 500;">${s.id}</td>
                    <td style="font-weight: 600;">${s.name}</td>
                    <td>${s.phone}</td>
                    <td>${s.address || '-'}</td>
                    <td style="text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" onclick="SupplierManager.editSupplier(${s.dbId})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; color: var(--danger-color);" onclick="SupplierManager.deleteSupplier(${s.dbId})"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    openModal: function() {
        const form = document.getElementById('supplier-form');
        if (form) form.reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('modal-title').innerText = 'Thêm Nhà Cung Cấp';
        document.getElementById('supplier-modal').classList.add('active');
    },

    closeModal: function() {
        document.getElementById('supplier-modal').classList.remove('active');
    },

    editSupplier: function(dbId) {
        const s = this.suppliers.find(x => x.dbId === dbId);
        if (!s) return;

        document.getElementById('edit-id').value = s.dbId;
        document.getElementById('s-name').value = s.name;
        document.getElementById('s-phone').value = s.phone;
        document.getElementById('s-address').value = s.address || '';
        document.getElementById('modal-title').innerText = 'Sửa Nhà Cung Cấp';
        document.getElementById('supplier-modal').classList.add('active');
    },

    saveSupplier: async function() {
        const tenNhaCungCap = document.getElementById('s-name').value.trim();
        const soDienThoai = document.getElementById('s-phone').value.trim();
        const diaChi = document.getElementById('s-address').value.trim();
        const editId = document.getElementById('edit-id').value;

        if (!tenNhaCungCap) return App.showToast('Tên nhà cung cấp không được bỏ trống!', 'error');
        if (!soDienThoai.match(/^[0-9]{8,15}$/)) return App.showToast('Số điện thoại không hợp lệ!', 'error');

        try {
            App.showLoading();
            if (editId) {
                await API.patch(`/api/nha-cung-cap/${editId}`, { tenNhaCungCap, soDienThoai, diaChi });
                App.showToast('Cập nhật nhà cung cấp thành công!', 'success');
            } else {
                const maNhaCungCap = 'NCC' + Date.now().toString().slice(-4);
                await API.post('/api/nha-cung-cap', { maNhaCungCap, tenNhaCungCap, soDienThoai, diaChi });
                App.showToast('Thêm nhà cung cấp thành công!', 'success');
            }
            this.closeModal();
            await this.loadSuppliers();
        } catch (e) {
            App.showToast(e.message || 'Thao tác thất bại!', 'error');
        } finally {
            App.hideLoading();
        }
    },

    deleteSupplier: async function(dbId) {
        App.showConfirm('Bạn có chắc muốn xóa nhà cung cấp này không?', async () => {
            try {
                App.showLoading();
                await API.delete(`/api/nha-cung-cap/${dbId}`);
                App.showToast('Đã xóa nhà cung cấp!', 'success');
                await this.loadSuppliers();
            } catch (e) {
                App.showToast(e.message || 'Lỗi khi xóa nhà cung cấp', 'error');
            } finally {
                App.hideLoading();
            }
        });
    }
};
