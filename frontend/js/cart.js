
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

    _addingMap: {},

    add: async function(dbId, qty = 1, event = null) {
        if (event) {
            if (typeof event.stopPropagation === 'function') event.stopPropagation();
            if (typeof event.preventDefault === 'function') event.preventDefault();
        }

        // Chống spam click liên tục cho cùng sản phẩm trong vòng 600ms
        const now = Date.now();
        const key = String(dbId);
        this._addingMap = this._addingMap || {};
        if (this._addingMap[key] && (now - this._addingMap[key] < 600)) {
            return;
        }
        this._addingMap[key] = now;

        // Visual feedback & tạm khóa nút bấm để chống spam/double click
        let btn = null;
        if (event && event.target && event.target.closest) {
            btn = event.target.closest('button');
        }
        if (btn && !btn.disabled) {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
            btn.style.transition = 'all 0.2s ease';
            const originalOpacity = btn.style.opacity;
            btn.style.opacity = '0.7';
            setTimeout(() => {
                if (btn) {
                    btn.disabled = false;
                    btn.style.pointerEvents = '';
                    btn.style.opacity = originalOpacity || '';
                }
            }, 600);
        }

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

            qty = Math.max(1, parseInt(qty, 10) || 1);
            if (p.stock > 0 && qty > p.stock) {
                App.showToast(`Kho chỉ còn ${p.stock} sản phẩm! Đã tự chỉnh về số lượng tối đa.`, 'warning');
                qty = p.stock;
            }

            const existing = this.items.find(x => String(x.dbId) === String(p.dbId) || String(x.id) === String(p.id));
            if (existing) {
                existing.maxStock = p.stock;
                if (existing.quantity >= p.stock) {
                    App.showToast(`Kho chỉ còn ${p.stock} sản phẩm! Giỏ hàng đã đạt giới hạn tối đa.`, 'warning');
                    existing.quantity = p.stock;
                } else if (existing.quantity + qty > p.stock) {
                    App.showToast(`Kho chỉ còn ${p.stock} sản phẩm! Đã tự điều chỉnh về tối đa.`, 'warning');
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
                    quantity: Math.min(qty, p.stock)
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
        if (!event) return;
        if (document.querySelectorAll('.flying-cart-item').length > 0) return;

        const btn = event.target.closest ? event.target.closest('button') : null;
        if (!btn) return;
        
        const card = btn.closest('.product-card') || btn.closest('.product-card-mini');
        let img = card ? card.querySelector('img') : document.querySelector('.product-image');
        if (!img) return;

        const cartIcon = document.querySelector('.fa-cart-shopping');
        if (!cartIcon) return;

        const imgRect = img.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();

        const flyingImg = img.cloneNode();
        flyingImg.className = 'flying-cart-item';
        flyingImg.style.position = 'fixed';
        flyingImg.style.left = imgRect.left + 'px';
        flyingImg.style.top = imgRect.top + 'px';
        flyingImg.style.width = imgRect.width + 'px';
        flyingImg.style.height = imgRect.height + 'px';
        flyingImg.style.opacity = '1';
        flyingImg.style.zIndex = '9999';
        flyingImg.style.transition = 'all 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)';
        flyingImg.style.borderRadius = '50%';
        flyingImg.style.objectFit = 'cover';
        flyingImg.style.pointerEvents = 'none';

        document.body.appendChild(flyingImg);
        void flyingImg.offsetWidth;

        flyingImg.style.left = (cartRect.left + cartRect.width / 2 - 10) + 'px';
        flyingImg.style.top = (cartRect.top + cartRect.height / 2 - 10) + 'px';
        flyingImg.style.width = '20px';
        flyingImg.style.height = '20px';
        flyingImg.style.opacity = '0.3';

        setTimeout(() => {
            if (flyingImg && flyingImg.parentNode) flyingImg.remove();
            const badge = document.getElementById('cart-count');
            if (badge) {
                badge.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                badge.style.transform = 'scale(1.5)';
                setTimeout(() => badge.style.transform = 'scale(1)', 250);
            }
        }, 800);
    },

    remove: function(dbId) {
        this.items = this.items.filter(x => String(x.dbId) !== String(dbId) && String(x.id) !== String(dbId));
        this.save();
    },

    handleQtyInput: function(dbId, inputEl) {
        if (!inputEl) return;
        const item = this.items.find(x => String(x.dbId) === String(dbId) || String(x.id) === String(dbId));
        if (!item) return;

        const maxLimit = (item.maxStock !== undefined && item.maxStock !== null) ? Number(item.maxStock) : 999;
        let val = parseInt(inputEl.value, 10);
        
        if (maxLimit > 0 && val > maxLimit) {
            inputEl.value = maxLimit;
            App.showToast(`Kho chỉ còn ${maxLimit} sản phẩm! Không thể mua quá số lượng.`, 'warning');
        }
    },

    setQty: function(dbId, val) {
        const item = this.items.find(x => String(x.dbId) === String(dbId) || String(x.id) === String(dbId));
        if (!item) return;

        let parsed = parseInt(val, 10);
        if (isNaN(parsed) || parsed < 1) {
            parsed = 1;
        }

        const maxLimit = (item.maxStock !== undefined && item.maxStock !== null) ? Number(item.maxStock) : 999;
        if (maxLimit > 0 && parsed > maxLimit) {
            parsed = maxLimit;
            App.showToast(`Kho chỉ còn ${maxLimit} sản phẩm! Đã tự điều chỉnh về tối đa.`, 'warning');
        }

        item.quantity = parsed;
        this.save();
    },

    updateQty: function(dbId, delta) {
        const item = this.items.find(x => String(x.dbId) === String(dbId) || String(x.id) === String(dbId));
        if (!item) return;
        
        const maxLimit = (item.maxStock !== undefined && item.maxStock !== null) ? Number(item.maxStock) : 999;
        const nextVal = item.quantity + delta;

        if (nextVal <= 0) {
            this.remove(dbId);
            return;
        }

        if (maxLimit > 0 && nextVal > maxLimit) {
            item.quantity = maxLimit;
            App.showToast(`Kho chỉ còn ${maxLimit} sản phẩm! Không thể mua thêm.`, 'warning');
            this.save();
            return;
        }

        item.quantity = nextVal;
        this.save();
    },

    buildDrawerUI: function() {
        if (document.getElementById('cart-drawer')) return;

        const html = `
            <div id="cart-drawer-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(2px); z-index:999998;" onclick="Cart.closeDrawer()"></div>
            <div id="cart-drawer" style="transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); position:fixed; top:0; right:0; bottom:0; width: 420px; max-width: 90vw; background:var(--shop-surface); box-shadow:-4px 0 25px rgba(0,0,0,0.18); z-index:999999; display:flex; flex-direction:column;">
                <div style="padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--shop-border); display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--shop-text); display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-cart-shopping" style="color:var(--shop-primary);"></i> Giỏ hàng
                    </h3>
                    <button onclick="Cart.closeDrawer()" style="background:none; border:none; font-size:1.6rem; line-height:1; cursor:pointer; color:var(--shop-text-muted); transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">&times;</button>
                </div>
                <div id="cart-drawer-body" style="flex:1; overflow-y:auto; padding: 1rem;">
                </div>
                <div style="padding: 1.25rem 1.5rem 2rem; border-top: 1px solid var(--shop-border); background:var(--shop-bg);">
                    <div style="display:flex; justify-content:space-between; font-size:1.2rem; font-weight:bold; margin-bottom:1rem; color:var(--shop-primary);">
                        <span>Tạm tính:</span>
                        <span id="cart-drawer-total">0 ₫</span>
                    </div>
                    <button onclick="Cart.goToCheckout()" style="width:100%; padding:14px; background:var(--shop-accent); color:white; border:none; border-radius:var(--shop-radius); font-size:1.05rem; font-weight:bold; cursor:pointer; box-shadow:0 4px 14px rgba(249,115,22,0.3); transition:all 0.2s;">
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
        if (drawer && drawer.style.transform === 'translateX(0%)') {
            this.closeDrawer();
        } else {
            this.openDrawer();
        }
    },

    openDrawer: function() {
        const overlay = document.getElementById('cart-drawer-overlay');
        const drawer = document.getElementById('cart-drawer');
        if (overlay) overlay.style.display = 'block';
        if (drawer) drawer.style.transform = 'translateX(0%)';

        // Ẩn trợ lý AI và nút cuộn lên khi mở giỏ hàng
        const aiContainer = document.getElementById('shop-ai-container');
        if (aiContainer) aiContainer.style.display = 'none';

        const aiWindow = document.getElementById('shop-ai-window');
        if (aiWindow) aiWindow.style.display = 'none';

        const aiTooltip = document.getElementById('aina-tooltip');
        if (aiTooltip) aiTooltip.style.display = 'none';

        const scrollBtn = document.getElementById('scroll-to-top-btn');
        if (scrollBtn) {
            scrollBtn.style.display = 'none';
            scrollBtn.dataset.cartDrawerHidden = 'true';
        }

        this.renderDrawerContent();
    },

    closeDrawer: function() {
        const overlay = document.getElementById('cart-drawer-overlay');
        const drawer = document.getElementById('cart-drawer');
        if (overlay) overlay.style.display = 'none';
        if (drawer) drawer.style.transform = 'translateX(100%)';

        // Khôi phục lại trợ lý AI và nút cuộn lên khi đóng giỏ hàng
        const aiContainer = document.getElementById('shop-ai-container');
        if (aiContainer) aiContainer.style.display = '';

        const scrollBtn = document.getElementById('scroll-to-top-btn');
        if (scrollBtn) {
            scrollBtn.style.display = '';
            scrollBtn.dataset.cartDrawerHidden = 'false';
            if (window.scrollY > 300) {
                scrollBtn.style.opacity = '1';
                scrollBtn.style.visibility = 'visible';
            } else {
                scrollBtn.style.opacity = '0';
                scrollBtn.style.visibility = 'hidden';
            }
        }
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
            const maxStock = (item.maxStock !== undefined && item.maxStock !== null) ? Number(item.maxStock) : 999;
            html += `
                <div style="display:flex; gap:1rem; margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:1px solid var(--shop-border); align-items:center;">
                    <img src="${imgSrc}" onerror="this.onerror=null;this.src='${fallbackIcon}';" style="width:75px; height:75px; object-fit:cover; border-radius:6px; border:1px solid var(--shop-border); background:white;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; font-size:0.9rem; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3;">${item.name}</div>
                        <div style="color:var(--shop-primary); font-weight:bold; margin-bottom:6px;">${App.formatCurrency(item.price)}</div>
                        <div style="font-size:0.75rem; color:#64748b; margin-bottom:8px;">(Kho còn: <strong style="color:${maxStock < 5 ? '#ef4444' : '#10b981'}">${maxStock}</strong>)</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; border:1px solid var(--shop-border); border-radius:6px; background:white; overflow:hidden;">
                                <button onclick="Cart.updateQty('${item.dbId}', -1)" style="background:#f8fafc; border:none; border-right:1px solid var(--shop-border); padding:5px 10px; cursor:pointer; font-weight:bold; font-size:0.9rem; color:#475569;" title="Giảm 1">-</button>
                                <input type="number" 
                                       class="cart-qty-input" 
                                       id="cart-qty-${item.dbId}"
                                       value="${item.quantity}" 
                                       min="1" 
                                       max="${maxStock}" 
                                       onchange="Cart.setQty('${item.dbId}', this.value)"
                                       oninput="Cart.handleQtyInput('${item.dbId}', this)"
                                       onkeydown="if(event.key === 'Enter') { this.blur(); }"
                                       style="width: 48px; text-align: center; border: none; outline: none; font-size: 0.9rem; font-weight: 600; padding: 4px 0; -moz-appearance: textfield;">
                                <button onclick="Cart.updateQty('${item.dbId}', 1)" style="background:#f8fafc; border:none; border-left:1px solid var(--shop-border); padding:5px 10px; cursor:pointer; font-weight:bold; font-size:0.9rem; color:#475569;" title="Tăng 1">+</button>
                            </div>
                            <button onclick="Cart.remove('${item.dbId}')" title="Xóa" style="background:none; border:none; color:var(--shop-text-muted); cursor:pointer; padding:6px; font-size:1rem;"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        body.innerHTML = html;
        totalEl.innerText = App.formatCurrency(total);
    },

    goToCheckout: function() {
        if (this.items.length === 0) {
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Giỏ hàng của bạn đang trống!', 'warning');
            }
            return;
        }

        // Tự động kiểm tra và cắt giảm số lượng nếu vượt quá tồn kho
        let hasAdjusted = false;
        this.items.forEach(item => {
            const maxStock = (item.maxStock !== undefined && item.maxStock !== null) ? Number(item.maxStock) : 999;
            if (maxStock > 0 && item.quantity > maxStock) {
                item.quantity = maxStock;
                hasAdjusted = true;
            }
        });
        if (hasAdjusted) {
            this.save();
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Một số sản phẩm đã được tự động điều chỉnh về số lượng tồn tối đa!', 'warning');
            }
        }

        const path = window.location.pathname.toLowerCase();
        let checkoutPath = '../customer/checkout.html';
        if (path.includes('/customer')) {
            checkoutPath = 'checkout.html';
        } else if (path.includes('/public') || path.includes('/admin')) {
            checkoutPath = '../customer/checkout.html';
        } else if (path === '/' || path === '' || path === '/index.html' || path.endsWith('/frontend/') || path.endsWith('/frontend/index.html')) {
            checkoutPath = 'pages/customer/checkout.html';
        }
        
        const u = localStorage.getItem('shop_user');
        if (!u || u === 'null' || u === 'undefined') {
            let loginPath = 'shop-login.html';
            if (path.includes('/customer') || path.includes('/admin')) {
                loginPath = '../public/shop-login.html';
            } else if (path.includes('/public')) {
                loginPath = 'shop-login.html';
            } else if (path === '/' || path === '' || path === '/index.html' || path.endsWith('/frontend/') || path.endsWith('/frontend/index.html')) {
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
