const Wishlist = {
    items: [],

    init: function() {
        try {
            const saved = Storage.get('shop_wishlist') || [];
            this.items = Array.isArray(saved) ? saved.map(String) : [];
        } catch(e) {
            this.items = [];
        }
        this.renderBadge();
    },

    save: function() {
        Storage.set('shop_wishlist', this.items);
        this.renderBadge();
    },

    has: function(id) {
        if (!id) return false;
        const sId = String(id);
        return this.items.some(x => String(x) === sId);
    },

    renderBadge: function() {
        const count = this.items.length;
        document.querySelectorAll('#wishlist-count').forEach(el => {
            el.innerText = count;
            el.style.display = count > 0 ? 'inline-block' : 'none';
        });
    },

    toggle: function(id, btnElement) {
        if (!id) return;
        const sId = String(id);
        const idx = this.items.findIndex(x => String(x) === sId);
        let isNowActive = false;

        if (idx !== -1) {
            this.items.splice(idx, 1);
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Đã xóa khỏi danh sách yêu thích!', 'info');
            }
            isNowActive = false;
        } else {
            this.items.push(sId);
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Đã thêm vào danh sách yêu thích! ❤️', 'success');
            }
            isNowActive = true;
        }
        this.save();

        if (btnElement) {
            btnElement.classList.toggle('active', isNowActive);
            btnElement.title = isNowActive ? 'Bỏ yêu thích' : 'Thêm vào yêu thích';
            const icon = btnElement.querySelector('i');
            if (icon) {
                icon.className = isNowActive ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
                icon.style.color = isNowActive ? '#ef4444' : '';
                icon.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                icon.style.transform = 'scale(1.35)';
                setTimeout(() => { if (icon) icon.style.transform = 'scale(1)'; }, 200);
            }
        }

        // Cập nhật tất cả các nút yêu thích của cùng một sản phẩm trên trang
        document.querySelectorAll(`[data-wishlist-id="${sId}"]`).forEach(btn => {
            if (btn !== btnElement) {
                btn.classList.toggle('active', isNowActive);
                btn.title = isNowActive ? 'Bỏ yêu thích' : 'Thêm vào yêu thích';
                const ic = btn.querySelector('i');
                if (ic) {
                    ic.className = isNowActive ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
                    ic.style.color = isNowActive ? '#ef4444' : '';
                }
            }
        });

        // Nếu đang ở trang yêu thích thì render lại
        const hash = window.location.hash;
        if (hash === '#wishlist' || window.location.pathname.includes('wishlist.html')) {
            this.renderPage();
        }
    },

    remove: function(id) {
        if (!id) return;
        const sId = String(id);
        this.items = this.items.filter(x => String(x) !== sId);
        this.save();
        if (typeof App !== 'undefined' && App.showToast) {
            App.showToast('Đã xóa khỏi danh sách yêu thích!', 'info');
        }
        this.renderPage();
    },

    renderPage: async function() {
        const container = document.getElementById('wishlist-grid');
        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding: 3.5rem 1.5rem; color: var(--shop-text-muted); background: white; border-radius: 12px; border: 1px dashed var(--shop-border);">
                    <i class="fa-regular fa-heart" style="font-size:3.5rem; margin-bottom:1rem; color:#cbd5e1;"></i>
                    <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 1.25rem;">Danh sách yêu thích đang trống</h3>
                    <p style="margin: 0 0 1.5rem 0; font-size: 0.95rem; color: #64748b;">Hãy bấm biểu tượng trái tim ở các sản phẩm bạn quan tâm để dễ dàng xem lại nhé!</p>
                    <a href="../public/index.html" style="display:inline-flex; align-items:center; gap:8px; padding:10px 24px; background:var(--shop-primary); color:white; border-radius:24px; text-decoration:none; font-weight:600; font-size:0.95rem; box-shadow:0 3px 10px rgba(2,132,199,0.25);">
                        <i class="fa-solid fa-bag-shopping"></i> Khám phá sản phẩm ngay
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = '<div style="text-align:center; padding: 2rem; color:var(--shop-text-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top:10px;">Đang tải danh sách yêu thích...</p></div>';

        let allProducts = (typeof Shop !== 'undefined' && Array.isArray(Shop.allProducts) && Shop.allProducts.length) ? Shop.allProducts : [];
        if (!allProducts.length && typeof Storage !== 'undefined') {
            allProducts = Storage.get('products') || [];
        }
        if (!allProducts.length && typeof API !== 'undefined') {
            try {
                const list = await API.get('/api/thuoc');
                allProducts = Array.isArray(list) ? list : (list && list.data ? list.data : []);
            } catch(e) {}
        }

        const wlProducts = allProducts.filter(p => {
            const pid = String(p.id || p.dbId || p.maThuoc);
            return this.items.some(x => String(x) === pid);
        });

        if (wlProducts.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding: 3rem; color: var(--shop-text-muted); background: white; border-radius: 12px; border: 1px dashed var(--shop-border);">
                    <i class="fa-regular fa-heart" style="font-size:3rem; margin-bottom:1rem; color:#cbd5e1;"></i>
                    <p>Các sản phẩm yêu thích đã được cập nhật hoặc không còn kinh doanh.</p>
                    <a href="../public/index.html" style="color:var(--shop-primary); text-decoration:none; font-weight:600;">Xem sản phẩm khác</a>
                </div>
            `;
            return;
        }

        let html = '';
        const fallbackImg = 'https://cdn-icons-png.flaticon.com/512/8687/8687597.png';
        const isCustomerPath = window.location.pathname.includes('/customer/');
        const detailPrefix = isCustomerPath ? '../public/shop-detail.html?id=' : 'shop-detail.html?id=';

        wlProducts.forEach(p => {
            const pid = p.id || p.dbId || p.maThuoc;
            let imgSrc = p.imageUrl || p.image || p.hinhAnh;
            if (!imgSrc || imgSrc.includes('data:image/svg') || imgSrc.includes('Chưa có ảnh') || imgSrc.includes('undefined')) {
                imgSrc = (typeof window.getValidMedicineImage === 'function') 
                    ? window.getValidMedicineImage(p) 
                    : fallbackImg;
            }
            const stock = p.loTonKho ? p.loTonKho.reduce((sum, lo) => sum + (lo.soLuongTon || 0), 0) : (p.tonKho !== undefined ? p.tonKho : (p.stock || 0));
            const isOutOfStock = stock <= 0;

            html += `
                <div style="display:flex; gap:1.25rem; padding:1.25rem; border:1px solid var(--shop-border); border-radius:12px; position:relative; background:white; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.03); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
                    <img src="${imgSrc}" onerror="this.onerror=null;this.src='${fallbackImg}';" style="width:105px; height:105px; object-fit:cover; border-radius:8px; border:1px solid var(--shop-border); cursor:pointer; flex:none; background:#f8fafc;" onclick="window.location.href='${detailPrefix}${pid}'">
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:0.8rem; color:#0284c7; font-weight:600; text-transform:uppercase; margin-bottom:4px;">${p.danhMucThuoc?.tenDanhMuc || p.category || 'Dược phẩm'}</div>
                        <div style="font-weight:700; font-size:1.05rem; margin-bottom:6px; cursor:pointer; color:#1e293b; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" onclick="window.location.href='${detailPrefix}${pid}'">${p.tenThuoc || p.name}</div>
                        <div style="color:var(--shop-primary); font-size:1.25rem; font-weight:800; margin-bottom:6px;">${App.formatCurrency(p.giaBan || p.price || 0)}</div>
                        <div style="font-size:0.85rem; color:var(--shop-text-muted);">Tình trạng: ${!isOutOfStock ? `<span style="color:#16a34a; font-weight:600;"><i class="fa-solid fa-check"></i> Còn hàng (${stock})</span>` : '<span style="color:#ef4444; font-weight:600;"><i class="fa-solid fa-xmark"></i> Hết hàng</span>'}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.6rem; width:150px; flex:none;">
                        <button class="btn-add-cart" ${isOutOfStock ? 'disabled' : ''} style="padding:10px; font-size:0.9rem; font-weight:600; width:100%;" onclick="Cart.add('${pid}', 1, event)">
                            ${isOutOfStock ? 'Hết hàng' : '<i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ'}
                        </button>
                        <button style="padding:8px; background:#fff1f2; border:1px solid #fecdd3; color:#e11d48; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:6px; width:100%; transition:background 0.2s;" onmouseover="this.style.background='#ffe4e6'" onmouseout="this.style.background='#fff1f2'" onclick="Wishlist.remove('${pid}')">
                            <i class="fa-solid fa-trash-can"></i> Bỏ thích
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Wishlist.init();
});
