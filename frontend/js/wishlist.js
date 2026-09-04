const Wishlist = {
    items: [],

    init: function() {
        this.items = Storage.get('shop_wishlist') || [];
        this.renderBadge();
    },

    save: function() {
        Storage.set('shop_wishlist', this.items);
        this.renderBadge();
    },

    renderBadge: function() {
        document.querySelectorAll('#wishlist-count').forEach(el => {
            el.innerText = this.items.length;
            el.style.display = this.items.length > 0 ? 'inline-block' : 'none';
        });
    },

    toggle: function(id, btnElement) {
        if(btnElement) btnElement.classList.toggle('active');
        
        const idx = this.items.indexOf(id);
        if (idx !== -1) {
            this.items.splice(idx, 1);
            App.showToast('Đã bỏ yêu thích!', 'success');
        } else {
            this.items.push(id);
            App.showToast('Đã thêm vào danh sách yêu thích!', 'success');
        }
        this.save();
    },

    remove: function(id) {
        this.items = this.items.filter(x => x !== id);
        this.save();
        if(window.location.pathname.includes('wishlist.html')) {
            this.renderPage();
        }
    },

    renderPage: function() {
        const container = document.getElementById('wishlist-grid');
        if(!container) return;

        const allProducts = Storage.get('products') || [];
        const wlProducts = allProducts.filter(p => this.items.includes(p.id));

        if(wlProducts.length === 0) {
            container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 3rem; color: var(--shop-text-muted);">
                <i class="fa-solid fa-heart-crack" style="font-size:3rem; margin-bottom:1rem; color:#ccc;"></i>
                <p>Danh sách yêu thích đang trống.</p>
                <a href="index.html" style="color:var(--shop-primary); text-decoration:none; font-weight:bold;">Khám phá sản phẩm</a>
            </div>`;
            return;
        }

        let html = '';
        const fallbackImg = 'https://cdn-icons-png.flaticon.com/512/8687/8687597.png';
        wlProducts.forEach(p => {
            let imgSrc = p.imageUrl || p.image;
            if (!imgSrc || imgSrc.includes('data:image/svg') || imgSrc.includes('Chưa có ảnh')) {
                imgSrc = (typeof window.getValidMedicineImage === 'function') 
                    ? window.getValidMedicineImage(p) 
                    : fallbackImg;
            }
            html += `
                <div style="display:flex; gap:1.5rem; padding:1.5rem; border:1px solid var(--shop-border); border-radius:var(--shop-radius); position:relative; background:white;">
                    <button onclick="Wishlist.remove('${p.id}')" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#9ca3af; cursor:pointer;"><i class="fa-solid fa-xmark fa-lg"></i></button>
                    <img src="${imgSrc}" onerror="this.onerror=null;this.src='${fallbackImg}';" style="width:120px; height:120px; object-fit:cover; border-radius:var(--shop-radius); cursor:pointer;" onclick="goToProductDetail('${p.id}')">
                    <div style="flex:1;">
                        <div style="font-weight:600; font-size:1.1rem; margin-bottom:0.5rem; cursor:pointer;" onclick="goToProductDetail('${p.id}')">${p.name}</div>
                        <div style="color:var(--shop-primary); font-size:1.25rem; font-weight:bold;">${App.formatCurrency(p.price)}</div>
                        <div style="margin-top:0.5rem; font-size:0.875rem; color:var(--shop-text-muted);">Tình trạng: ${p.stock > 0 ? 'Còn hàng' : '<span style="color:#ef4444">Hết hàng</span>'}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.5rem; width:150px;">
                        <button class="btn-add-cart" ${p.stock === 0 ? 'disabled' : ''} onclick="Cart.add('${p.id}')">Thêm vào giỏ</button>
                        <button style="padding:10px; background:var(--shop-bg); border:1px solid var(--shop-border); color:var(--shop-text-muted); border-radius:4px; cursor:pointer;" onclick="Wishlist.remove('${p.id}')">Xóa</button>
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
