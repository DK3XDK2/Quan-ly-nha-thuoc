
const ProductManager = {
    products: [],
    categories: [],
    currentPage: 1,
    itemsPerPage: 10,
    filteredProducts: [],

    mapThuoc: function(t) {
        const stock = Array.isArray(t.loTonKho)
            ? t.loTonKho.reduce((sum, lo) => sum + (lo.soLuongTon || 0), 0)
            : (t.soLuongTon || 0);

        return {
            dbId: t.id,
            id: t.maThuoc || `SP${t.id.toString().padStart(3, '0')}`,
            name: t.tenThuoc,
            activeIngredient: t.hoatChat || '',
            category: t.danhMucThuoc ? t.danhMucThuoc.tenDanhMuc : 'Khác',
            categoryId: t.danhMucThuocId,
            unit: t.donViTinh || 'Hộp',
            price: parseFloat(t.giaBan) || 0,
            stock: stock,
            minStock: 20,
            status: t.conKinhDoanh !== false ? 'ACTIVE' : 'INACTIVE',
            imageUrl: t.hinhAnh || '',
            canDonThuoc: t.canDonThuoc || false,
            raw: t
        };
    },

    init: async function() {
        await this.loadCategories();
        await this.loadProducts();
        this.bindEvents();
    },

    loadCategories: async function() {
        try {
            this.categories = await API.get('/api/thuoc/danh-muc');
            this.renderCategorySelects();
        } catch (e) {
            console.error('Lỗi khi tải danh mục:', e);
        }
    },

    renderCategorySelects: function() {
        const filterSelect = document.getElementById('filter-category');
        const modalSelect = document.getElementById('p-category');

        if (filterSelect) {
            let html = '<option value="">Tất cả danh mục</option>';
            this.categories.forEach(c => {
                html += `<option value="${c.tenDanhMuc}">${c.tenDanhMuc}</option>`;
            });
            filterSelect.innerHTML = html;
        }

        if (modalSelect) {
            let html = '<option value="">-- Chọn danh mục --</option>';
            this.categories.forEach(c => {
                html += `<option value="${c.id}">${c.tenDanhMuc}</option>`;
            });
            modalSelect.innerHTML = html;
        }
    },

    loadProducts: async function() {
        try {
            App.showLoading();
            const list = await API.get('/api/thuoc');
            this.products = (list || []).map(t => this.mapThuoc(t));
            this.filteredProducts = [...this.products];
            this.renderList();
        } catch (error) {
            App.showToast('Lỗi khi tải danh sách thuốc từ máy chủ', 'error');
        } finally {
            App.hideLoading();
        }
    },

    bindEvents: function() {
        const searchInput = document.getElementById('search-product');
        const filterCat = document.getElementById('filter-category');

        if (searchInput) {
            searchInput.addEventListener('input', () => { this.currentPage = 1; this.renderList(); });
        }
        if (filterCat) {
            filterCat.addEventListener('change', () => { this.currentPage = 1; this.renderList(); });
        }
    },

    renderList: function() {
        const tbody = document.getElementById('product-list');
        if (!tbody) return;

        const searchTerm = (document.getElementById('search-product')?.value || '').toLowerCase();
        const category = document.getElementById('filter-category')?.value;

        this.filteredProducts = this.products;

        if (searchTerm) {
            this.filteredProducts = this.filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) || 
                p.id.toLowerCase().includes(searchTerm) ||
                (p.activeIngredient && p.activeIngredient.toLowerCase().includes(searchTerm))
            );
        }

        if (category) {
            this.filteredProducts = this.filteredProducts.filter(p => p.category === category);
        }

        const totalItems = this.filteredProducts.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const paginatedItems = this.filteredProducts.slice(startIdx, endIdx);

        const pagInfo = document.getElementById('pagination-info');
        if (pagInfo) {
            pagInfo.innerText = `Hiển thị ${paginatedItems.length > 0 ? startIdx + 1 : 0}-${Math.min(endIdx, totalItems)} / ${totalItems} sản phẩm`;
            
            const nextElem = pagInfo.nextElementSibling;
            if (nextElem && nextElem.children.length >= 2) {
                const prevBtn = nextElem.children[0];
                const nextBtn = nextElem.children[1];
                prevBtn.disabled = this.currentPage === 1;
                nextBtn.disabled = this.currentPage === totalPages;
                prevBtn.onclick = () => { if (this.currentPage > 1) { this.currentPage--; this.renderList(); } };
                nextBtn.onclick = () => { if (this.currentPage < totalPages) { this.currentPage++; this.renderList(); } };
            }
        }

        if (paginatedItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">Không tìm thấy sản phẩm nào!</td></tr>`;
            return;
        }

        let html = '';
        paginatedItems.forEach(p => {
            const isOutOfStock = p.stock <= 0;
            const stockClass = isOutOfStock ? 'badge-danger' : (p.stock <= p.minStock ? 'badge-warning' : 'badge-success');
            const statusClass = p.status === 'ACTIVE' ? 'badge-success' : 'badge-danger';
            const statusText = p.status === 'ACTIVE' ? 'Đang bán' : 'Ngừng bán';

            html += `
                <tr>
                    <td style="font-weight: 500;">${p.id}</td>
                    <td>
                        <div style="font-weight: 600;">${p.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted)">${p.activeIngredient || ''}</div>
                    </td>
                    <td>${p.category}</td>
                    <td>${p.unit}</td>
                    <td style="font-weight: 600; color: var(--primary-color);">${App.formatCurrency(p.price)}</td>
                    <td><span class="badge ${stockClass}">${p.stock}</span></td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td style="text-align: right;">
                        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                            <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" onclick="ProductManager.editProduct(${p.dbId})" title="Sửa">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; color: var(--danger-color);" onclick="ProductManager.deleteProduct(${p.dbId})" title="Đổi trạng thái">
                                <i class="fa-solid fa-ban"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    openModal: function() {
        const form = document.getElementById('product-form');
        if (form) form.reset();
        document.getElementById('edit-id').value = '';
        const pId = document.getElementById('p-id');
        if (pId) pId.disabled = false;
        document.getElementById('modal-title').innerText = 'Thêm sản phẩm mới';
        document.getElementById('product-modal').classList.add('active');
    },

    closeModal: function() {
        document.getElementById('product-modal').classList.remove('active');
    },

    editProduct: function(dbId) {
        const p = this.products.find(x => x.dbId === dbId);
        if (!p) return;

        document.getElementById('edit-id').value = p.dbId;
        const pId = document.getElementById('p-id');
        if (pId) {
            pId.value = p.id;
            pId.disabled = true;
        }
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-ingredient').value = p.activeIngredient || '';
        
        const catSelect = document.getElementById('p-category');
        if (catSelect) {
            catSelect.value = p.categoryId || '';
        }
        
        document.getElementById('p-unit').value = p.unit;
        document.getElementById('p-price').value = p.price;

        document.getElementById('modal-title').innerText = 'Cập nhật sản phẩm';
        document.getElementById('product-modal').classList.add('active');
    },

    saveProduct: async function() {
        const maThuoc = document.getElementById('p-id').value.trim();
        const tenThuoc = document.getElementById('p-name').value.trim();
        const hoatChat = document.getElementById('p-ingredient').value.trim();
        const categoryId = parseInt(document.getElementById('p-category').value);
        const donViTinh = document.getElementById('p-unit').value.trim();
        const giaBan = parseFloat(document.getElementById('p-price').value);
        const dbId = document.getElementById('edit-id').value;

        if (!maThuoc || !tenThuoc) {
            App.showToast('Mã và Tên sản phẩm không được bỏ trống!', 'error');
            return;
        }
        if (isNaN(giaBan) || giaBan < 0) {
            App.showToast('Giá bán phải là số hợp lệ!', 'error');
            return;
        }

        try {
            App.showLoading();
            if (dbId) {

                await API.patch(`/api/thuoc/${dbId}`, {
                    maThuoc,
                    tenThuoc,
                    hoatChat,
                    danhMucThuocId: categoryId || undefined,
                    donViTinh,
                    giaBan
                });
                App.showToast('Cập nhật sản phẩm thành công!', 'success');
            } else {

                await API.post('/api/thuoc', {
                    maThuoc,
                    tenThuoc,
                    hoatChat,
                    danhMucThuocId: categoryId || 1,
                    donViTinh,
                    giaBan
                });
                App.showToast('Thêm sản phẩm thành công!', 'success');
            }
            this.closeModal();
            await this.loadProducts();
        } catch (error) {
            App.showToast(error.message || 'Thao tác sản phẩm thất bại', 'error');
        } finally {
            App.hideLoading();
        }
    },

    deleteProduct: async function(dbId) {
        const currentUser = Auth.getCurrentUser();
        if (currentUser && currentUser.role !== 'QUAN_LY' && currentUser.role !== 'ADMIN') {
            App.showToast('Chỉ Quản trị viên mới có quyền đổi trạng thái kinh doanh!', 'error');
            return;
        }
        App.showConfirm(`Bạn có chắc muốn ngưng kinh doanh thuốc này?`, async () => {
            try {
                App.showLoading();
                await API.patch(`/api/thuoc/${dbId}`, { conKinhDoanh: false });
                App.showToast('Đã ngưng kinh doanh thuốc thành công!', 'success');
                await this.loadProducts();
            } catch (e) {
                App.showToast(e.message || 'Thao tác thất bại!', 'error');
            } finally {
                App.hideLoading();
            }
        });
    }
};
