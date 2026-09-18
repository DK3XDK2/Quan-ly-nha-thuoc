
const aiService = {
    ask: async function(query) {
        try {
            const res = await API.post('/api/goi-y-ai/hoi', { cauHoi: query });
            if (res && res.traLoi) {
                return res.traLoi;
            }
        } catch (e) {
            console.warn('Lỗi gọi API AI backend, chuyển sang phân tích cục bộ:', e);
        }

        // Fallback phân tích nội bộ nếu backend offline
        const q = query.toLowerCase();
        
        let products = await API.get('/api/thuoc').catch(() => null);
        if (!products) products = Storage.get('products') || [];
        products = products.map(p => ({
            ...p,
            name: p.tenThuoc || p.name || 'Sản phẩm',
            stock: p.loTonKho ? p.loTonKho.reduce((sum, lo) => sum + lo.soLuongTon, 0) : (p.tonKho || p.stock || 0),
            minStock: p.tonKhoToiThieu || p.minStock || 5,
            expiryDate: p.hanSuDung || p.expiryDate
        }));

        let orders = await API.get('/api/don-hang/quan-ly').catch(() => null);
        let invoices = await API.get('/api/hoa-don').catch(() => null);
        
        let allOrders = [];
        if (orders || invoices) {
            if (orders) allOrders = allOrders.concat(orders.map(o => ({ status: o.trangThai, total: o.tongThanhToan || o.tongTien || 0 })));
            if (invoices) allOrders = allOrders.concat(invoices.map(o => ({ status: o.trangThai || 'HOAN_TAT', total: o.tongTien || 0 })));
        } else {
            allOrders = (Storage.get('orders') || []).map(o => ({ status: o.status, total: o.summary?.total || 0 }));
        }

        if (q.includes('hết hạn') || q.includes('hạn sử dụng')) {
            const today = new Date();
            const expired = products.filter(p => new Date(p.expiryDate) < today);
            const soon = products.filter(p => {
                const diff = (new Date(p.expiryDate) - today) / (1000 * 3600 * 24);
                return diff >= 0 && diff <= 30;
            });
            return `Dựa trên dữ liệu hiện tại, có **${expired.length}** sản phẩm đã hết hạn và **${soon.length}** sản phẩm sắp hết hạn trong 30 ngày tới. Bạn nên kiểm tra kho tại trang "Tồn Kho".`;
        }
        
        if (q.includes('hết hàng') || q.includes('tồn kho')) {
            const outOfStock = products.filter(p => p.stock === 0);
            const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
            return `Hiện tại có **${outOfStock.length}** sản phẩm đã hết hàng hoàn toàn, và **${lowStock.length}** sản phẩm đang dưới mức tồn tối thiểu. Bạn có muốn tôi gợi ý đơn vị nhập hàng không?`;
        }

        if (q.includes('doanh thu') || q.includes('bán được')) {
            let total = 0;
            allOrders.forEach(o => { if(o.status !== 'CANCELLED' && o.status !== 'HUY') total += o.total; });
            return `Tổng doanh thu hệ thống ghi nhận tính đến nay là **${App.formatCurrency(total)}**. Nếu bạn cần chi tiết theo ngày, vui lòng xem ở bảng điều khiển Báo cáo.`;
        }

        if (q.includes('nhập hàng') || q.includes('gợi ý')) {
            const lowStock = products.filter(p => p.stock <= p.minStock).map(p => p.name).join(', ');
            if(!lowStock) return "Hiện tại kho vẫn đủ hàng hóa, bạn chưa cần nhập thêm ngay lúc này.";
            return `Dựa vào lượng tồn kho thấp, AI đề xuất bạn nên ưu tiên nhập thêm các mặt hàng sau: **${lowStock}**.`;
        }

        return "Xin lỗi, hiện tại tôi chưa tìm thấy thông tin phù hợp cho câu hỏi này. Bạn hãy thử hỏi về tình hình tồn kho, hạn sử dụng hoặc sản phẩm cụ thể nhé!";
    }
};

const AI = {
    init: async function() {
        await this.renderInsights();
        const input = document.getElementById('chat-input');
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight < 100 ? this.scrollHeight : 100) + 'px';
        });
    },

    renderInsights: async function() {
        const panel = document.getElementById('insights-panel');
        let products = await API.get('/api/thuoc').catch(() => null);
        if (!products) products = Storage.get('products') || [];
        products = products.map(p => ({
            ...p,
            stock: p.loTonKho ? p.loTonKho.reduce((sum, lo) => sum + lo.soLuongTon, 0) : (p.tonKho || p.stock || 0),
            expiryDate: p.hanSuDung || p.expiryDate
        }));
        const today = new Date();

        const expSoon = products.filter(p => {
            const d = (new Date(p.expiryDate) - today) / 86400000;
            return d > 0 && d <= 30;
        });

        const outOfStock = products.filter(p => p.stock === 0);

        let html = `
            <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 8px;">AI Insights Dashboard</h3>
        `;

        if (expSoon.length > 0) {
            html += `
                <div class="insight-card danger">
                    <div class="insight-title"><i class="fa-solid fa-clock"></i> Cảnh báo hết hạn</div>
                    <div class="insight-desc">Phát hiện ${expSoon.length} lô thuốc sắp hết hạn sử dụng. Cần có biện pháp xử lý.</div>
                </div>
            `;
        } else {
            html += `
                <div class="insight-card success">
                    <div class="insight-title"><i class="fa-solid fa-check-circle"></i> Hạn sử dụng an toàn</div>
                    <div class="insight-desc">Không phát hiện thuốc nào sắp hết hạn trong 30 ngày tới.</div>
                </div>
            `;
        }

        if (outOfStock.length > 0) {
            html += `
                <div class="insight-card warning">
                    <div class="insight-title"><i class="fa-solid fa-box-open"></i> Đứt gãy nguồn cung</div>
                    <div class="insight-desc">Có ${outOfStock.length} sản phẩm hết hàng hoàn toàn. Đề xuất nhập thêm ngay.</div>
                </div>
            `;
        }

        html += `
            <div class="insight-card">
                <div class="insight-title"><i class="fa-solid fa-chart-line"></i> Xu hướng bán hàng</div>
                <div class="insight-desc">Panadol Extra đang là sản phẩm có tốc độ bán ra nhanh nhất tuần qua.</div>
            </div>
            <div class="insight-card" style="border-left-color: var(--primary-color);">
                <div class="insight-title"><i class="fa-solid fa-lightbulb"></i> Gợi ý tối ưu</div>
                <div class="insight-desc">Có thể kết hợp bán thêm Vitamin C chung với đơn thuốc Kháng sinh để tăng doanh thu.</div>
            </div>
        `;

        panel.innerHTML = html;
    },

    clearChat: function() {
        document.getElementById('chat-messages').innerHTML = `
            <div class="message ai">
                <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="message-bubble">
                    Đã xóa lịch sử. Bạn cần hỗ trợ gì?
                </div>
            </div>
        `;
    },

    ask: function(query) {
        const input = document.getElementById('chat-input');
        input.value = query;
        this.sendInput();
    },

    sendInput: function() {
        const input = document.getElementById('chat-input');
        const query = input.value.trim();
        if (!query) return;

        input.value = '';
        input.style.height = 'auto';

        this.appendMessage('user', query);
        this.showTyping();

        aiService.ask(query).then(response => {
            this.hideTyping();

            const htmlRes = response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            this.appendMessage('ai', htmlRes);
        });
    },

    appendMessage: function(sender, text) {
        const chat = document.getElementById('chat-messages');
        const avatar = sender === 'ai' ? '<i class="fa-solid fa-robot"></i>' : 'U';
        const html = `
            <div class="message ${sender}">
                <div class="message-avatar">${avatar}</div>
                <div class="message-bubble">${text}</div>
            </div>
        `;
        chat.insertAdjacentHTML('beforeend', html);
        chat.scrollTop = chat.scrollHeight;
    },

    showTyping: function() {
        const chat = document.getElementById('chat-messages');
        const html = `
            <div class="message ai" id="typing-indicator">
                <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="message-bubble">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        chat.insertAdjacentHTML('beforeend', html);
        chat.scrollTop = chat.scrollHeight;
    },

    hideTyping: function() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }
};

const AIChatMonitor = {
    currentPage: 1,
    limit: 10,
    totalRecords: 0,
    filters: {
        tuKhoa: '',
        ngay: '',
        loaiBot: '',
        chiCanhBao: false,
    },

    init: function() {
        this.bindEvents();
        this.loadHistory();
    },

    switchTab: function(tabName) {
        const tabInternal = document.getElementById('tab-btn-internal');
        const tabMonitor = document.getElementById('tab-btn-monitor');
        const viewInternal = document.getElementById('view-internal');
        const viewMonitor = document.getElementById('view-monitor');

        if (!viewInternal || !viewMonitor) return;

        if (tabName === 'monitor') {
            tabInternal.classList.remove('active');
            tabMonitor.classList.add('active');
            viewInternal.style.display = 'none';
            viewMonitor.style.display = 'flex';
            this.loadHistory();
        } else {
            tabMonitor.classList.remove('active');
            tabInternal.classList.add('active');
            viewMonitor.style.display = 'none';
            viewInternal.style.display = 'flex';
        }
    },

    bindEvents: function() {
        const searchInput = document.getElementById('monitor-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filters.tuKhoa = e.target.value.trim();
                    this.currentPage = 1;
                    this.loadHistory();
                }, 400);
            });
        }

        const dateInput = document.getElementById('monitor-date-filter');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.filters.ngay = e.target.value;
                this.currentPage = 1;
                this.loadHistory();
            });
        }

        const botSelect = document.getElementById('monitor-bot-filter');
        if (botSelect) {
            botSelect.addEventListener('change', (e) => {
                this.filters.loaiBot = e.target.value;
                this.currentPage = 1;
                this.loadHistory();
            });
        }

        const alertFilter = document.getElementById('monitor-alert-filter');
        if (alertFilter) {
            alertFilter.addEventListener('change', (e) => {
                this.filters.chiCanhBao = e.target.value === 'warning';
                this.currentPage = 1;
                this.loadHistory();
            });
        }
    },

    loadHistory: async function() {
        const container = document.getElementById('monitor-chat-list');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 12px;"></i>
                <div>Đang tải lịch sử hội thoại AI...</div>
            </div>
        `;

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
            });

            if (this.filters.tuKhoa) params.append('tuKhoa', this.filters.tuKhoa);
            if (this.filters.ngay) params.append('ngay', this.filters.ngay);
            if (this.filters.loaiBot) params.append('loaiBot', this.filters.loaiBot);
            if (this.filters.chiCanhBao) params.append('chiCanhBao', 'true');

            const res = await API.get(`/api/goi-y-ai/lich-su-chat?${params.toString()}`);

            if (res && res.thongKe) {
                this.renderStats(res.thongKe);
            }

            const list = res?.danhSach || [];
            this.totalRecords = res?.tongSo || 0;
            this.renderList(list);
            this.renderPagination(this.totalRecords);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử chat:', error);
            container.innerHTML = `
                <div style="text-align:center; padding: 30px; color: var(--danger-color);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <div>Không thể tải lịch sử tư vấn AI. Vui lòng thử lại!</div>
                    <button class="btn btn-outline" style="margin-top:12px;" onclick="AIChatMonitor.loadHistory()">
                        <i class="fa-solid fa-rotate-right"></i> Thử lại
                    </button>
                </div>
            `;
        }
    },

    renderStats: function(stats) {
        const elTong = document.getElementById('stat-monitor-tong');
        const elHomNay = document.getElementById('stat-monitor-hom-nay');
        const elCanhBao = document.getElementById('stat-monitor-canh-bao');

        if (elTong) elTong.innerText = stats.tongChat || 0;
        if (elHomNay) elHomNay.innerText = stats.chatHomNay || 0;
        if (elCanhBao) elCanhBao.innerText = stats.canCanThiep || 0;
    },

    renderList: function(items) {
        const container = document.getElementById('monitor-chat-list');
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 50px 20px; background:var(--bg-surface); border-radius:var(--radius-lg); border: 1px dashed var(--border-color);">
                    <i class="fa-solid fa-comment-slash" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 12px;"></i>
                    <h4 style="font-weight:600; color:var(--text-primary); margin-bottom:6px;">Chưa có lịch sử hội thoại phù hợp</h4>
                    <p style="color:var(--text-secondary); font-size:0.9rem;">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
            `;
            return;
        }

        const isQuanLy = Auth.hasPermission('admin') || (Auth.getCurrentUser() && Auth.getCurrentUser().role === 'QUAN_LY');

        const html = items.map((item) => {
            const timeStr = new Date(item.taoLuc).toLocaleString('vi-VN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
            });

            const phone = item.khachHang?.soDienThoai || '';
            const email = item.khachHang?.email || '';
            const tenKhach = item.khachHang?.hoTen || item.tenNguoiDung || 'Khách hàng';

            const warningBadge = item.canCanThiep ? `
                <div style="display:inline-flex; align-items:center; gap:6px; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; border-radius:20px; padding:4px 10px; font-size:0.75rem; font-weight:700;">
                    <i class="fa-solid fa-triangle-exclamation"></i> CẦN CAN THIỆP: ${item.lyDoCanThiep || 'Cảnh báo y tế'}
                </div>
            ` : '';

            const borderHighlight = item.canCanThiep ? 'border-left: 4px solid #ef4444;' : 'border-left: 4px solid #3b82f6;';

            // Format markdown response
            const formattedAnswer = String(item.traLoi || '')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>');

            const actionButtons = `
                <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid var(--border-color);">
                    ${phone ? `
                        <a href="tel:${phone}" class="btn btn-sm btn-primary" style="display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; padding:5px 12px; border-radius:20px;">
                            <i class="fa-solid fa-phone"></i> Gọi cho khách (${phone})
                        </a>
                    ` : ''}
                    <button class="btn btn-sm btn-outline" style="font-size:0.8rem; padding:5px 12px; border-radius:20px;" onclick="AIChatMonitor.copyContact('${tenKhach}', '${phone || email}')">
                        <i class="fa-solid fa-copy"></i> Sao chép liên hệ
                    </button>
                    <button class="btn btn-sm btn-outline" style="font-size:0.8rem; padding:5px 12px; border-radius:20px; color:var(--primary-color);" onclick="AIChatMonitor.showInterventionModal('${tenKhach}', '${phone}', '${item.cauHoi.replace(/'/g, "\\'")}', '${item.lyDoCanThiep || ''}')">
                        <i class="fa-solid fa-shield-halved"></i> Ghi chú can thiệp
                    </button>
                    ${isQuanLy ? `
                        <button class="btn btn-sm btn-outline text-danger" style="margin-left:auto; font-size:0.8rem; padding:5px 10px; border-radius:20px;" onclick="AIChatMonitor.deleteItem(${item.id})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            `;

            return `
                <div style="background:var(--bg-surface); border:1px solid var(--border-color); ${borderHighlight} border-radius:var(--radius-md); padding:16px; margin-bottom:14px; box-shadow:var(--shadow-sm);">
                    <!-- Header -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #3b82f6, #1d4ed8); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1rem;">
                                ${tenKhach.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight:600; font-size:0.95rem; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
                                    ${tenKhach}
                                    <span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:600;">Khách hàng</span>
                                </div>
                                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                                    ${phone ? `<i class="fa-solid fa-phone" style="margin-right:4px;"></i>${phone} &bull; ` : ''}
                                    ${email ? `<i class="fa-solid fa-envelope" style="margin-right:4px;"></i>${email} &bull; ` : ''}
                                    <i class="fa-regular fa-clock" style="margin-right:4px;"></i>${timeStr}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${warningBadge}
                            <span style="background:#f1f5f9; color:#475569; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:500;">
                                <i class="fa-solid fa-robot" style="margin-right:4px;"></i>${item.loaiBot === 'BOT_2' ? 'Groq Llama' : 'Gemini AI'}
                            </span>
                        </div>
                    </div>

                    <!-- Content -->
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <!-- Question -->
                        <div style="background:#f8fafc; border-left:3px solid #3b82f6; padding:10px 14px; border-radius:6px; font-size:0.9rem;">
                            <div style="font-size:0.75rem; font-weight:700; color:#2563eb; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">
                                <i class="fa-solid fa-user-circle"></i> Khách hỏi:
                            </div>
                            <div style="color:var(--text-primary); line-height:1.45;">${item.cauHoi}</div>
                        </div>

                        <!-- AI Response -->
                        <div style="background:#f0fdf4; border-left:3px solid #22c55e; padding:10px 14px; border-radius:6px; font-size:0.9rem;">
                            <div style="font-size:0.75rem; font-weight:700; color:#15803d; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">
                                <i class="fa-solid fa-robot"></i> Trợ lý Dược sĩ AINA phản hồi:
                            </div>
                            <div style="color:var(--text-primary); line-height:1.45;">${formattedAnswer}</div>
                        </div>
                    </div>

                    <!-- Actions -->
                    ${actionButtons}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    renderPagination: function(total) {
        const pagContainer = document.getElementById('monitor-pagination');
        if (!pagContainer) return;

        const totalPages = Math.ceil(total / this.limit) || 1;

        if (totalPages <= 1) {
            pagContainer.innerHTML = '';
            return;
        }

        pagContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-top:16px; padding:10px 0;">
                <span style="font-size:0.85rem; color:var(--text-secondary);">
                    Hiển thị <strong>${Math.min((this.currentPage - 1) * this.limit + 1, total)} - ${Math.min(this.currentPage * this.limit, total)}</strong> / <strong>${total}</strong> cuộc trò chuyện
                </span>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-outline btn-sm" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="AIChatMonitor.changePage(${this.currentPage - 1})">
                        <i class="fa-solid fa-chevron-left"></i> Trước
                    </button>
                    <span style="display:flex; align-items:center; padding:0 8px; font-weight:600; font-size:0.85rem;">
                        ${this.currentPage} / ${totalPages}
                    </span>
                    <button class="btn btn-outline btn-sm" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="AIChatMonitor.changePage(${this.currentPage + 1})">
                        Sau <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    changePage: function(newPage) {
        this.currentPage = newPage;
        this.loadHistory();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    copyContact: function(name, info) {
        const text = `${name} - ${info}`;
        navigator.clipboard.writeText(text).then(() => {
            if (window.App && typeof App.showToast === 'function') {
                App.showToast(`Đã sao chép liên hệ: ${text}`, 'success');
            } else {
                alert(`Đã sao chép: ${text}`);
            }
        });
    },

    showInterventionModal: function(name, phone, question, reason) {
        const modalHtml = `
            <div id="intervention-modal-overlay" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:99999; display:flex; align-items:center; justify-content:center; padding:15px;">
                <div style="background:white; border-radius:12px; max-width:500px; width:100%; padding:24px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h4 style="font-weight:700; font-size:1.1rem; color:#1e293b; display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid fa-shield-heart" style="color:#ef4444;"></i> Can Thiệp & Hỗ Trợ Khách Hàng
                        </h4>
                        <button onclick="document.getElementById('intervention-modal-overlay').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#94a3b8;">&times;</button>
                    </div>

                    <div style="background:#f8fafc; border-radius:8px; padding:12px; margin-bottom:16px; font-size:0.9rem;">
                        <div><strong>Khách hàng:</strong> ${name}</div>
                        ${phone ? `<div><strong>Điện thoại:</strong> <a href="tel:${phone}" style="color:#2563eb; font-weight:600;">${phone}</a></div>` : ''}
                        ${reason ? `<div style="color:#dc2626; margin-top:4px;"><strong>Lý do cảnh báo:</strong> ${reason}</div>` : ''}
                        <div style="margin-top:6px; color:#475569;"><strong>Nội dung khách hỏi:</strong> "${question}"</div>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:6px;">Ghi chú hành động của Dược sĩ:</label>
                        <textarea id="intervention-note" rows="3" class="chat-input" style="width:100%; box-sizing:border-box;" placeholder="Ví dụ: Đã gọi điện khuyên khách hàng đến ngay trạm y tế gần nhất khám..."></textarea>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button class="btn btn-outline" onclick="document.getElementById('intervention-modal-overlay').remove()">Đóng</button>
                        ${phone ? `<a href="tel:${phone}" class="btn btn-primary"><i class="fa-solid fa-phone"></i> Gọi ngay</a>` : ''}
                        <button class="btn btn-success" onclick="AIChatMonitor.saveInterventionNote('${name}')">
                            <i class="fa-solid fa-check"></i> Lưu xử lý
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    saveInterventionNote: function(name) {
        const note = document.getElementById('intervention-note')?.value.trim();
        const overlay = document.getElementById('intervention-modal-overlay');
        if (overlay) overlay.remove();

        if (window.App && typeof App.showToast === 'function') {
            App.showToast(`Đã ghi nhận can thiệp cho khách hàng ${name}!`, 'success');
        } else {
            alert(`Đã ghi nhận xử lý cho ${name}`);
        }
    },

    deleteItem: async function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa bản ghi tư vấn AI này khỏi nhật ký?')) return;
        try {
            await API.delete(`/api/goi-y-ai/lich-su-chat/${id}`);
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Đã xóa bản ghi chat thành công', 'success');
            }
            this.loadHistory();
        } catch (e) {
            alert('Không thể xóa bản ghi: ' + e.message);
        }
    }
};
