/**
 * B2C Shop Module - Kết nối Backend API
 */
const Shop = {
    allProducts: [],
    categories: [],
    filteredProducts: [],
    currentPage: 1,
    itemsPerPage: 12,
    currentCategory: null,

    init: async function() {
        if (typeof App !== 'undefined' && App.init) {
            App.init();
        }
        await this.loadCategories();
        await this.loadProducts();
        this.renderBrands();
        this.bindEvents();
        this.initSlider();
        this.loadNews();
        this.initScrollToTop();
    },

    loadCategories: async function() {
        try {
            this.categories = await API.get('/api/thuoc/danh-muc');
            this.renderCategories();
        } catch (e) {
            console.error('Lỗi khi tải danh mục shop:', e);
        }
    },

    loadProducts: async function() {
        try {
            App.showLoading();
            const res = await API.get('/api/thuoc');
            const list = res.data || res || [];
            this.allProducts = list.map(item => ({
                id: item.maThuoc || item.id,
                dbId: item.id,
                name: item.tenThuoc,
                category: item.danhMucThuoc?.tenDanhMuc || item.danhMuc || 'Khác',
                price: Number(item.giaBan),
                oldPrice: Number(item.giaBan) * 1.2,
                discount: 0,
                rating: 5,
                sold: 0,
                stock: item.loTonKho ? item.loTonKho.reduce((sum, lo) => sum + lo.soLuongTon, 0) : (item.tonKho || 0),
                minStock: item.tonKhoToiThieu || 5,
                unit: item.donViTinh || 'Viên',
                activeIngredient: item.hoatChat || '',
                dosage: item.hamLuong || '',
                imageUrl: item.hinhAnh,
                brand: 'AINA Pharmacy'
            }));
            this.filteredProducts = [...this.allProducts];
            this.renderProducts();
        } catch (e) {
            console.error('Lỗi khi tải danh sách thuốc:', e);
            App.showToast('Lỗi khi tải danh sách thuốc!', 'error');
        } finally {
            App.hideLoading();
        }
    },

    initSlider: function() {
        const slides = document.querySelectorAll('.hero-slide');
        const dotsContainer = document.getElementById('hero-dots');
        if (!slides.length || !dotsContainer) return;
        
        let currentSlide = 0;
        dotsContainer.innerHTML = '';
        
        slides.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = `hero-dot ${i === 0 ? 'active' : ''}`;
            dot.onclick = () => goToSlide(i);
            dotsContainer.appendChild(dot);
        });

        const dots = document.querySelectorAll('.hero-dot');
        
        const goToSlide = (n) => {
            slides[currentSlide].style.display = 'none';
            if (dots[currentSlide]) dots[currentSlide].classList.remove('active');
            currentSlide = (n + slides.length) % slides.length;
            slides[currentSlide].style.display = 'flex';
            if (dots[currentSlide]) dots[currentSlide].classList.add('active');
        };

        setInterval(() => {
            goToSlide(currentSlide + 1);
        }, 4000);
    },

    initScrollToTop: function() {
        if (document.getElementById('scroll-to-top-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'scroll-to-top-btn';
        btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '30px', 
            right: '150px',
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-color, #0ea5e9)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            opacity: '0',
            visibility: 'hidden',
            transition: 'all 0.3s ease',
            zIndex: '9998'
        });
        
        document.body.appendChild(btn);
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                btn.style.opacity = '1';
                btn.style.visibility = 'visible';
            } else {
                btn.style.opacity = '0';
                btn.style.visibility = 'hidden';
            }
        });
        
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    },

    loadNews: async function() {
        const track = document.getElementById('news-marquee-track');
        if (!track) return;
        
        try {
            const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://vnexpress.net/rss/suc-khoe.rss');
            const data = await response.json();
            
            if (data && data.items && data.items.length > 0) {
                let html = '';
                const items = data.items.slice(0, 6);
                
                const renderItems = () => {
                    items.forEach(item => {
                        let imgSrc = item.thumbnail;
                        if (!imgSrc) {
                            const imgMatch = item.description.match(/src="([^"]+)"/);
                            if (imgMatch) imgSrc = imgMatch[1];
                        }
                        if (!imgSrc) imgSrc = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&auto=format&fit=crop';

                        let dateStr = 'Mới nhất';
                        if (item.pubDate) {
                            const d = new Date(item.pubDate);
                            dateStr = d.toLocaleDateString('vi-VN');
                        }
                        
                        const div = document.createElement('div');
                        div.innerHTML = item.description;
                        const text = div.textContent || div.innerText || "";
                        
                        html += `
                            <a href="${item.link}" target="_blank" class="news-card">
                                <img src="${imgSrc}" alt="${item.title.replace(/"/g, '&quot;')}">
                                <div class="news-card-body">
                                    <div class="news-date">${dateStr}</div>
                                    <div class="news-title">${item.title}</div>
                                    <div class="news-summary">${text.substring(0, 100)}...</div>
                                </div>
                            </a>
                        `;
                    });
                };
                
                renderItems();
                renderItems();
                
                track.innerHTML = html;
            } else {
                track.innerHTML = '<div style="padding: 2rem;">Không tải được tin tức.</div>';
            }
        } catch (error) {
            console.error('Lỗi khi tải tin tức:', error);
            track.innerHTML = '<div style="padding: 2rem;">Không tải được tin tức.</div>';
        }
    },

    bindEvents: function() {
        const sortSel = document.getElementById('sort-select');
        if (sortSel) {
            sortSel.addEventListener('change', () => this.applySortAndFilter());
        }

        const searchInput = document.getElementById('shop-search-input');
        const searchDropdown = document.getElementById('search-dropdown');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (searchDropdown) searchDropdown.style.display = 'none';
                    this.applySortAndFilter();
                }
            });

            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                if (!term) {
                    if (searchDropdown) searchDropdown.style.display = 'none';
                    return;
                }

                let matches = this.allProducts.filter(p => 
                    p.name.toLowerCase().includes(term) || 
                    (p.activeIngredient && p.activeIngredient.toLowerCase().includes(term))
                );

                matches = matches.slice(0, 5);

                if (matches.length > 0) {
                    let html = '';
                    matches.forEach(p => {
                        const imgSrc = p.imageUrl || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22150%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3ECh%C6%B0a%20c%C3%B3%20%E1%BA%A3nh%3C%2Ftext%3E%3C%2Fsvg%3E';
                        html += `
                            <a href="shop-detail.html?id=${p.dbId}" class="search-dropdown-item">
                                <img src="${imgSrc}" class="search-dropdown-img" alt="${p.name}">
                                <div class="search-dropdown-info">
                                    <div class="search-dropdown-name">${p.name}</div>
                                    <div class="search-dropdown-price">${App.formatCurrency(p.price)}</div>
                                </div>
                            </a>
                        `;
                    });
                    if (searchDropdown) {
                        searchDropdown.innerHTML = html;
                        searchDropdown.style.display = 'block';
                    }
                } else {
                    if (searchDropdown) {
                        searchDropdown.innerHTML = '<div style="padding: 15px; color: #6b7280; text-align: center; font-size: 0.9rem;">Không tìm thấy sản phẩm phù hợp</div>';
                        searchDropdown.style.display = 'block';
                    }
                }
            });
            
            document.addEventListener('click', (e) => {
                if (searchDropdown && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                    searchDropdown.style.display = 'none';
                }
            });
        }

        document.querySelectorAll('input[name="price"], input[name="rating"]').forEach(el => {
            el.addEventListener('change', () => this.applySortAndFilter());
        });
    },

    renderCategories: function() {
        const nav = document.getElementById('category-nav');
        if (!nav) return;

        let html = '<option value="all">Tất cả sản phẩm</option>';
        this.categories.forEach(c => {
            if (c.tenDanhMuc.toLowerCase() === 'ok' || c.tenDanhMuc.toLowerCase() === 'test') return;
            html += `<option value="${c.tenDanhMuc}">${c.tenDanhMuc}</option>`;
        });
        nav.innerHTML = html;
    },

    renderBrands: function() {
        const brands = [...new Set(this.allProducts.map(p => p.category))].filter(b => b);
        const container = document.getElementById('brand-filters');
        if (!container) return;
        
        let html = '';
        brands.forEach(b => {
            html += `<label class="filter-label"><input type="checkbox" class="brand-cb" value="${b}"> ${b}</label>`;
        });
        container.innerHTML = html;

        document.querySelectorAll('.brand-cb').forEach(el => {
            el.addEventListener('change', () => this.applySortAndFilter());
        });
    },

    filterCategory: function(cat) {
        const searchInput = document.getElementById('shop-search-input');
        if (searchInput) searchInput.value = '';

        if (cat === 'all') {
            this.currentCategory = null;
        } else {
            this.currentCategory = cat;
        }
        
        // Đồng bộ hiển thị của Select dropdown nếu gọi từ nơi khác (ví dụ: category card)
        const navSelect = document.getElementById('category-nav');
        if (navSelect && navSelect.tagName === 'SELECT') {
            navSelect.value = cat;
        }

        this.applySortAndFilter();

        const gridSection = document.querySelector('.shop-layout-grid');
        if (gridSection) {
            window.scrollTo({
                top: gridSection.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    },

    applySortAndFilter: function() {
        let result = [...this.allProducts];

        const searchInput = document.getElementById('shop-search-input');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        if (searchTerm) {
            result = result.filter(p => 
                p.name.toLowerCase().includes(searchTerm) || 
                (p.activeIngredient && p.activeIngredient.toLowerCase().includes(searchTerm))
            );
        }

        if (this.currentCategory) {
            const catTarget = this.currentCategory.toLowerCase().trim();
            // Fuzzy match for hardcoded categories
            result = result.filter(p => {
                if (!p.category) return false;
                const pCat = p.category.toLowerCase();
                // Direct match or partial match for broad categories
                if (pCat === catTarget || pCat.includes(catTarget) || catTarget.includes(pCat)) return true;
                
                // Special mapping for hardcoded categories if needed
                if (catTarget === 'thuốc' && pCat.includes('thuốc')) return true;
                if (catTarget.includes('thực phẩm') && pCat.includes('chức năng')) return true;
                if (catTarget.includes('vitamin') && (pCat.includes('vitamin') || pCat.includes('khoáng'))) return true;
                if (catTarget.includes('cá nhân') && pCat.includes('cá nhân')) return true;
                if (catTarget.includes('mẹ & bé') && (pCat.includes('mẹ') || pCat.includes('bé'))) return true;
                if (catTarget.includes('thiết bị') && pCat.includes('thiết bị')) return true;
                if (catTarget.includes('mỹ phẩm') && pCat.includes('mỹ phẩm')) return true;

                return false;
            });
        }

        const priceVal = document.querySelector('input[name="price"]:checked')?.value || 'all';
        if (priceVal !== 'all') {
            result = result.filter(p => {
                if (priceVal === 'under100') return p.price < 100000;
                if (priceVal === '100-300') return p.price >= 100000 && p.price <= 300000;
                if (priceVal === '300-500') return p.price > 300000 && p.price <= 500000;
                if (priceVal === 'over500') return p.price > 500000;
                return true;
            });
        }

        const sortSel = document.getElementById('sort-select');
        const sortVal = sortSel ? sortSel.value : 'default';
        if (sortVal === 'price-asc') result.sort((a, b) => a.price - b.price);
        if (sortVal === 'price-desc') result.sort((a, b) => b.price - a.price);

        this.filteredProducts = result;
        this.currentPage = 1;
        this.renderProducts();
    },

    renderProducts: function() {
        const grid = document.getElementById('product-grid');
        if (!grid) return;

        if (this.filteredProducts.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--shop-text-muted);">Không tìm thấy sản phẩm nào phù hợp.</div>`;
            const pag = document.getElementById('pagination');
            if (pag) pag.innerHTML = '';
            return;
        }

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = this.filteredProducts.slice(start, start + this.itemsPerPage);

        let html = '';
        paginated.forEach(p => {
            let stockHtml = '';
            let btnDisabled = '';
            if (p.stock === 0) {
                stockHtml = `<div style="color: #ef4444; font-size: 0.75rem; margin-bottom: 4px;">Hết hàng</div>`;
                btnDisabled = 'disabled';
            } else if (p.stock <= p.minStock) {
                stockHtml = `<div style="color: #f59e0b; font-size: 0.75rem; margin-bottom: 4px;">Chỉ còn ${p.stock} sp</div>`;
            }

            const imgSrc = p.imageUrl || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22150%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3ECh%C6%B0a%20c%C3%B3%20%E1%BA%A3nh%3C%2Ftext%3E%3C%2Fsvg%3E';
            html += `
                <div class="product-card">
                    <img src="${imgSrc}" alt="${p.name}" class="product-image" onclick="location.href='shop-detail.html?id=${p.dbId}'" style="cursor:pointer; object-fit: cover;">
                    <div class="product-brand">${p.category || 'Khác'}</div>
                    <div class="product-name" title="${p.name}" onclick="location.href='shop-detail.html?id=${p.dbId}'" style="cursor:pointer;">${p.name}</div>
                    
                    <div class="product-rating">
                        ★★★★★ <span style="color:var(--shop-text-muted); font-size: 0.75rem;">5.0</span>
                    </div>

                    ${stockHtml}

                    <div class="product-price-row">
                        <span class="product-price">${App.formatCurrency(p.price)}</span>
                    </div>

                    <div class="product-actions">
                        <button class="btn-add-cart" ${btnDisabled} onclick="Cart.add(${p.dbId}, 1, event)">
                            ${p.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
                        </button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
        this.renderPagination();
    },

    renderPagination: function() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        const container = document.getElementById('pagination');
        if (!container) return;
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button onclick="Shop.goToPage(${i})" style="padding: 6px 12px; border: 1px solid var(--shop-border); background: ${this.currentPage === i ? 'var(--shop-primary)' : 'white'}; color: ${this.currentPage === i ? 'white' : 'black'}; border-radius: 4px; cursor: pointer;">${i}</button>`;
        }
        container.innerHTML = html;
    },

    goToPage: function(page) {
        this.currentPage = page;
        this.renderProducts();
        window.scrollTo({ top: document.querySelector('.shop-layout-grid').offsetTop - 100, behavior: 'smooth' });
    }
};
