

var ConsultationApp = window.ConsultationApp = {
    currentTab: 'livechat',

    getCurrentUser: function() {
        let u = (window.Auth && typeof Auth.getCurrentUser === 'function') ? Auth.getCurrentUser() : null;
        if (!u && window.API && typeof API.getCurrentUser === 'function') u = API.getCurrentUser();
        if (!u) {
            try { u = JSON.parse(localStorage.getItem('admin_user') || localStorage.getItem('currentUser') || '{}'); } catch(e) {}
        }
        return u || {};
    },

    isQuanLy: function() {
        const u = this.getCurrentUser();
        const role = String(u.role || u.vaiTro || '').toUpperCase();
        return role === 'QUAN_LY' || role === 'ADMIN';
    },

    init: function() {
        const isQL = this.isQuanLy();

        const btnHist = document.getElementById('tab-btn-history');
        if (btnHist) {
            btnHist.style.display = isQL ? 'inline-flex' : 'none';
        }

        const hash = window.location.hash.replace('#', '');
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');

        if ((hash === 'history' || tabParam === 'history') && isQL) {
            this.switchTab('history');
        } else {
            this.switchTab('livechat');
        }

        LiveChatAdmin.init();
        if (isQL) {
            ConsultationHistory.init();
        }
    },

    switchTab: function(tab) {
        const isQL = this.isQuanLy();

        if (tab === 'history' && !isQL) {
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Chỉ Quản lý mới có quyền truy cập tab Giám sát & Lịch sử tư vấn!', 'warning');
            }
            return;
        }

        this.currentTab = tab;
        const btnLive = document.getElementById('tab-btn-livechat');
        const btnHist = document.getElementById('tab-btn-history');
        const viewLive = document.getElementById('view-livechat');
        const viewHist = document.getElementById('view-history');

        if (tab === 'livechat') {
            if (btnLive) btnLive.classList.add('active');
            if (btnHist) btnHist.classList.remove('active');
            if (viewLive) viewLive.style.display = 'flex';
            if (viewHist) viewHist.style.display = 'none';
            if (window.LiveChatAdmin && typeof LiveChatAdmin.loadSessions === 'function') {
                LiveChatAdmin.loadSessions();
            }
        } else {
            if (btnHist) btnHist.classList.add('active');
            if (btnLive) btnLive.classList.remove('active');
            if (viewHist) viewHist.style.display = 'flex';
            if (viewLive) viewLive.style.display = 'none';
            if (window.ConsultationHistory && typeof ConsultationHistory.loadHistory === 'function') {
                ConsultationHistory.loadHistory();
            }
        }
    }
};

var LiveChatAdmin = window.LiveChatAdmin = {
    socket: null,
    sessions: [],
    currentSession: null,
    currentFilter: 'all',
    selectedImage: null,
    pollTimer: null,

    init: function() {
        this.loadSessions();
        this.ensureSocket();
        this.startPolling();
    },

    loadSocketIO: function(callback) {
        if (window.io) {
            if (callback) callback();
            return;
        }
        const script = document.createElement('script');
        const backendUrl = (window.API && API.baseUrl) ? API.baseUrl : 'http://localhost:4000';
        script.src = `${backendUrl}/socket.io/socket.io.js`;
        script.onload = () => { if (callback) callback(); };
        script.onerror = () => {
            const fallback = document.createElement('script');
            fallback.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            fallback.onload = () => { if (callback) callback(); };
            document.head.appendChild(fallback);
        };
        document.head.appendChild(script);
    },

    ensureSocket: function(callback) {
        this.loadSocketIO(() => {
            if (!this.socket && window.io) {
                const backendUrl = (window.API && API.baseUrl) ? API.baseUrl : 'http://localhost:4000';
                this.socket = io(backendUrl, { transports: ['websocket', 'polling'] });

                this.socket.on("new_notification", (data) => {
                    this.loadSessions(true);
                    if (data && data.type === 'NEW_SESSION') {
                        if (window.App && typeof App.showToast === 'function') {
                            App.showToast('🚨 Có khách hàng mới đang yêu cầu tư vấn!', 'warning');
                        }
                    }
                });

                this.socket.on("receive_message", (msg) => {
                    if (this.currentSession && Number(msg.phienId) === Number(this.currentSession.id)) {
                        if (msg.vaiTroGui !== 'KHACH_HANG') {
                            if (msg.tempId) {
                                const tempEl = document.querySelector(`[data-temp-staff-msg="${msg.tempId}"]`);
                                if (tempEl) {
                                    const statusEl = tempEl.querySelector('.staff-msg-status');
                                    if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-check"></i> Đã gửi';
                                    if (msg.laHinhAnh) {
                                        const imgEl = tempEl.querySelector('img');
                                        if (imgEl && msg.noiDung) {
                                            imgEl.src = msg.noiDung;
                                            tempEl.querySelector('.chat-img-wrap')?.setAttribute('onclick', `LiveChatAdmin.openImageLightbox('${msg.noiDung}')`);
                                        }
                                    }
                                }
                            }
                        } else {
                            this.appendMessage(msg);
                            if (this.isChatActiveAndFocused()) {
                                this.markSessionSeen(msg.phienId);
                            }
                        }
                    }
                    this.loadSessions(true);
                });

                this.socket.on("messages_seen", (data) => {
                    if (this.currentSession && Number(data.phienId) === Number(this.currentSession.id)) {
                        if (data && data.vaiTro === 'KHACH_HANG') {
                            const statuses = document.querySelectorAll('#livechat-messages .staff-msg-status');
                            statuses.forEach(st => {
                                st.innerHTML = '<i class="fa-solid fa-check-double" style="color:#bfdbfe;"></i> Đã xem';
                                st.style.color = '#dbeafe';
                                st.style.fontWeight = '600';
                            });
                        }
                    }
                });

                this.socket.on("session_status_changed", (data) => {
                    this.loadSessions(true);
                    if (data && this.currentSession && Number(data.phienId) === Number(this.currentSession.id)) {
                        if (data.status === 'KET_THUC') {
                            this.closeChatBox();
                            if (window.App && typeof App.showToast === 'function') {
                                App.showToast('Phiên tư vấn hiện tại đã kết thúc.', 'info');
                            }
                        }
                    }
                });
            }
            if (callback) callback();
        });
    },

    startPolling: function() {
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(() => {
            this.loadSessions(true);
        }, 4000);
    },

    setFilter: function(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.livechat-filter-btn').forEach(btn => btn.classList.remove('active'));
        if (filter === 'all') {
            document.getElementById('lc-filter-all')?.classList.add('active');
        } else if (filter === 'CHO_TU_VAN') {
            document.getElementById('lc-filter-waiting')?.classList.add('active');
        } else if (filter === 'DANG_TU_VAN') {
            document.getElementById('lc-filter-active')?.classList.add('active');
        }
        this.renderSessionList();
    },

    loadSessions: async function(silent = false) {
        try {
            const list = await API.get('/api/tu-van/danh-sach');
            this.sessions = list || [];
            this.updateBadgeCounts();
            this.renderSessionList();

            if (this.currentSession) {
                const refreshed = this.sessions.find(s => s.id === this.currentSession.id);
                if (refreshed) {
                    this.currentSession = refreshed;
                } else {
                    this.closeChatBox();
                }
            }
        } catch (e) {
            if (!silent) console.warn('Lỗi tải danh sách phiên tư vấn:', e);
        }
    },

    updateBadgeCounts: function() {
        const waitingSessions = this.sessions.filter(s => s.trangThai === 'CHO_TU_VAN');
        const count = waitingSessions.length;

        const mainBadge = document.getElementById('badge-pending-sessions');
        if (mainBadge) {
            mainBadge.innerText = count;
            mainBadge.style.display = count > 0 ? 'inline-block' : 'none';
        }

        const pillCount = document.getElementById('lc-count-waiting');
        if (pillCount) pillCount.innerText = count;
    },

    getCurrentUser: function() {
        return ConsultationApp.getCurrentUser();
    },

    checkSessionPermission: function(session) {
        if (!session) return { isWaiting: false, isMine: false, isAdmin: false, canView: false, canChat: false, staffName: 'Dược sĩ' };

        const u = this.getCurrentUser();
        const role = String(u.role || u.vaiTro || '').toUpperCase();
        const isAdmin = role === 'QUAN_LY' || role === 'ADMIN';

        const myId = Number(u.id);
        const sessionStaffId = Number(session.nhanVienId || session.nhanVien?.id);

        const myName = String(u.name || u.hoTen || '').trim().toLowerCase();
        const sessionStaffName = String(session.nhanVien?.hoTen || '').trim().toLowerCase();

        const isMine = Boolean(
            (sessionStaffId && myId && sessionStaffId === myId) ||
            (sessionStaffName && myName && sessionStaffName === myName)
        );
        const isWaiting = session.trangThai === 'CHO_TU_VAN';

        const canView = isWaiting || isMine || isAdmin;
        const canChat = (isMine || isAdmin) && !isWaiting;

        return {
            isWaiting,
            isMine,
            isAdmin,
            canView,
            canChat,
            staffName: session.nhanVien?.hoTen || 'Dược sĩ phụ trách'
        };
    },

    renderSessionList: function() {
        const container = document.getElementById('livechat-session-list');
        if (!container) return;

        let filtered = this.sessions;
        if (this.currentFilter === 'CHO_TU_VAN') {
            filtered = this.sessions.filter(s => s.trangThai === 'CHO_TU_VAN');
        } else if (this.currentFilter === 'DANG_TU_VAN') {
            filtered = this.sessions.filter(s => s.trangThai === 'DANG_TU_VAN');
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:35px 10px; color:var(--text-muted); font-size:0.85rem;">
                    <i class="fa-solid fa-inbox" style="font-size:1.8rem; margin-bottom:8px; display:block; opacity:0.5;"></i>
                    Không có phiên tư vấn nào
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(s => {
            const isSelected = this.currentSession && this.currentSession.id === s.id;
            const perm = this.checkSessionPermission(s);
            const clientName = s.khachHang?.hoTen || `Khách hàng #${s.khachHangId}`;
            const phone = s.khachHang?.soDienThoai || '';
            const lastMsg = s.tinNhan && s.tinNhan.length > 0 ? s.tinNhan[0].noiDung : (perm.isWaiting ? 'Khách đang đợi kết nối...' : 'Chưa có tin nhắn');
            const timeAgo = this.formatTimeAgo(s.capNhatLuc || s.taoLuc);

            let staffBadge = '';
            let borderStyle = 'border-left: 4px solid #10b981; background: white;';

            if (perm.isWaiting) {
                staffBadge = '<span class="badge" style="background:#fef3c7; color:#b45309; padding:2px 6px;">Đang chờ duyệt</span>';
                borderStyle = 'border-left: 4px solid #f59e0b; background: #fffbeb;';
            } else if (perm.isMine) {
                staffBadge = '<span class="badge" style="background:#dcfce7; color:#15803d; padding:2px 6px;"><i class="fa-solid fa-user-doctor"></i> Tôi phụ trách</span>';
                borderStyle = isSelected ? 'border-left: 4px solid var(--primary-color); background: #eff6ff;' : 'border-left: 4px solid #10b981; background: white;';
            } else if (perm.isAdmin) {
                staffBadge = `<span class="badge" style="background:#e0f2fe; color:#0369a1; padding:2px 6px;"><i class="fa-solid fa-user-shield"></i> DS ${perm.staffName}</span>`;
                borderStyle = isSelected ? 'border-left: 4px solid var(--primary-color); background: #eff6ff;' : 'border-left: 4px solid #0284c7; background: white;';
            } else {
                staffBadge = `<span class="badge" style="background:#fee2e2; color:#b91c1c; padding:2px 6px;"><i class="fa-solid fa-lock" style="font-size:0.68rem;"></i> DS ${perm.staffName}</span>`;
                borderStyle = isSelected ? 'border-left: 4px solid #ef4444; background: #fef2f2;' : 'border-left: 4px solid #fca5a5; background: #fffafb;';
            }

            html += `
                <div class="card" style="margin-bottom:0; padding:12px; cursor:pointer; border-radius:10px; transition:transform 0.15s, box-shadow 0.15s; ${borderStyle}" onclick="LiveChatAdmin.selectSession(${s.id})">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                        <div style="font-weight:700; font-size:0.92rem; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                            ${clientName}
                        </div>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${timeAgo}</span>
                    </div>

                    <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:6px;">
                        ${phone ? `<i class="fa-solid fa-phone" style="font-size:0.7rem;"></i> ${phone} &bull; ` : ''}
                        ${staffBadge}
                    </div>

                    <div style="font-size:0.8rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:8px;">
                        ${lastMsg}
                    </div>

                    ${perm.isWaiting ? `
                        <button class="btn btn-primary btn-sm" style="width:100%; font-size:0.8rem; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; gap:6px;" onclick="event.stopPropagation(); LiveChatAdmin.acceptSession(${s.id})">
                            <i class="fa-solid fa-headset"></i> Tiếp nhận tư vấn
                        </button>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    selectSession: async function(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        this.currentSession = session;
        this.renderSessionList();

        const emptyState = document.getElementById('livechat-empty-state');
        const chatBox = document.getElementById('livechat-chat-box');
        if (emptyState) emptyState.style.display = 'none';
        if (chatBox) chatBox.style.display = 'flex';

        const clientName = session.khachHang?.hoTen || `Khách hàng #${session.khachHangId}`;
        const nameEl = document.getElementById('lc-client-name');
        if (nameEl) nameEl.innerText = clientName;

        const avatarEl = document.getElementById('lc-client-avatar');
        if (avatarEl) avatarEl.innerText = clientName.charAt(0).toUpperCase();

        const phoneEl = document.getElementById('lc-client-phone');
        if (phoneEl) phoneEl.innerText = session.khachHang?.soDienThoai || 'Chưa cập nhật SĐT';

        const staffEl = document.getElementById('lc-staff-name');
        if (staffEl) {
            staffEl.innerText = session.nhanVien?.hoTen || (session.trangThai === 'CHO_TU_VAN' ? 'Chưa tiếp nhận' : 'Dược sĩ trực quầy');
        }

        const badgeEl = document.getElementById('lc-client-badge');
        if (badgeEl) {
            if (session.trangThai === 'CHO_TU_VAN') {
                badgeEl.className = 'badge badge-warning';
                badgeEl.innerText = 'Chờ tiếp nhận';
            } else {
                badgeEl.className = 'badge badge-success';
                badgeEl.innerText = 'Đang tư vấn';
            }
        }

        const perm = this.checkSessionPermission(session);

        const btnAccept = document.getElementById('lc-btn-accept');
        const btnEnd = document.getElementById('lc-btn-end');
        const supervisorBanner = document.getElementById('lc-supervisor-banner');
        const supervisorStaffName = document.getElementById('lc-supervisor-staff-name');
        const lockedState = document.getElementById('livechat-locked-state');
        const lockStaffName = document.getElementById('lc-lock-staff-name');
        const waitingState = document.getElementById('livechat-waiting-state');
        const activeChatArea = document.getElementById('livechat-active-chat-area');
        const inputArea = document.getElementById('livechat-input-area');

        if (supervisorBanner) supervisorBanner.style.display = 'none';
        if (lockedState) lockedState.style.display = 'none';
        if (waitingState) waitingState.style.display = 'none';
        if (activeChatArea) activeChatArea.style.display = 'none';
        if (btnAccept) btnAccept.style.display = 'none';
        if (btnEnd) btnEnd.style.display = 'none';

        if (perm.isWaiting) {
            if (waitingState) waitingState.style.display = 'flex';
            if (btnAccept) btnAccept.style.display = 'inline-flex';
            return;
        }

        if (!perm.canView) {
            if (lockedState) lockedState.style.display = 'flex';
            if (lockStaffName) lockStaffName.innerText = perm.staffName;
            return;
        }

        if (activeChatArea) activeChatArea.style.display = 'flex';
        if (inputArea) inputArea.style.display = 'flex';
        if (btnEnd) btnEnd.style.display = 'inline-flex';

        if (perm.isAdmin && !perm.isMine) {
            if (supervisorBanner) {
                supervisorBanner.style.display = 'flex';
                if (supervisorStaffName) supervisorStaffName.innerText = perm.staffName;
            }
        }

        const input = document.getElementById('livechat-input');
        if (input) {
            input.disabled = false;
            input.onfocus = () => this.handleInputInteraction();
            input.onclick = () => this.handleInputInteraction();
            input.oninput = () => this.handleInputInteraction();
        }

        const msgContainer = document.getElementById('livechat-messages');
        if (msgContainer) {
            msgContainer.onclick = () => this.handleInputInteraction();
        }

        this.ensureSocket(() => {
            if (this.socket) {
                this.socket.emit("join_room", sessionId);
            }
        });

        try {
            const msgs = await API.get(`/api/tu-van/lich-su/${sessionId}`);
            this.renderMessages(msgs || []);
        } catch (e) {
            console.error('Lỗi tải tin nhắn:', e);
            this.renderMessages([]);
        }
    },

    acceptSession: async function(sessionId) {
        try {
            if (window.App && typeof App.showLoading === 'function') App.showLoading();
            await API.post(`/api/tu-van/nhan-phien/${sessionId}`);
            if (window.App && typeof App.hideLoading === 'function') App.hideLoading();

            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Đã tiếp nhận phiên tư vấn thành công!', 'success');
            }

            await this.loadSessions();
            this.selectSession(sessionId);
        } catch (e) {
            if (window.App && typeof App.hideLoading === 'function') App.hideLoading();
            if (window.App && typeof App.showToast === 'function') {
                App.showToast(e.message || 'Không thể tiếp nhận phiên!', 'error');
            }
        }
    },

    formatMsgTime: function(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    },

    openImageLightbox: function(src) {
        if (!src) return;
        const lb = document.getElementById('consult-chat-lightbox');
        const img = document.getElementById('consult-lightbox-img');
        if (lb && img) {
            img.src = src;
            lb.style.display = 'flex';
        }
    },

    handleImageSelected: function(e) {
        const file = e.target?.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            if (window.App && typeof App.showToast === 'function') App.showToast('Vui lòng chỉ chọn tệp hình ảnh!', 'warning');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            if (window.App && typeof App.showToast === 'function') App.showToast('Kích thước ảnh không được vượt quá 10MB!', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            this.selectedImage = { file, base64, name: file.name };
            
            const previewWrap = document.getElementById('livechat-image-preview');
            const previewImg = document.getElementById('livechat-preview-img');
            const previewName = document.getElementById('livechat-preview-name');
            if (previewImg) previewImg.src = base64;
            if (previewName) previewName.innerText = file.name;
            if (previewWrap) previewWrap.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    },

    cancelImage: function() {
        this.selectedImage = null;
        const fileInput = document.getElementById('livechat-file-input');
        if (fileInput) fileInput.value = '';
        const previewWrap = document.getElementById('livechat-image-preview');
        if (previewWrap) previewWrap.style.display = 'none';
    },

    isChatActiveAndFocused: function() {
        if (!this.currentSession || document.hidden) return false;
        const input = document.getElementById('livechat-input');
        return Boolean(input && document.activeElement === input);
    },

    handleInputInteraction: function() {
        if (!this.currentSession || !this.currentSession.id) return;
        const perm = this.checkSessionPermission(this.currentSession);
        if (!perm.canView) return;
        this.markSessionSeen(this.currentSession.id);
    },

    markSessionSeen: function(phienId) {
        if (!phienId) return;
        this.ensureSocket(() => {
            if (this.socket) {
                this.socket.emit("mark_seen", { phienId: Number(phienId), vaiTro: 'NHAN_VIEN' });
            }
        });
        if (window.API) {
            API.post(`/api/tu-van/da-xem/${phienId}`).catch(() => {});
        }
    },

    buildMessageHtml: function(m) {
        const isStaff = m.vaiTroGui !== 'KHACH_HANG';
        const timeStr = this.formatMsgTime(m.taoLuc || new Date());
        const tempAttr = m.tempId ? `data-temp-staff-msg="${m.tempId}"` : '';

        let statusHtml = '';
        if (isStaff) {
            if (m.status === 'sending') {
                statusHtml = `<span class="staff-msg-status" style="display:inline-flex; align-items:center; gap:3px; opacity:0.8; font-size:0.68rem;"><i class="fa-regular fa-clock fa-spin"></i> Đang gửi</span>`;
            } else if (m.daXem) {
                statusHtml = `<span class="staff-msg-status" style="display:inline-flex; align-items:center; gap:3px; color:#dbeafe; font-weight:600; font-size:0.68rem;"><i class="fa-solid fa-check-double" style="color:#bfdbfe;"></i> Đã xem</span>`;
            } else {
                statusHtml = `<span class="staff-msg-status" style="display:inline-flex; align-items:center; gap:3px; opacity:0.85; font-size:0.68rem;"><i class="fa-solid fa-check"></i> Đã gửi</span>`;
            }
        }

        const style = isStaff
            ? 'align-self:flex-end; background:linear-gradient(135deg, #3b82f6, #2563eb); color:white; border-top-right-radius:4px; box-shadow:0 3px 8px rgba(37,99,235,0.25);'
            : 'align-self:flex-start; background:white; color:#1e293b; border:1px solid #e2e8f0; border-top-left-radius:4px; box-shadow:0 2px 6px rgba(0,0,0,0.04);';
        
        const senderLabel = isStaff
            ? `<div style="font-size:0.72rem; color:#bfdbfe; font-weight:600; margin-bottom:3px; text-align:right;">Tôi (Dược sĩ)</div>`
            : `<div style="font-size:0.72rem; color:#64748b; font-weight:600; margin-bottom:3px;"><i class="fa-solid fa-user"></i> Khách hàng</div>`;

        let contentHtml = '';
        if (m.laHinhAnh) {
            contentHtml = `
                <div class="chat-img-wrap" style="margin-bottom:4px; cursor:zoom-in; border-radius:10px; overflow:hidden;" onclick="LiveChatAdmin.openImageLightbox('${m.noiDung}')">
                    <img src="${m.noiDung}" alt="Hình ảnh" style="max-width:220px; max-height:220px; object-fit:cover; display:block; border-radius:10px; border:1px solid rgba(0,0,0,0.1);">
                </div>
            `;
        } else {
            contentHtml = `<div style="word-break:break-word;">${m.noiDung}</div>`;
        }

        return `
            <div ${tempAttr} style="padding:10px 14px; border-radius:16px; max-width:80%; font-size:0.92rem; line-height:1.45; ${style}">
                ${senderLabel}
                ${contentHtml}
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:5px; font-size:0.68rem; margin-top:4px; opacity:0.85;">
                    <span>${timeStr}</span>
                    ${statusHtml}
                </div>
            </div>
        `;
    },

    renderMessages: function(messages) {
        const container = document.getElementById('livechat-messages');
        if (!container) return;

        let html = '';
        messages.forEach(m => {
            html += this.buildMessageHtml(m);
        });

        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    },

    appendMessage: function(m) {
        const container = document.getElementById('livechat-messages');
        if (!container) return;

        const msgHtml = this.buildMessageHtml(m);
        container.insertAdjacentHTML('beforeend', msgHtml);
        container.scrollTop = container.scrollHeight;
    },

    sendMessage: async function() {
        if (!this.currentSession) return;

        const perm = this.checkSessionPermission(this.currentSession);
        if (!perm.canChat) {
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Bạn không có quyền gửi tin nhắn vào phiên tư vấn của dược sĩ khác!', 'warning');
            }
            return;
        }

        const input = document.getElementById('livechat-input');
        const text = input ? input.value.trim() : '';
        const hasImage = Boolean(this.selectedImage);

        if (!text && !hasImage) return;

        const phienId = this.currentSession.id;
        const tempImage = this.selectedImage;

        if (input) input.value = '';
        this.cancelImage();

        if (hasImage && tempImage) {
            const tempIdImg = 'temp_staff_img_' + Date.now();
            this.appendMessage({
                phienId,
                vaiTroGui: 'NHAN_VIEN',
                noiDung: tempImage.base64,
                laHinhAnh: true,
                status: 'sending',
                tempId: tempIdImg,
                taoLuc: new Date()
            });

            API.post('/api/tu-van/gui-tin', {
                phienId,
                noiDung: tempImage.base64,
                laHinhAnh: true,
                tempId: tempIdImg
            }).catch(e => {
                console.warn('Lỗi gửi ảnh qua HTTP:', e);
                if (window.App && typeof App.showToast === 'function') {
                    App.showToast(e.message || 'Lỗi gửi hình ảnh!', 'error');
                }
            });
        }

        if (text) {
            const tempIdText = 'temp_staff_txt_' + Date.now();
            this.appendMessage({
                phienId,
                vaiTroGui: 'NHAN_VIEN',
                noiDung: text,
                laHinhAnh: false,
                status: 'sending',
                tempId: tempIdText,
                taoLuc: new Date()
            });

            API.post('/api/tu-van/gui-tin', {
                phienId,
                noiDung: text,
                laHinhAnh: false,
                tempId: tempIdText
            }).catch(e => {
                console.warn('Lỗi gửi tin qua HTTP:', e);
                if (window.App && typeof App.showToast === 'function') {
                    App.showToast(e.message || 'Lỗi gửi tin nhắn!', 'error');
                }
            });
        }
    },

    acceptSession: async function(sessionId) {
        const id = sessionId || this.currentSession?.id;
        if (!id) return;
        try {
            await API.post(`/api/tu-van/nhan-phien/${id}`);
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Bạn đã tiếp nhận phiên tư vấn thành công!', 'success');
            }
            await this.loadSessions();
            this.selectSession(id);
        } catch (e) {
            if (window.App && typeof App.showToast === 'function') {
                App.showToast(e.message || 'Không thể tiếp nhận phiên tư vấn!', 'error');
            }
        }
    },

    endCurrentSession: function() {
        if (!this.currentSession) return;

        const perm = this.checkSessionPermission(this.currentSession);
        if (!perm.canChat) {
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Bạn không có quyền kết thúc phiên tư vấn của dược sĩ khác!', 'warning');
            }
            return;
        }

        this.openEndModal();
    },

    openEndModal: function() {
        const modal = document.getElementById('modal-end-session');
        if (!modal || !this.currentSession) return;

        const custNameEl = document.getElementById('modal-end-customer-name');
        const sessIdEl = document.getElementById('modal-end-session-id');
        const reasonSelect = document.getElementById('modal-end-reason-select');
        const customWrap = document.getElementById('modal-end-custom-wrap');
        const customInput = document.getElementById('modal-end-custom-input');
        const extraNotes = document.getElementById('modal-end-extra-notes');
        const submitBtn = document.getElementById('btn-submit-end-session');

        const clientName = this.currentSession.khachHang?.hoTen || `Khách hàng #${this.currentSession.khachHangId}`;
        if (custNameEl) custNameEl.innerText = clientName;
        if (sessIdEl) sessIdEl.innerText = `#${this.currentSession.id}`;

        if (reasonSelect) reasonSelect.value = "Đã hoàn thành phiên tư vấn";
        if (customWrap) customWrap.style.display = 'none';
        if (customInput) customInput.value = '';
        if (extraNotes) extraNotes.value = '';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Xác nhận kết thúc';
        }

        modal.style.display = 'flex';
        modal.classList.add('active');
    },

    closeEndModal: function() {
        const modal = document.getElementById('modal-end-session');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    },

    onEndReasonChange: function(value) {
        const customWrap = document.getElementById('modal-end-custom-wrap');
        const customInput = document.getElementById('modal-end-custom-input');
        if (customWrap) {
            if (value === 'KHAC') {
                customWrap.style.display = 'block';
                if (customInput) customInput.focus();
            } else {
                customWrap.style.display = 'none';
            }
        }
    },

    submitEndSession: async function() {
        if (!this.currentSession) return;
        const reasonSelect = document.getElementById('modal-end-reason-select');
        const customInput = document.getElementById('modal-end-custom-input');
        const extraNotes = document.getElementById('modal-end-extra-notes');
        const submitBtn = document.getElementById('btn-submit-end-session');

        let selectedReason = reasonSelect ? reasonSelect.value : '';
        if (selectedReason === 'KHAC') {
            const customVal = customInput ? customInput.value.trim() : '';
            if (!customVal) {
                if (window.App && typeof App.showToast === 'function') {
                    App.showToast('Vui lòng nhập lý do kết thúc phiên tư vấn!', 'warning');
                }
                if (customInput) customInput.focus();
                return;
            }
            selectedReason = customVal;
        }

        const extra = extraNotes ? extraNotes.value.trim() : '';
        const finalReason = extra ? `${selectedReason} (Ghi chú: ${extra})` : selectedReason;

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kết thúc...';
            }

            await API.post(`/api/tu-van/ket-thuc/${this.currentSession.id}`, {
                lyDo: finalReason
            });

            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Đã kết thúc phiên tư vấn thành công.', 'success');
            }

            this.closeEndModal();
            this.closeChatBox();
            this.loadSessions();
            if (window.ConsultationHistory && typeof ConsultationHistory.loadHistory === 'function') {
                ConsultationHistory.loadHistory();
            }
        } catch (e) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Xác nhận kết thúc';
            }
            if (window.App && typeof App.showToast === 'function') {
                App.showToast(e.message || 'Không thể đóng phiên tư vấn!', 'error');
            }
        }
    },

    closeChatBox: function() {
        this.currentSession = null;
        const emptyState = document.getElementById('livechat-empty-state');
        const chatBox = document.getElementById('livechat-chat-box');
        if (emptyState) emptyState.style.display = 'flex';
        if (chatBox) chatBox.style.display = 'none';
        this.renderSessionList();
    },

    formatTimeAgo: function(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const diffMs = Date.now() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return d.toLocaleDateString('vi-VN');
    }
};

/* =========================================================================
   MODULE 2: CONSULTATION HISTORY & SUPERVISION (GIÁM SÁT DƯỢC SĨ)
   ========================================================================= */
var ConsultationHistory = window.ConsultationHistory = {
    filters: {
        tuKhoa: '',
        ngay: '',
        coAnh: '',
        page: 1,
        limit: 10
    },
    total: 0,
    historyList: [],

    init: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        const searchInput = document.getElementById('history-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filters.tuKhoa = e.target.value.trim();
                    this.filters.page = 1;
                    this.loadHistory();
                }, 400);
            });
        }

        const dateFilter = document.getElementById('history-date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.filters.ngay = e.target.value;
                this.filters.page = 1;
                this.loadHistory();
            });
        }

        const photoFilter = document.getElementById('history-photo-filter');
        if (photoFilter) {
            photoFilter.addEventListener('change', (e) => {
                this.filters.coAnh = e.target.value;
                this.filters.page = 1;
                this.loadHistory();
            });
        }
    },

    resetFilters: function() {
        this.filters.tuKhoa = '';
        this.filters.ngay = '';
        this.filters.coAnh = '';
        this.filters.page = 1;
        this.filters.limit = 10;

        const s = document.getElementById('history-search-input');
        if (s) s.value = '';
        const d = document.getElementById('history-date-filter');
        if (d) d.value = '';
        const p = document.getElementById('history-photo-filter');
        if (p) p.value = '';
        const sizeSelect = document.getElementById('history-page-size');
        if (sizeSelect) sizeSelect.value = '10';

        this.loadHistory();
    },

    changePageSize: function(newLimit) {
        this.filters.limit = Number(newLimit) || 10;
        this.filters.page = 1;
        this.loadHistory();
    },

    goToPage: function(pageNum) {
        const totalPages = Math.ceil(this.total / this.filters.limit) || 1;
        if (pageNum < 1 || pageNum > totalPages) return;
        this.filters.page = pageNum;
        this.loadHistory();
    },

    loadHistory: async function() {
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Đang tải lịch sử tư vấn...
                </td>
            </tr>
        `;

        try {
            const queryParams = new URLSearchParams({
                page: this.filters.page,
                limit: this.filters.limit,
                tuKhoa: this.filters.tuKhoa,
                ngay: this.filters.ngay,
                coAnh: this.filters.coAnh
            });

            const res = await API.get(`/api/tu-van/tat-ca-lich-su?${queryParams.toString()}`);
            this.historyList = res.danhSach || [];
            this.total = res.tongCong || 0;

            if (res.thongKe) {
                const statTong = document.getElementById('stat-history-tong');
                if (statTong) statTong.innerText = res.thongKe.tongPhien || 0;

                const statHomNay = document.getElementById('stat-history-hom-nay');
                if (statHomNay) statHomNay.innerText = res.thongKe.phienHomNay || 0;

                const statCoAnh = document.getElementById('stat-history-co-anh');
                if (statCoAnh) statCoAnh.innerText = res.thongKe.phienCoAnh || 0;
            }

            this.renderTable();
            this.updatePagination(res.hasMore);
        } catch (e) {
            console.error('Lỗi tải lịch sử:', e);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px; color: #ef4444;">
                        <i class="fa-solid fa-circle-exclamation" style="margin-right: 6px;"></i> Không thể tải lịch sử tư vấn: ${e.message}
                    </td>
                </tr>
            `;
        }
    },

    renderTable: function() {
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;

        if (this.historyList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                        Không tìm thấy phiên tư vấn nào phù hợp với bộ lọc
                    </td>
                </tr>
            `;
            return;
        }

        const user = Auth.getCurrentUser();
        const isQuanLy = user && (user.role === 'QUAN_LY' || user.role === 'ADMIN');

        let html = '';
        this.historyList.forEach(s => {
            const clientName = s.khachHang?.hoTen || `Khách hàng #${s.khachHangId}`;
            const clientPhone = s.khachHang?.soDienThoai ? `<span style="font-size: 0.78rem; color: var(--text-muted); display: block;"><i class="fa-solid fa-phone" style="font-size:0.7rem;"></i> ${s.khachHang.soDienThoai}</span>` : '';
            const staffName = s.nhanVien?.hoTen ? `<span style="font-weight: 600; color: #0369a1;"><i class="fa-solid fa-user-doctor text-primary"></i> ${s.nhanVien.hoTen}</span>` : '<span style="color: var(--text-muted); font-style: italic;">Chưa gán</span>';
            const startTime = s.taoLuc ? new Date(s.taoLuc).toLocaleString('vi-VN') : '—';
            const msgCount = s._count?.tinNhan || 0;
            const note = s.ghiChu || 'Đã hoàn tất tư vấn';

            html += `
                <tr>
                    <td><strong>#${s.id}</strong></td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary);">${clientName}</div>
                        ${clientPhone}
                    </td>
                    <td>${staffName}</td>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">${startTime}</td>
                    <td>
                        <span class="badge" style="background: #e2e8f0; color: #334155;">${msgCount} tin nhắn</span>
                    </td>
                    <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem; color: var(--text-secondary);" title="${note}">
                        ${note}
                    </td>
                    <td style="text-align: right;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end;">
                            <button class="btn btn-sm btn-outline text-primary" title="Xem chi tiết toàn bộ đoạn chat" onclick="ConsultationHistory.viewTranscript(${s.id})" style="padding: 4px 10px; font-size: 0.78rem; border-radius: 6px;">
                                <i class="fa-solid fa-eye"></i> Xem chat
                            </button>
                            ${isQuanLy ? `
                                <button class="btn btn-sm btn-outline text-danger" title="Xóa phiên tư vấn" onclick="ConsultationHistory.deleteSession(${s.id})" style="padding: 4px 8px; font-size: 0.78rem; border-radius: 6px;">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    updatePagination: function(hasMore) {
        const info = document.getElementById('history-pagination-info');
        const btnPrev = document.getElementById('history-btn-prev');
        const btnNext = document.getElementById('history-btn-next');
        const pageNumbersContainer = document.getElementById('history-page-numbers');

        const totalPages = Math.ceil(this.total / this.filters.limit) || 1;
        const currentPage = this.filters.page;

        if (info) {
            const start = this.total === 0 ? 0 : (currentPage - 1) * this.filters.limit + 1;
            const end = Math.min(currentPage * this.filters.limit, this.total);
            info.innerHTML = `Hiển thị <strong>${start} - ${end}</strong> trên tổng số <strong>${this.total}</strong> phiên`;
        }

        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages;

        if (pageNumbersContainer) {
            let html = '';
            const maxVisible = 5;
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
            if (endPage - startPage < maxVisible - 1) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }

            if (startPage > 1) {
                html += `<button class="btn btn-sm btn-outline" style="padding:3px 8px; font-size:0.8rem; border-radius:6px; min-width:30px; background:white; color:var(--text-secondary);" onclick="ConsultationHistory.goToPage(1)">1</button>`;
                if (startPage > 2) {
                    html += `<span style="padding:0 3px; color:var(--text-muted); font-size:0.8rem;">...</span>`;
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                const isActive = i === currentPage;
                const activeStyle = isActive 
                    ? 'background:var(--primary-color); color:white; border-color:var(--primary-color); font-weight:700;' 
                    : 'background:white; color:var(--text-secondary);';
                html += `<button class="btn btn-sm btn-outline" style="padding:3px 8px; font-size:0.8rem; border-radius:6px; min-width:30px; ${activeStyle}" onclick="ConsultationHistory.goToPage(${i})">${i}</button>`;
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span style="padding:0 3px; color:var(--text-muted); font-size:0.8rem;">...</span>`;
                }
                html += `<button class="btn btn-sm btn-outline" style="padding:3px 8px; font-size:0.8rem; border-radius:6px; min-width:30px; background:white; color:var(--text-secondary);" onclick="ConsultationHistory.goToPage(${totalPages})">${totalPages}</button>`;
            }

            pageNumbersContainer.innerHTML = html;
        }
    },

    prevPage: function() {
        if (this.filters.page > 1) {
            this.filters.page--;
            this.loadHistory();
        }
    },

    nextPage: function() {
        const totalPages = Math.ceil(this.total / this.filters.limit) || 1;
        if (this.filters.page < totalPages) {
            this.filters.page++;
            this.loadHistory();
        }
    },

    viewTranscript: async function(sessionId) {
        const modal = document.getElementById('modal-transcript');
        const titleEl = document.getElementById('transcript-modal-title');
        const subEl = document.getElementById('transcript-modal-sub');
        const bodyEl = document.getElementById('transcript-modal-body');
        const noteEl = document.getElementById('transcript-modal-note');

        const session = this.historyList.find(s => s.id === sessionId);
        const clientName = session?.khachHang?.hoTen || `Khách hàng #${sessionId}`;

        if (titleEl) titleEl.innerText = `Lịch Sử Phiên Tư Vấn #${sessionId}`;
        if (subEl) subEl.innerText = `Khách hàng: ${clientName}`;
        
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }

        if (bodyEl) {
            bodyEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px; display: block; color: var(--primary-color);"></i>
                    Đang nạp toàn bộ cuộc hội thoại...
                </div>
            `;
        }

        try {
            if (noteEl) {
                noteEl.innerText = session?.ghiChu ? `Lý do kết thúc / ghi chú: ${session.ghiChu}` : 'Không có ghi chú thêm.';
            }

            const res = await API.get(`/api/tu-van/lich-su/${sessionId}`);
            const messages = Array.isArray(res) ? res : (res?.data || []);
            if (!bodyEl) return;

            if (!messages || messages.length === 0) {
                bodyEl.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--text-muted); font-style: italic;">
                        <i class="fa-regular fa-comment-dots" style="font-size: 2rem; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                        Phiên này chưa phát sinh tin nhắn nào.
                    </div>
                `;
                return;
            }

            let html = '';
            messages.forEach(m => {
                const isStaff = m.vaiTroGui !== 'KHACH_HANG';
                const timeStr = m.taoLuc ? new Date(m.taoLuc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                
                const style = isStaff
                    ? 'align-self: flex-end; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border-top-right-radius: 4px; box-shadow: 0 3px 8px rgba(37,99,235,0.25);'
                    : 'align-self: flex-start; background: white; color: #1e293b; border: 1px solid #e2e8f0; border-top-left-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);';

                const senderLabel = isStaff
                    ? `<div style="font-size:0.72rem; color:#bfdbfe; font-weight:600; margin-bottom:3px; text-align:right;"><i class="fa-solid fa-user-doctor"></i> Dược sĩ</div>`
                    : `<div style="font-size:0.72rem; color:#64748b; font-weight:600; margin-bottom:3px;"><i class="fa-solid fa-user"></i> ${clientName}</div>`;

                let contentHtml = '';
                if (m.laHinhAnh) {
                    contentHtml = `
                        <div class="chat-img-wrap" style="margin-bottom:4px; cursor:zoom-in; border-radius:10px; overflow:hidden;" onclick="LiveChatAdmin.openImageLightbox('${m.noiDung}')">
                            <img src="${m.noiDung}" alt="Hình ảnh" style="max-width:240px; max-height:240px; object-fit:cover; display:block; border-radius:10px; border:1px solid rgba(0,0,0,0.1);">
                        </div>
                    `;
                } else {
                    contentHtml = `<div style="word-break:break-word; font-size:0.92rem; line-height:1.45;">${m.noiDung}</div>`;
                }

                html += `
                    <div style="padding:10px 14px; border-radius:16px; max-width:82%; margin-bottom:10px; ${style}">
                        ${senderLabel}
                        ${contentHtml}
                        <div style="display:flex; justify-content:flex-end; font-size:0.68rem; margin-top:4px; opacity:0.85;">
                            <span>${timeStr}</span>
                        </div>
                    </div>
                `;
            });

            bodyEl.innerHTML = html;
            bodyEl.scrollTop = bodyEl.scrollHeight;
        } catch (e) {
            if (bodyEl) {
                bodyEl.innerHTML = `<div style="color:#ef4444; padding:20px; text-align:center;"><i class="fa-solid fa-circle-exclamation" style="margin-right:6px;"></i> Lỗi nạp tin nhắn: ${e.message}</div>`;
            }
        }
    },

    closeTranscript: function() {
        const modal = document.getElementById('modal-transcript');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    },

    deleteSession: async function(sessionId) {
        const doDelete = async () => {
            try {
                if (window.App && typeof App.showLoading === 'function') App.showLoading();
                const res = await API.delete(`/api/tu-van/xoa-phien/${sessionId}`);
                if (window.App && typeof App.hideLoading === 'function') App.hideLoading();

                if (window.App && typeof App.showToast === 'function') {
                    App.showToast(res.thongBao || 'Đã xóa phiên tư vấn thành công!', 'success');
                }

                this.loadHistory();
            } catch (e) {
                if (window.App && typeof App.hideLoading === 'function') App.hideLoading();
                if (window.App && typeof App.showToast === 'function') {
                    App.showToast(e.message || 'Không thể xóa phiên tư vấn!', 'error');
                }
            }
        };

        const msg = `Bạn có chắc chắn muốn XÓA VĨNH VIỄN phiên tư vấn #${sessionId}?\nToàn bộ tin nhắn và ảnh liên quan sẽ bị xóa sạch khỏi hệ thống.`;
        if (window.App && typeof App.showConfirm === 'function') {
            App.showConfirm(msg, doDelete);
        } else {
            doDelete();
        }
    }
};
