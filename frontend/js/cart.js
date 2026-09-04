
const Cart = {
    items: [],

    init: function() {
        this.items = Storage.get('shop_cart') || [];
        this.repairItemImages();
        this.renderBadge();
        this.buildDrawerUI();
        this.highlightActiveMenu();
    },

    resolveImage: function(item) {
        if (!item) return 'https://cdn-icons-png.flaticon.com/512/8687/8687597.png';
        if (typeof window.getValidMedicineImage === 'function') {
            return window.getValidMedicineImage(item);
        }
        if (typeof getValidMedicineImage === 'function') {
            return getValidMedicineImage(item);
        }
        if (typeof window.VIETNAM_DRUG_IMAGES !== 'undefined') {
            const name = (item.name || item.tenThuoc || '').toLowerCase();
            for (const [k, v] of Object.entries(window.VIETNAM_DRUG_IMAGES)) {
                if (name.includes(k.toLowerCase())) return v;
            }
        }
        const raw = item.imageUrl || item.image || item.hinhAnh;
        return (raw && !raw.includes('data:image/svg') && !raw.includes('Chưa có ảnh'))
            ? raw
            : 'https://cdn-icons-png.flaticon.com/512/8687/8687597.png';
    },

    repairItemImages: function() {
        let changed = false;
        if (!Array.isArray(this.items)) {
            this.items = [];
            return;
        }
        this.items.forEach(item => {
            if (!item.image || item.image.includes('data:image/svg') || item.image.includes('Chưa có ảnh') || item.image.includes('undefined')) {
                const fixed = this.resolveImage(item);
                if (fixed && fixed !== item.image) {
                    item.image = fixed;
                    changed = true;
                }
            }
        });
        if (changed) {
            Storage.set('shop_cart', this.items);
        }
    },

    save: function() {
        Storage.set('shop_cart', this.items);
        this.renderBadge();
        this.renderDrawerContent();
    },

    renderBadge: function() {
        const count = this.items.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll('#cart-count').forEach(el => {
            el.innerText = count;
            el.style.display = count > 0 ? 'inline-block' : 'none';
        });
    },

    highlightActiveMenu: function() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        
        document.querySelectorAll('.shop-action-btn').forEach(btn => {
            const href = btn.getAttribute('href');
            if (href && href === page) {
                btn.classList.add('active');
            } else if (href) {
                btn.classList.remove('active');
            }
        });
    },

    add: async function(dbId, qty = 1, event = null) {
        try {
            let thuoc = null;
            // 1. Tìm trong danh sách Shop đã tải sẵn
            if (typeof Shop !== 'undefined' && Array.isArray(Shop.allProducts) && Shop.allProducts.length > 0) {
                thuoc = Shop.allProducts.find(t => String(t.id) === String(dbId) || String(t.dbId) === String(dbId) || String(t.maThuoc) === String(dbId));
            }
            // 2. Tìm trong Storage 'products'
            if (!thuoc && typeof Storage !== 'undefined') {
                const stored = Storage.get('products') || [];
                thuoc = stored.find(t => String(t.id) === String(dbId) || String(t.dbId) === String(dbId) || String(t.maThuoc) === String(dbId));
            }
            // 3. Gọi API nếu chưa có
            if (!thuoc && typeof API !== 'undefined') {
                const list = await API.get('/api/thuoc');
                const arr = Array.isArray(list) ? list : (list && list.data ? list.data : []);
                thuoc = arr.find(t => String(t.id) === String(dbId) || String(t.maThuoc) === String(dbId));
            }

            if (!thuoc) {
                App.showToast('Sản phẩm không tồn tại!', 'error');
                return;
            }

            const rawImg = thuoc.imageUrl || thuoc.image || thuoc.hinhAnh;
            const validImg = this.resolveImage({ name: thuoc.tenThuoc || thuoc.name, image: rawImg });

            const p = {
                id: thuoc.maThuoc || thuoc.id,
                dbId: thuoc.id || thuoc.dbId || thuoc.maThuoc,
                name: thuoc.tenThuoc || thuoc.name,
                category: thuoc.danhMucThuoc?.tenDanhMuc || thuoc.danhMuc || thuoc.category || 'Khác',
                price: Number(thuoc.giaBan || thuoc.price || 0),
                stock: thuoc.loTonKho ? thuoc.loTonKho.reduce((sum, lo) => sum + (lo.soLuongTon || 0), 0) : (thuoc.tonKho !== undefined ? thuoc.tonKho : (thuoc.stock || 10)),
                unit: thuoc.donViTinh || thuoc.unit || 'Viên',
                image: validImg
            };

            if (p.stock <= 0) {
                App.showToast('Sản phẩm đã hết hàng!', 'error');
                return;
            }

            const existing = this.items.find(x => String(x.dbId) === String(p.dbId) || String(x.id) === String(p.id));
            if (existing) {
                if (existing.quantity + qty > p.stock) {
                    App.showToast(`Kho chỉ còn ${p.stock} sản phẩm!`, 'warning');
                    existing.quantity = p.stock;
                } else {
                    existing.quantity += qty;
                }
                if (!existing.image || existing.image.includes('data:image/svg') || existing.image.includes('Chưa có ảnh')) {
                    existing.image = p.image;
                }
            } else {
                this.items.push({
                    dbId: p.dbId,
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    image: p.image,
                    maxStock: p.stock,
                    quantity: qty
                });
            }
            
            this.save();
            App.showToast('Đã thêm vào giỏ hàng!', 'success');
            
            if (event) {
                this.flyToCart(event);
            }
        } catch (e) {
            console.error('Lỗi thêm giỏ hàng:', e);
            App.showToast('Không thể thêm sản phẩm vào giỏ!', 'error');
        }
    },

    buyNow: async function(dbId, qty = 1) {
        await this.add(dbId, qty);
        this.goToCheckout();
    },

    flyToCart: function(event) {
        const btn = event.target.closest('button');
        if (!btn) return;
        
        const card = btn.closest('.product-card') || btn.closest('.product-card-mini');
        let img = card ? card.querySelector('img') : document.querySelector('.product-image');
        if (!img) return;

        const cartIcon = document.querySelector('.fa-cart-shopping');
        if (!cartIcon) return;

        const imgRect = img.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();

        const flyingImg = img.cloneNode();
        flyingImg.style.position = 'fixed';
        flyingImg.style.left = imgRect.left + 'px';
        flyingImg.style.top = imgRect.top + 'px';
        flyingImg.style.width = imgRect.width + 'px';
        flyingImg.style.height = imgRect.height + 'px';
        flyingImg.style.opacity = '1';
        flyingImg.style.zIndex = '9999';
        flyingImg.style.transition = 'all 1s cubic-bezier(0.25, 0.1, 0.25, 1)';
        flyingImg.style.borderRadius = '50%';
        flyingImg.style.objectFit = 'cover';

        document.body.appendChild(flyingImg);
        void flyingImg.offsetWidth;

        flyingImg.style.left = (cartRect.left + cartRect.width / 2 - 10) + 'px';
        flyingImg.style.top = (cartRect.top + cartRect.height / 2 - 10) + 'px';
        flyingImg.style.width = '20px';
        flyingImg.style.height = '20px';
        flyingImg.style.opacity = '0.3';

        setTimeout(() => {
            flyingImg.remove();
            const badge = document.getElementById('cart-count');
            if (badge) {
                badge.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                badge.style.transform = 'scale(1.8)';
                setTimeout(() => badge.style.transform = 'scale(1)', 300);
            }
        }, 1000);
    },

    remove: function(dbId) {
        this.items = this.items.filter(x => String(x.dbId) !== String(dbId) && String(x.id) !== String(dbId));
        this.save();
    },

    updateQty: function(dbId, delta) {
        const item = this.items.find(x => String(x.dbId) === String(dbId) || String(x.id) === String(dbId));
        if (!item) return;
        
        item.quantity += delta;
        if (item.quantity <= 0) {
            this.remove(dbId);
        } else if (item.maxStock && item.quantity > item.maxStock) {
            item.quantity = item.maxStock;
            App.showToast('Vượt quá số lượng tồn kho', 'warning');
        }
        this.save();
    },

    buildDrawerUI: function() {
        if (document.getElementById('cart-drawer')) return;

        const html = `
            <div id="cart-drawer-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:2000;" onclick="Cart.closeDrawer()"></div>
            <div id="cart-drawer" style="transform: translateX(100%); transition: transform 0.3s; position:fixed; top:0; right:0; bottom:0; width: 400px; max-width: 90vw; background:var(--shop-surface); box-shadow:-2px 0 10px rgba(0,0,0,0.1); z-index:2001; display:flex; flex-direction:column;">
                <div style="padding: 1rem; border-bottom: 1px solid var(--shop-border); display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; color:var(--shop-text);">Giỏ hàng</h3>
                    <button onclick="Cart.closeDrawer()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--shop-text-muted);">&times;</button>
                </div>
                <div id="cart-drawer-body" style="flex:1; overflow-y:auto; padding: 1rem;">
                </div>
                <div style="padding: 1.5rem; border-top: 1px solid var(--shop-border); background:var(--shop-bg);">
                    <div style="display:flex; justify-content:space-between; font-size:1.2rem; font-weight:bold; margin-bottom:1rem; color:var(--shop-primary);">
                        <span>Tạm tính:</span>
                        <span id="cart-drawer-total">0 ₫</span>
                    </div>
                    <button onclick="Cart.goToCheckout()" style="width:100%; padding:15px; background:var(--shop-accent); color:white; border:none; border-radius:var(--shop-radius); font-size:1.1rem; font-weight:bold; cursor:pointer;">
                        Tiến hành thanh toán
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        this.renderDrawerContent();
    },

    toggleDrawer: function(e) {
        if (e) e.preventDefault();
        const drawer = document.getElementById('cart-drawer');
        if (drawer.style.transform === 'translateX(0%)') {
            this.closeDrawer();
        } else {
            this.openDrawer();
        }
    },

    openDrawer: function() {
        document.getElementById('cart-drawer-overlay').style.display = 'block';
        document.getElementById('cart-drawer').style.transform = 'translateX(0%)';
        this.renderDrawerContent();
    },

    closeDrawer: function() {
        document.getElementById('cart-drawer-overlay').style.display = 'none';
        document.getElementById('cart-drawer').style.transform = 'translateX(100%)';
    },

    renderDrawerContent: function() {
        const body = document.getElementById('cart-drawer-body');
        const totalEl = document.getElementById('cart-drawer-total');
        if (!body) return;

        if (this.items.length === 0) {
            body.innerHTML = `<div style="text-align:center; padding: 3rem 0; color:var(--shop-text-muted);">
                <i class="fa-solid fa-cart-arrow-down" style="font-size:3rem; margin-bottom:1rem;"></i>
                <p>Giỏ hàng đang trống.</p>
                <button onclick="Cart.closeDrawer(); window.location.href='index.html'" style="margin-top:1rem; padding:10px 20px; border-radius:20px; border:1px solid var(--shop-primary); color:var(--shop-primary); background:white; cursor:pointer;">Tiếp tục mua sắm</button>
            </div>`;
            totalEl.innerText = '0 ₫';
            return;
        }

        let html = '';
        let total = 0;
        const fallbackIcon = 'https://cdn-icons-png.flaticon.com/512/8687/8687597.png';

        this.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            let imgSrc = item.image;
            if (!imgSrc || imgSrc.includes('data:image/svg') || imgSrc.includes('Chưa có ảnh') || imgSrc.includes('undefined')) {
                imgSrc = this.resolveImage(item);
                item.image = imgSrc;
            }
            html += `
                <div style="display:flex; gap:1rem; margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:1px solid var(--shop-border); align-items:center;">
                    <img src="${imgSrc}" onerror="this.onerror=null;this.src='${fallbackIcon}';" style="width:75px; height:75px; object-fit:cover; border-radius:6px; border:1px solid var(--shop-border); background:white;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; font-size:0.9rem; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3;">${item.name}</div>
                        <div style="color:var(--shop-primary); font-weight:bold; margin-bottom:8px;">${App.formatCurrency(item.price)}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; border:1px solid var(--shop-border); border-radius:4px; background:white;">
                                <button onclick="Cart.updateQty('${item.dbId}', -1)" style="background:none; border:none; padding:4px 10px; cursor:pointer; font-weight:bold;">-</button>
                                <span style="font-size:0.9rem; width:28px; text-align:center;">${item.quantity}</span>
                                <button onclick="Cart.updateQty('${item.dbId}', 1)" style="background:none; border:none; padding:4px 10px; cursor:pointer; font-weight:bold;">+</button>
                            </div>
                            <button onclick="Cart.remove('${item.dbId}')" title="Xóa" style="background:none; border:none; color:var(--shop-text-muted); cursor:pointer; padding:6px;"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        body.innerHTML = html;
        totalEl.innerText = App.formatCurrency(total);
    },

    goToCheckout: function() {
        const path = window.location.pathname.toLowerCase();
        let checkoutPath = '../customer/checkout.html';
        if (path.includes('/customer')) {
            checkoutPath = 'checkout.html';
        } else if (path.endsWith('/frontend/') || path.endsWith('index.html') || path === '/' || path === '') {
            checkoutPath = 'pages/customer/checkout.html';
        }
        
        const u = localStorage.getItem('shop_user');
        if (!u || u === 'null' || u === 'undefined') {
            let loginPath = 'shop-login.html';
            if (path.includes('/customer') || path.includes('/admin')) {
                loginPath = '../public/shop-login.html';
            } else if (path.includes('/public')) {
                loginPath = 'shop-login.html';
            } else if (path.endsWith('/frontend/') || path.endsWith('index.html') || path === '/' || path === '') {
                loginPath = 'pages/public/shop-login.html';
            }
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Vui lòng đăng nhập để tiến hành thanh toán!', 'warning');
            }
            setTimeout(() => {
                window.location.href = loginPath;
            }, 1200);
            return;
        }

        window.location.href = checkoutPath;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Cart.init();
});
