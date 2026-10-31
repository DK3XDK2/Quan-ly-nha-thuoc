

const MessengerApp = {
    currentChannel: 'AI', 
    socket: null,
    activePharmacistSession: null,
    aiChatHistory: [],
    pharmacistMessages: [],
    selectedAttachment: null,
    pollingInterval: null,
    waitingTimer: null,

    init: async function() {
        const user = this.getCurrentUser();
        const token = (window.API && API.getToken && API.getToken()) || localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!user || !token) {
            window.location.replace('../public/shop-login.html?redirect=' + encodeURIComponent(window.location.pathname));
            return;
        }

        // Tự động đóng phiên chờ nếu khách hàng tắt tab hoặc chuyển trang
        window.addEventListener('beforeunload', () => {
            if (this.activePharmacistSession && this.activePharmacistSession.trangThai === 'CHO_TU_VAN') {
                const uToken = (window.API && API.getToken && API.getToken()) || localStorage.getItem('shop_token') || localStorage.getItem('token');
                const backendUrl = (window.__ENV__ && window.__ENV__.BACKEND_URL) || (window.API && API.baseUrl) || 'http://localhost:4000';
                if (uToken && navigator.sendBeacon) {
                    navigator.sendBeacon(`${backendUrl}/api/tu-van/khach-hang-ket-thuc?token=${uToken}`, JSON.stringify({ lyDo: "Khách hàng đã rời khỏi trang web" }));
                }
            }
        });

        this.renderUserArea();
        this.initAiHistory();
        this.renderCurrentChannel();
        this.initSocket();
        this.checkActivePharmacistSession();

        const params = new URLSearchParams(window.location.search);
        if (params.get('channel') === 'pharmacist' || params.get('tab') === 'pharmacist') {
            this.switchChannel('PHARMACIST');
        } else {
            this.switchChannel('AI');
        }
    },

    getCurrentUser: function() {
        try {
            return (window.API && API.getCurrentUser && API.getCurrentUser()) ||
                   (window.Storage && Storage.get && Storage.get('shop_user')) ||
                   null;
        } catch (e) {
            return null;
        }
    },

    isLoggedIn: function() {
        const u = this.getCurrentUser();
        return Boolean(u && (u.id || u.email));
    },

    renderUserArea: function() {
        const container = document.getElementById('topbar-user-area');
        if (!container) return;

        const user = this.getCurrentUser();
        if (this.isLoggedIn()) {
            const avatar = user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop';
            container.innerHTML = `
                <a href="../customer/shop-account.html" class="btn-topbar-pill" style="gap:10px; padding:4px 14px 4px 6px;">
                    <img src="${avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" alt="User">
                    <span style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${user.name || user.hoTen || 'Tài khoản'}</span>
                </a>
            `;
        } else {
            container.innerHTML = `
                <a href="../public/shop-login.html" class="btn-topbar-pill" style="color:var(--msg-primary); border-color:#bfdbfe; background:#eff6ff;">
                    <i class="fa-solid fa-right-to-bracket"></i>
                    <span>Đăng nhập</span>
                </a>
            `;
        }
        const btnReset = document.getElementById('btn-messenger-reset-chat');
        if (btnReset) {
            btnReset.style.display = this.isLoggedIn() ? 'inline-flex' : 'none';
        }
    },

    switchChannel: function(channel) {
        this.currentChannel = channel;

        const cardAi = document.getElementById('channel-ai');
        const cardPhar = document.getElementById('channel-pharmacist');
        const btnEnd = document.getElementById('btn-end-session');

        if (channel === 'AI') {
            this.stopWaitingTimer();
            if (cardAi) cardAi.classList.add('active');
            if (cardPhar) cardPhar.classList.remove('active');
            if (btnEnd) btnEnd.style.display = 'none';

            document.getElementById('stage-avatar').src = '../../assets/images/aina.png';
            document.getElementById('stage-name').innerText = 'Trợ Lý Dược Sĩ AI (AINA Pharmacy)';
            document.getElementById('stage-status-text').innerText = 'Đang hoạt động • Trực tuyến 24/7';
            document.getElementById('msg-input').placeholder = 'Hỏi đáp về thuốc, triệu chứng, liều dùng... (Nhấn Enter để gửi)';

            this.renderAiChat();
            this.renderAiSuggestions();
        } else {
            if (cardPhar) cardPhar.classList.add('active');
            if (cardAi) cardAi.classList.remove('active');

            document.getElementById('stage-avatar').src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop';
            document.getElementById('stage-name').innerText = this.activePharmacistSession?.nhanVien?.hoTen
                ? `Dược sĩ ${this.activePharmacistSession.nhanVien.hoTen}`
                : 'Dược Sĩ Lâm Sàng AINA';
            document.getElementById('stage-status-text').innerText = this.activePharmacistSession?.trangThai === 'DANG_TU_VAN'
                ? 'Đang kết nối trực tiếp với Dược sĩ'
                : 'Phòng tư vấn trực tuyến chuyên môn';
            document.getElementById('msg-input').placeholder = 'Nhập tin nhắn gửi Dược sĩ hoặc đính kèm ảnh đơn thuốc... (Nhấn Enter để gửi)';

            if (btnEnd) {
                btnEnd.style.display = (this.activePharmacistSession && this.activePharmacistSession.trangThai !== 'KET_THUC') ? 'inline-flex' : 'none';
            }

            this.renderPharmacistChat();
            this.renderPharmacistSuggestions();
        }
    },

    initAiHistory: function() {
        try {
            const saved = localStorage.getItem('aina_messenger_ai_history');
            if (saved) {
                this.aiChatHistory = JSON.parse(saved);
            }
        } catch (e) {
            this.aiChatHistory = [];
        }

        if (!this.aiChatHistory || this.aiChatHistory.length === 0) {
            const user = this.getCurrentUser();
            const name = user ? (user.name || user.hoTen) : 'Quý khách';
            this.aiChatHistory = [
                {
                    role: 'agent',
                    author: 'Trợ lý Dược sĩ AINA',
                    text: `Xin chào **${name}**! Tôi là **Trợ lý Dược sĩ AI của Nhà thuốc AINA** 🤖.\n\nTôi có thể hỗ trợ bạn:\n• Tra cứu công dụng, liều dùng và cách uống của các loại thuốc.\n• Tư vấn sơ bộ về các triệu chứng thông thường (cảm sốt, đau đầu, tiêu hóa, da liễu...).\n• Khuyến cáo tương tác thuốc và lưu ý an toàn y tế.\n\nBạn đang quan tâm đến loại thuốc nào hoặc đang có triệu chứng gì cần tôi hỗ trợ?`,
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                }
            ];
        }
    },

    saveAiHistory: function() {
        try {
            localStorage.setItem('aina_messenger_ai_history', JSON.stringify(this.aiChatHistory.slice(-20)));
        } catch (e) {}
    },

    renderAiChat: function() {
        const stream = document.getElementById('chat-stream');
        if (!stream) return;

        let html = '';
        this.aiChatHistory.forEach(msg => {
            const isUser = msg.role === 'user';
            const parsedContent = this.formatMarkdown(msg.text);
            const avatar = isUser
                ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop'
                : '../../assets/images/aina.png';

            html += `
                <div class="chat-bubble-row ${isUser ? 'user' : 'agent'}">
                    <img src="${avatar}" class="bubble-avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/8687/8687597.png'" alt="Avatar">
                    <div class="bubble-body">
                        <span class="bubble-author">${msg.author || (isUser ? 'Bạn' : 'AINA Assistant')}</span>
                        <div class="bubble-content">
                            ${parsedContent}
                        </div>
                        <span class="bubble-time">${msg.time || ''}</span>
                    </div>
                </div>
            `;
        });

        stream.innerHTML = html;
        stream.scrollTop = stream.scrollHeight;
    },

    renderAiSuggestions: function() {
        const bar = document.getElementById('stage-suggestions');
        if (!bar) return;

        const chips = [
            "👶 Bé bị sốt 38.5 độ nên dùng thuốc gì?",
            "💊 Đau dạ dày, trào ngược uống thuốc nào?",
            "🍊 Vitamin C nên uống lúc nào trong ngày?",
            "⚡ Thuốc Panadol và Hapacol khác nhau thế nào?",
            "🛡️ Đề kháng cho người lớn tuổi"
        ];

        bar.innerHTML = chips.map(c => `
            <div class="suggestion-pill" onclick="MessengerApp.quickAsk('${c.replace(/'/g, "\\'")}')">
                ${c}
            </div>
        `).join('');
    },

    sendAiMessage: async function(question) {
        if (!question) return;

        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        this.aiChatHistory.push({
            role: 'user',
            author: 'Bạn',
            text: question,
            time: timeStr
        });
        this.renderAiChat();

        // Thêm tin nhắn tạm đang suy nghĩ
        const stream = document.getElementById('chat-stream');
        const loadingId = 'ai-loading-' + Date.now();
        const loadingElem = document.createElement('div');
        loadingElem.id = loadingId;
        loadingElem.className = 'chat-bubble-row agent';
        loadingElem.innerHTML = `
            <img src="../../assets/images/aina.png" class="bubble-avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/8687/8687597.png'" alt="AINA">
            <div class="bubble-body">
                <span class="bubble-author">Trợ lý Dược sĩ AINA</span>
                <div class="bubble-content" style="display:flex; align-items:center; gap:8px; color:#64748b; font-style:italic;">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> AINA đang tra cứu dữ liệu dược thư và soạn câu trả lời...
                </div>
            </div>
        `;
        stream.appendChild(loadingElem);
        stream.scrollTop = stream.scrollHeight;

        try {
            const res = await API.post('/api/goi-y-ai/hoi', { cauHoi: question });
            const replyText = res && res.traLoi ? res.traLoi : "Xin lỗi, hiện tôi đang bận tra cứu dữ liệu. Bạn vui lòng thử lại sau giây lát nhé!";

            // Xóa loading bubble
            const el = document.getElementById(loadingId);
            if (el) el.remove();

            this.aiChatHistory.push({
                role: 'agent',
                author: 'Trợ lý Dược sĩ AINA',
                text: replyText,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            });
            this.saveAiHistory();
            this.renderAiChat();
        } catch (error) {
            const el = document.getElementById(loadingId);
            if (el) el.remove();

            this.aiChatHistory.push({
                role: 'agent',
                author: 'Trợ lý Dược sĩ AINA',
                text: "⚠️ Hiện tại hệ thống máy chủ AI đang quá tải hoặc gặp gián đoạn kết nối. Bạn có thể chuyển sang kênh **'Dược Sĩ Lâm Sàng'** bên trái để trò chuyện trực tiếp 1-1 với dược sĩ nhé!",
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            });
            this.saveAiHistory();
            this.renderAiChat();
        }
    },

    checkActivePharmacistSession: async function() {
        if (!this.isLoggedIn()) return;

        try {
            const session = await API.get('/api/tu-van/hien-tai');
            if (session && session.id && session.trangThai !== 'KET_THUC') {
                this.activePharmacistSession = session;
                this.joinSessionRoom(session.id);
                this.updatePharmacistChannelStatus(session.trangThai);
                if (this.currentChannel === 'PHARMACIST') {
                    this.renderPharmacistChat();
                }
            }
        } catch (e) {
            console.warn('Lỗi kiểm tra phiên tư vấn hiện tại:', e);
        }
    },

    updatePharmacistChannelStatus: function(status) {
        const badge = document.getElementById('pharmacist-status-badge');
        const dot = document.getElementById('pharmacist-dot');
        const preview = document.getElementById('preview-pharmacist');

        if (status === 'DANG_TU_VAN') {
            if (badge) { badge.className = 'channel-badge badge-live'; badge.innerText = 'Đang tư vấn'; }
            if (dot) dot.style.background = '#10b981';
            if (preview) preview.innerText = 'Phiên tư vấn trực tuyến đang diễn ra...';
        } else if (status === 'CHO_TU_VAN') {
            if (badge) { badge.className = 'channel-badge badge-ai'; badge.innerText = 'Đang chờ'; }
            if (dot) dot.style.background = '#f59e0b';
            if (preview) preview.innerText = 'Đang đợi Dược sĩ tiếp nhận kết nối...';
        } else {
            if (badge) { badge.className = 'channel-badge badge-live'; badge.innerText = 'Trực tuyến'; }
            if (dot) dot.style.background = '#10b981';
            if (preview) preview.innerText = 'Tư vấn trực tiếp 1-1, đọc ảnh đơn thuốc...';
        }
    },

    requestPharmacistSession: async function() {
        if (!this.isLoggedIn()) {
            App.showToast('Vui lòng đăng nhập tài khoản để kết nối với Dược sĩ!', 'warning');
            setTimeout(() => { window.location.href = '../public/shop-login.html'; }, 1200);
            return;
        }

        try {
            App.showLoading();
            const session = await API.post('/api/tu-van/bat-dau');
            App.hideLoading();

            this.activePharmacistSession = session;
            this.joinSessionRoom(session.id);
            this.updatePharmacistChannelStatus(session.trangThai);
            this.renderPharmacistChat();

            App.showToast('Đã gửi yêu cầu tư vấn! Dược sĩ sẽ tiếp nhận trong giây lát.', 'success');
        } catch (error) {
            App.hideLoading();
            App.showToast(error.message || 'Không thể gửi yêu cầu tư vấn lúc này!', 'error');
        }
    },

    endPharmacistSession: async function() {
        if (!this.activePharmacistSession) return;
        this.stopWaitingTimer();

        const isWaiting = this.activePharmacistSession.trangThai === 'CHO_TU_VAN';
        const msg = isWaiting
            ? 'Bạn có chắc muốn hủy yêu cầu tư vấn này không?'
            : 'Bạn có chắc muốn kết thúc phiên tư vấn này với Dược sĩ không?';

        App.showConfirm(msg, async () => {
            try {
                App.showLoading();
                await API.post('/api/tu-van/khach-hang-ket-thuc');
                App.hideLoading();

                this.activePharmacistSession = null;
                this.updatePharmacistChannelStatus('KET_THUC');
                this.renderPharmacistChat();
                App.showToast('Đã kết thúc phiên tư vấn thành công!', 'info');
            } catch (e) {
                App.hideLoading();
                App.showToast(e.message || 'Lỗi khi kết thúc phiên tư vấn', 'error');
            }
        });
    },

    startWaitingTimer: function() {
        this.stopWaitingTimer();
        if (!this.activePharmacistSession || this.activePharmacistSession.trangThai !== 'CHO_TU_VAN') return;

        const maxSeconds = 300; // 5 phút tối đa chờ Dược sĩ
        const createdTime = new Date(this.activePharmacistSession.taoLuc || Date.now()).getTime();

        const updateTimerDisplay = () => {
            const elapsed = Math.max(0, Math.floor((Date.now() - createdTime) / 1000));
            const timerText = document.getElementById('wait-timer-text');
            const timerBar = document.getElementById('wait-timer-bar');

            if (elapsed >= maxSeconds) {
                this.stopWaitingTimer();
                this.handleWaitingTimeout();
                return;
            }

            const m = Math.floor(elapsed / 60);
            const s = elapsed % 60;
            const strTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            if (timerText) timerText.innerText = strTime;
            if (timerBar) {
                const pct = Math.min(100, Math.round((elapsed / maxSeconds) * 100));
                timerBar.style.width = pct + '%';
            }
        };

        updateTimerDisplay();
        this.waitingTimer = setInterval(updateTimerDisplay, 1000);
    },

    stopWaitingTimer: function() {
        if (this.waitingTimer) {
            clearInterval(this.waitingTimer);
            this.waitingTimer = null;
        }
    },

    handleWaitingTimeout: async function() {
        try {
            await API.post('/api/tu-van/khach-hang-ket-thuc', {
                lyDo: 'Hết thời gian chờ tiếp nhận (Dược sĩ đều đang bận)'
            });
        } catch (e) {}

        this.activePharmacistSession = null;
        this.updatePharmacistChannelStatus('KET_THUC');
        this.renderPharmacistBusyScreen();
    },

    renderPharmacistBusyScreen: function() {
        const stream = document.getElementById('chat-stream');
        if (!stream) return;

        stream.innerHTML = `
            <div class="pharmacist-hero-wait" style="border-color:#fca5a5; background:#fff5f5;">
                <div class="wait-icon-circle" style="background:#fee2e2; color:#ef4444;">
                    <i class="fa-solid fa-user-clock"></i>
                </div>
                <h3 style="font-size:1.25rem; font-weight:800; color:#0f172a; margin:0 0 10px 0;">Dược Sĩ Ca Trực Hiện Đang Bận</h3>
                <p style="font-size:0.92rem; color:#64748b; line-height:1.6; margin:0 0 16px 0; max-width:480px; margin-left:auto; margin-right:auto;">
                    Rất xin lỗi bạn! Đã quá 5 phút nhưng hiện tại tất cả Dược sĩ ca trực đều đang bận hỗ trợ bệnh nhân khác. Phiên chờ đã được tự động kết thúc để tránh bạn phải chờ đợi lâu.
                </p>
                <div style="font-size:0.88rem; color:#475569; background:#fff; padding:10px 16px; border-radius:12px; margin-bottom:20px; display:inline-block; border:1px dashed #fca5a5;">
                    💡 Bạn có thể hỏi ngay <b>Trợ Lý Dược Sĩ AI 24/7</b> (phản hồi tức thì) hoặc thử kết nối lại sau nhé!
                </div>
                <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="MessengerApp.switchChannel('AI')" style="padding:10px 24px; border-radius:24px; font-weight:700;">
                        <i class="fa-solid fa-robot" style="margin-right:6px;"></i> Chat Với Dược Sĩ AI 24/7
                    </button>
                    <button class="btn btn-outline" onclick="MessengerApp.requestPharmacistSession()" style="padding:10px 20px; border-radius:24px; color:#ef4444; border-color:#fca5a5;">
                        <i class="fa-solid fa-rotate-right" style="margin-right:6px;"></i> Thử Kết Nối Lại
                    </button>
                </div>
            </div>
        `;
    },

    renderPharmacistChat: function() {
        const stream = document.getElementById('chat-stream');
        if (!stream) return;

        // Nếu chưa có phiên tư vấn nào đang hoạt động
        if (!this.activePharmacistSession || this.activePharmacistSession.trangThai === 'KET_THUC') {
            this.stopWaitingTimer();
            stream.innerHTML = `
                <div class="pharmacist-hero-wait">
                    <div class="wait-icon-circle">
                        <i class="fa-solid fa-user-doctor"></i>
                    </div>
                    <h3 style="font-size:1.3rem; font-weight:800; color:#0f172a; margin:0 0 10px 0;">Phòng Tư Vấn Trực Tuyến 1-1</h3>
                    <p style="font-size:0.92rem; color:#64748b; line-height:1.6; margin:0 0 24px 0;">
                        Bạn có đơn thuốc cần hướng dẫn sử dụng, thắc mắc về tác dụng phụ hay cần tư vấn kỹ lưỡng từ Dược sĩ có chuyên môn? Hãy bắt đầu phiên trò chuyện trực tiếp ngay bây giờ.
                    </p>
                    <button class="btn btn-primary" onclick="MessengerApp.requestPharmacistSession()" style="padding:12px 28px; border-radius:24px; font-size:0.95rem; font-weight:700; box-shadow:0 4px 15px rgba(37,99,235,0.3);">
                        <i class="fa-solid fa-headset" style="margin-right:8px;"></i> Bắt Đầu Phiên Tư Vấn Với Dược Sĩ
                    </button>
                    <div style="font-size:0.78rem; color:#94a3b8; margin-top:16px;">
                        <i class="fa-solid fa-shield-halved"></i> Miễn phí 100% • Thông tin bảo mật chuẩn y tế
                    </div>
                </div>
            `;
            return;
        }

        // Nếu đang trong trạng thái chờ tiếp nhận
        if (this.activePharmacistSession.trangThai === 'CHO_TU_VAN') {
            stream.innerHTML = `
                <div class="pharmacist-hero-wait" style="border-color:#fde047;">
                    <div class="wait-icon-circle" style="background:#fefce8; color:#ca8a04;">
                        <i class="fa-solid fa-clock-rotate-left fa-spin"></i>
                    </div>
                    <h3 style="font-size:1.25rem; font-weight:800; color:#0f172a; margin:0 0 10px 0;">Đang Đợi Dược Sĩ Tiếp Nhận...</h3>
                    <p style="font-size:0.92rem; color:#64748b; line-height:1.6; margin:0 0 16px 0;">
                        Yêu cầu của bạn đã được chuyển đến màn hình trực của Dược sĩ ca trực. Vui lòng giữ kết nối trong ít phút, Dược sĩ sẽ tiếp nhận và trả lời bạn ngay!
                    </p>
                    <div style="margin-bottom:18px;">
                        <div style="font-size:0.95rem; font-weight:700; color:#ca8a04; margin-bottom:8px;">
                            <i class="fa-regular fa-clock"></i> Đã chờ: <span id="wait-timer-text">00:00</span> / 05:00
                        </div>
                        <div style="width:240px; height:6px; background:#fef08a; border-radius:3px; margin:0 auto; overflow:hidden;">
                            <div id="wait-timer-bar" style="width:0%; height:100%; background:#eab308; transition:width 1s linear;"></div>
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8; margin-top:6px;">
                            (Tự động hủy nếu Dược sĩ bận quá 5 phút)
                        </div>
                    </div>
                    <button class="btn btn-outline" onclick="MessengerApp.endPharmacistSession()" style="color:#ef4444; border-color:#fca5a5;">
                        <i class="fa-solid fa-xmark"></i> Hủy yêu cầu tư vấn
                    </button>
                </div>
            `;
            this.startWaitingTimer();
            return;
        } else {
            this.stopWaitingTimer();
        }

        // Trạng thái đang tư vấn (DANG_TU_VAN)
        const messages = this.activePharmacistSession.tinNhan || [];
        let html = '';

        html += `
            <div style="text-align:center; margin-bottom:16px;">
                <span style="font-size:0.75rem; background:#f1f5f9; padding:4px 14px; border-radius:12px; color:#64748b; font-weight:600;">
                    <i class="fa-solid fa-lock"></i> Phiên tư vấn trực tuyến bắt đầu với Dược sĩ ${this.activePharmacistSession.nhanVien?.hoTen || 'AINA'}
                </span>
            </div>
        `;

        messages.forEach(msg => {
            const isUser = msg.vaiTroGui === 'KHACH_HANG';
            const avatar = isUser
                ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop'
                : 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop';
            const author = isUser ? 'Bạn' : (this.activePharmacistSession.nhanVien?.hoTen || 'Dược sĩ trực');
            const timeStr = msg.taoLuc ? new Date(msg.taoLuc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

            let contentHtml = '';
            if (msg.laHinhAnh) {
                contentHtml = `<img src="${msg.noiDung}" class="msg-attachment-img" onclick="window.open('${msg.noiDung}', '_blank')" alt="Ảnh đơn thuốc">`;
            } else {
                contentHtml = this.formatMarkdown(msg.noiDung);
            }

            html += `
                <div class="chat-bubble-row ${isUser ? 'user' : 'agent'}">
                    <img src="${avatar}" class="bubble-avatar" alt="Avatar">
                    <div class="bubble-body">
                        <span class="bubble-author">${author}</span>
                        <div class="bubble-content">
                            ${contentHtml}
                        </div>
                        <span class="bubble-time">${timeStr}</span>
                    </div>
                </div>
            `;
        });

        stream.innerHTML = html;
        stream.scrollTop = stream.scrollHeight;
    },

    renderPharmacistSuggestions: function() {
        const bar = document.getElementById('stage-suggestions');
        if (!bar) return;

        const chips = [
            "📷 Tôi muốn gửi ảnh đơn thuốc để kiểm tra",
            "💊 Kiểm tra tương tác giữa 2 loại thuốc",
            "👵 Thuốc huyết áp này uống trước hay sau ăn?",
            "🛑 Tôi gặp tác dụng phụ sau khi uống thuốc"
        ];

        bar.innerHTML = chips.map(c => `
            <div class="suggestion-pill" onclick="MessengerApp.quickAsk('${c.replace(/'/g, "\\'")}')">
                ${c}
            </div>
        `).join('');
    },

    sendPharmacistMessage: async function(text, attachment) {
        if (!this.activePharmacistSession || this.activePharmacistSession.trangThai !== 'DANG_TU_VAN') {
            App.showToast('Bạn cần bắt đầu phiên tư vấn trước khi gửi tin nhắn cho Dược sĩ!', 'warning');
            return;
        }

        const phienId = this.activePharmacistSession.id;

        // 1. Gửi ảnh đơn thuốc nếu có
        if (attachment && attachment.base64) {
            try {
                this.appendLocalPharmacistMessage(attachment.base64, true);
                await API.post('/api/tu-van/gui-tin', {
                    phienId,
                    noiDung: attachment.base64,
                    laHinhAnh: true
                });
            } catch (e) {
                console.warn('Lỗi gửi ảnh đơn thuốc:', e);
            }
        }

        // 2. Gửi nội dung văn bản
        if (text) {
            try {
                this.appendLocalPharmacistMessage(text, false);
                await API.post('/api/tu-van/gui-tin', {
                    phienId,
                    noiDung: text,
                    laHinhAnh: false
                });
            } catch (e) {
                console.warn('Lỗi gửi tin nhắn cho dược sĩ:', e);
            }
        }
    },

    appendLocalPharmacistMessage: function(content, isImage) {
        if (!this.activePharmacistSession.tinNhan) {
            this.activePharmacistSession.tinNhan = [];
        }
        this.activePharmacistSession.tinNhan.push({
            vaiTroGui: 'KHACH_HANG',
            noiDung: content,
            laHinhAnh: isImage,
            taoLuc: new Date()
        });
        this.renderPharmacistChat();
    },

    /* ========================================================================
       SOCKET.IO REALTIME EVENTS
       ======================================================================== */
    initSocket: function() {
        if (typeof io !== 'function') {
            setTimeout(() => this.initSocket(), 1000);
            return;
        }

        const backendUrl = (window.__ENV__ && window.__ENV__.BACKEND_URL) || 'http://localhost:4000';
        try {
            this.socket = io(backendUrl, { transports: ['websocket', 'polling'] });

            this.socket.on('connect', () => {
                console.log('✅ Messenger connected to socket server:', this.socket.id);
                if (this.activePharmacistSession && this.activePharmacistSession.id) {
                    this.joinSessionRoom(this.activePharmacistSession.id);
                }
            });

            // Khi Dược sĩ tiếp nhận phiên
            this.socket.on('session_assigned', (data) => {
                if (this.activePharmacistSession && this.activePharmacistSession.id === data.phienId) {
                    this.stopWaitingTimer();
                    this.activePharmacistSession.trangThai = 'DANG_TU_VAN';
                    this.activePharmacistSession.nhanVien = data.nhanVien;
                    this.updatePharmacistChannelStatus('DANG_TU_VAN');
                    App.showToast(`Dược sĩ ${data.nhanVien?.hoTen || ''} đã tiếp nhận phiên tư vấn của bạn!`, 'success');
                    if (this.currentChannel === 'PHARMACIST') {
                        this.renderPharmacistChat();
                    }
                }
            });

            // Khi có tin nhắn mới từ Dược sĩ
            this.socket.on('new_message', (msg) => {
                if (this.activePharmacistSession && this.activePharmacistSession.id === msg.phienId) {
                    if (msg.vaiTroGui !== 'KHACH_HANG') {
                        if (!this.activePharmacistSession.tinNhan) {
                            this.activePharmacistSession.tinNhan = [];
                        }
                        this.activePharmacistSession.tinNhan.push(msg);
                        if (this.currentChannel === 'PHARMACIST') {
                            this.renderPharmacistChat();
                        } else {
                            // Cảnh báo huy hiệu chưa đọc ở kênh Dược sĩ
                            const badge = document.getElementById('pharmacist-status-badge');
                            if (badge) {
                                badge.className = 'channel-badge badge-busy';
                                badge.innerText = 'Tin nhắn mới!';
                            }
                            App.showToast('Bạn có tin nhắn mới từ Dược sĩ!', 'info');
                        }
                    }
                }
            });

            // Khi phiên tư vấn kết thúc từ phía dược sĩ hoặc tự động hết hạn
            this.socket.on('session_status_changed', (data) => {
                this.stopWaitingTimer();
                if (this.activePharmacistSession && data.status === 'KET_THUC') {
                    this.activePharmacistSession = null;
                    this.updatePharmacistChannelStatus('KET_THUC');
                    if (this.currentChannel === 'PHARMACIST') {
                        this.renderPharmacistChat();
                    }
                    App.showToast(data.thongBao || 'Phiên tư vấn với Dược sĩ đã kết thúc.', 'info');
                }
            });

        } catch (e) {
            console.warn('Lỗi kết nối Socket Messenger:', e);
        }
    },

    joinSessionRoom: function(sessionId) {
        if (this.socket && sessionId) {
            this.socket.emit('join_room', sessionId);
        }
    },

    handleKeyDown: function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    },

    sendMessage: function() {
        const input = document.getElementById('msg-input');
        const text = input ? input.value.trim() : '';
        const attachment = this.selectedAttachment;

        if (!text && !attachment) return;

        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }
        this.removeAttachment();

        if (this.currentChannel === 'AI') {
            this.sendAiMessage(text);
        } else {
            this.sendPharmacistMessage(text, attachment);
        }
    },

    quickAsk: function(text) {
        const input = document.getElementById('msg-input');
        if (input) {
            input.value = text;
            this.sendMessage();
        }
    },

    handleFileSelect: function(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            App.showToast('Vui lòng chỉ đính kèm file ảnh đơn thuốc hoặc vỏ thuốc!', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedAttachment = {
                file: file,
                base64: e.target.result
            };
            const bar = document.getElementById('img-preview-bar');
            const thumb = document.getElementById('img-preview-thumb');
            if (bar && thumb) {
                thumb.src = e.target.result;
                bar.style.display = 'flex';
            }
        };
        reader.readAsDataURL(file);
    },

    removeAttachment: function() {
        this.selectedAttachment = null;
        const bar = document.getElementById('img-preview-bar');
        const input = document.getElementById('msg-file-input');
        if (bar) bar.style.display = 'none';
        if (input) input.value = '';
    },

    showConfirmPopup: function(options) {
        let modal = document.getElementById('consultation-custom-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'consultation-custom-confirm-modal';
            modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:999999; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
            document.body.appendChild(modal);
        }

        const title = options.title || 'Bắt đầu cuộc trò chuyện mới?';
        const message = options.message || 'Toàn bộ nội dung trao đổi hiện tại với Trợ lý AI sẽ được làm mới để bắt đầu lại từ đầu.\n\nThao tác này không thể hoàn tác.';
        const confirmText = options.confirmText || 'Làm mới ngay';
        const cancelText = options.cancelText || 'Hủy bỏ';

        modal.innerHTML = `
            <div style="background: white; border-radius: 18px; width: 410px; max-width: 95%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); overflow: hidden; border: 1px solid #e2e8f0; font-family: inherit;">
                <div style="padding: 24px 24px 16px;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 12px;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; border: 1px solid #bfdbfe;">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a;">${title}</h3>
                            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Trợ lý Dược sĩ AINA 24/7</div>
                        </div>
                    </div>
                    <p style="margin: 0; font-size: 0.92rem; color: #475569; line-height: 1.55; white-space: pre-line;">${message}</p>
                </div>
                <div style="padding: 14px 24px 18px; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; border-top: 1px solid #f1f5f9;">
                    <button type="button" id="consultation-confirm-btn-cancel" style="padding: 9px 18px; background: white; color: #475569; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.88rem; transition: all 0.15s;">
                        ${cancelText}
                    </button>
                    <button type="button" id="consultation-confirm-btn-ok" style="padding: 9px 20px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.88rem; box-shadow: 0 4px 12px rgba(37,99,235,0.25); transition: all 0.15s;">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        const btnOk = document.getElementById('consultation-confirm-btn-ok');
        const btnCancel = document.getElementById('consultation-confirm-btn-cancel');

        const closeModal = () => { modal.style.display = 'none'; };

        btnOk.onclick = () => {
            closeModal();
            if (typeof options.onConfirm === 'function') options.onConfirm();
        };

        btnCancel.onclick = () => {
            closeModal();
            if (typeof options.onCancel === 'function') options.onCancel();
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
                if (typeof options.onCancel === 'function') options.onCancel();
            }
        };
    },

    clearOrResetChat: function() {
        if (this.currentChannel === 'AI') {
            this.showConfirmPopup({
                title: 'Bắt đầu cuộc trò chuyện mới?',
                message: 'Toàn bộ nội dung trao đổi hiện tại với Trợ lý AI sẽ được làm mới để bắt đầu lại từ đầu.\n\nThao tác này không thể hoàn tác.',
                confirmText: 'Làm mới ngay',
                cancelText: 'Hủy bỏ',
                onConfirm: () => {
                    localStorage.removeItem('aina_messenger_ai_history');
                    this.initAiHistory();
                    this.renderAiChat();
                    if (window.App && typeof App.showToast === 'function') {
                        App.showToast('Đã bắt đầu cuộc trò chuyện mới!', 'success');
                    }
                }
            });
        } else {
            this.checkActivePharmacistSession();
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Đã làm mới trạng thái phòng tư vấn!', 'info');
            }
        }
    },

    renderCurrentChannel: function() {
        this.switchChannel(this.currentChannel);
    },

    formatMarkdown: function(text) {
        if (!text) return '';
        let clean = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        clean = clean.replace(/\*(.*?)\*/g, '<em>$1</em>');
        clean = clean.replace(/^[•\-\*]\s+(.*)$/gm, '<li>$1</li>');
        clean = clean.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        clean = clean.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

        return `<p>${clean}</p>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    MessengerApp.init();
});
