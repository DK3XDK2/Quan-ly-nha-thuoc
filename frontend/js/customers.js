/**
 * Module Quản lý Khách Hàng - Kết nối Backend API
 */
const CustomerManager = {
    customers: [],
    currentPage: 1,
    itemsPerPage: 10,
    filteredCustomers: [],

    mapCustomer: function(c) {
        return {
            dbId: c.id,
            id: `KH${c.id.toString().padStart(3, '0')}`,
            name: c.hoTen,
            phone: c.soDienThoai,
            email: c.email || '',
            address: c.diaChi || '',
            orderCount: c._count ? c._count.donHang : 0,
            raw: c
        };
    },

    init: async function() {
        await this.loadCustomers();
        const searchInput = document.getElementById('search-customer');
        if (searchInput) {
            searchInput.addEventListener('input', () => { this.currentPage = 1; this.renderList(); });
        }
    },

    loadCustomers: async function() {
        try {
            App.showLoading();
            const list = await API.get('/api/khach-hang/quan-ly');
            this.customers = (list || []).map(c => this.mapCustomer(c));
            this.filteredCustomers = [...this.customers];
            this.renderList();
        } catch (e) {
            App.showToast('Lỗi khi tải danh sách khách hàng từ máy chủ', 'error');
        } finally {
            App.hideLoading();
        }
    },

    renderList: function() {
        const tbody = document.getElementById('customer-list');
        if (!tbody) return;

        const searchInput = document.getElementById('search-customer');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        
        this.filteredCustomers = this.customers;
        if (searchTerm) {
            this.filteredCustomers = this.filteredCustomers.filter(c => 
                c.name.toLowerCase().includes(searchTerm) || 
                c.phone.includes(searchTerm)
            );
        }

        const totalItems = this.filteredCustomers.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const paginatedItems = this.filteredCustomers.slice(startIdx, endIdx);

        let paginationWrapper = document.getElementById('customer-pagination');
        if (!paginationWrapper) {
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
                paginationWrapper = document.createElement('div');
                paginationWrapper.id = 'customer-pagination';
                paginationWrapper.style.cssText = 'padding: var(--spacing-md); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;';
                paginationWrapper.innerHTML = `
                    <span class="text-muted" style="font-size: 0.875rem;" id="c-pagination-info">Hiển thị 0 khách hàng</span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" id="c-btn-prev"><i class="fa-solid fa-chevron-left"></i></button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" id="c-btn-next"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                `;
                tableContainer.parentNode.insertBefore(paginationWrapper, tableContainer.nextSibling);
                
                document.getElementById('c-btn-prev').addEventListener('click', () => { if (this.currentPage > 1) { this.currentPage--; this.renderList(); } });
                document.getElementById('c-btn-next').addEventListener('click', () => { if (this.currentPage < totalPages) { this.currentPage++; this.renderList(); } });
            }
        }

        const pagInfo = document.getElementById('c-pagination-info');
        if (pagInfo) {
            pagInfo.innerText = `Hiển thị ${paginatedItems.length > 0 ? startIdx + 1 : 0}-${Math.min(endIdx, totalItems)} / ${totalItems} khách hàng`;
            document.getElementById('c-btn-prev').disabled = this.currentPage === 1;
            document.getElementById('c-btn-next').disabled = this.currentPage === totalPages;
        }

        if (paginatedItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Không tìm thấy khách hàng</td></tr>`;
            return;
        }

        let html = '';
        paginatedItems.forEach(c => {
            html += `
                <tr>
                    <td style="font-weight: 500;">${c.id}</td>
                    <td style="font-weight: 600;">${c.name}</td>
                    <td>${c.phone}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.orderCount} đơn</td>
                    <td><span class="badge badge-primary">Thành viên</span></td>
                    <td style="text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" onclick="CustomerManager.editCustomer(${c.dbId})"><i class="fa-solid fa-pen"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    openModal: function() {
        const form = document.getElementById('customer-form');
        if (form) form.reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('modal-title').innerText = 'Thêm khách hàng';
        document.getElementById('customer-modal').classList.add('active');
    },

    closeModal: function() {
        document.getElementById('customer-modal').classList.remove('active');
    },

    editCustomer: function(dbId) {
        const c = this.customers.find(x => x.dbId === dbId);
        if (!c) return;

        document.getElementById('edit-id').value = c.dbId;
        document.getElementById('c-name').value = c.name;
        document.getElementById('c-phone').value = c.phone;
        document.getElementById('c-email').value = c.email || '';

        document.getElementById('modal-title').innerText = 'Sửa thông tin khách hàng';
        document.getElementById('customer-modal').classList.add('active');
    },

    saveCustomer: async function() {
        const hoTen = document.getElementById('c-name').value.trim();
        const soDienThoai = document.getElementById('c-phone').value.trim();
        const email = document.getElementById('c-email').value.trim();
        const editId = document.getElementById('edit-id').value;

        if (!hoTen) return App.showToast('Tên không được bỏ trống!', 'error');
        if (!soDienThoai.match(/^[0-9]{10,11}$/)) return App.showToast('Số điện thoại không hợp lệ (10-11 số)!', 'error');

        try {
            App.showLoading();
            if (editId) {
                await API.patch(`/api/khach-hang/${editId}`, { hoTen, soDienThoai, email });
                App.showToast('Cập nhật khách hàng thành công!', 'success');
            } else {
                await API.post('/api/khach-hang/quan-ly', {
                    hoTen,
                    soDienThoai,
                    email: email || `khach${Date.now()}@domain.com`,
                    matKhau: '123456'
                });
                App.showToast('Thêm khách hàng mới thành công!', 'success');
            }
            this.closeModal();
            await this.loadCustomers();
        } catch (e) {
            App.showToast(e.message || 'Thao tác thất bại!', 'error');
        } finally {
            App.hideLoading();
        }
    }
};
