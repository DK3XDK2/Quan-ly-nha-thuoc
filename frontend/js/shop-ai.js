
const ShopAI = {
    init: function() {
        this.buildUI();
        this.renderAiMessages();
        this.buildFooter();

        setTimeout(() => {
            this.showContextTooltip();
        }, 2000);
    },

    buildFooter: function() {
        if(document.querySelector('footer')) return;
        const footerHtml = `
            <footer id="shop-footer" style="background-color: #1f2937; color: #d1d5db; padding: 3rem 1rem 1rem; margin-top: auto; width: 100%; box-sizing: border-box;">
                <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; border-bottom: 1px solid #374151; padding-bottom: 2rem;">
                    <div>
                        <h3 style="color: white; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; font-size: 1.2rem;">
                            <img src="../../assets/images/ainalogo.png" class="shop-logo-img" onerror="this.src='https://cdn-icons-png.flaticon.com/512/8687/8687597.png'" alt="Logo">
                            <div class="shop-logo-text" style="text-align: left;">
                                <span class="shop-logo-top">NHÀ THUỐC</span>
                                <span class="shop-logo-bottom">AINA</span>
                            </div>
                        </h3>
                        <p style="font-size: 0.875rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-location-dot" style="width: 20px;"></i> 123 Đường ABC, Quận X, TP.HCM</p>
                        <p style="font-size: 0.875rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-phone" style="width: 20px;"></i> Hotline: 1900 1234</p>
                        <p style="font-size: 0.875rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-envelope" style="width: 20px;"></i> Email: contact@smartpharmacy.local</p>
                    </div>
                    <div>
                        <h4 style="color: white; margin-bottom: 1rem; font-size: 1rem;">Về chúng tôi</h4>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.875rem; line-height: 2;">
                            <li><a href="#" style="color: #d1d5db; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Giới thiệu</a></li>
                            <li><a href="#" style="color: #d1d5db; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Chính sách bảo mật</a></li>
                            <li><a href="#" style="color: #d1d5db; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Điều khoản sử dụng</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 style="color: white; margin-bottom: 1rem; font-size: 1rem;">Hỗ trợ khách hàng</h4>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.875rem; line-height: 2;">
                            <li><a href="#" style="color: #d1d5db; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Hướng dẫn mua hàng</a></li>
                            <li><a href="#" style="color: #d1d5db; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Chính sách đổi trả</a></li>
                            <li><a href="#" style="color: #d1d5db; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Chính sách giao hàng</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 style="color: white; margin-bottom: 1rem; font-size: 1rem;">Kết nối với chúng tôi</h4>
                        <div style="display: flex; gap: 1rem; font-size: 1.5rem;">
                            <a href="#" style="color: #d1d5db; transition: color 0.2s;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='#d1d5db'"><i class="fa-brands fa-facebook"></i></a>
                            <a href="#" style="color: #d1d5db; transition: color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#d1d5db'"><i class="fa-brands fa-youtube"></i></a>
                            <a href="#" style="color: #d1d5db; transition: color 0.2s;" onmouseover="this.style.color='#ec4899'" onmouseout="this.style.color='#d1d5db'"><i class="fa-brands fa-instagram"></i></a>
                        </div>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 2rem; font-size: 0.875rem; color: #9ca3af;">
                    &copy; 2026 AINA Pharmacy. All rights reserved.
                </div>
            </footer>
        `;
        document.body.insertAdjacentHTML('beforeend', footerHtml);
    },

    buildUI: function() {
        if(document.getElementById('shop-ai-container')) return;

        const styleHtml = `
            <style>
                /* Animations for AINA */
                @keyframes aina-float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-12px); }
                    100% { transform: translateY(0px); }
                }
                @keyframes aina-wave {
                    0% { transform: rotate(0deg); }
                    25% { transform: rotate(5deg); }
                    50% { transform: rotate(0deg); }
                    75% { transform: rotate(-5deg); }
                    100% { transform: rotate(0deg); }
                }
                @keyframes aina-glow {
                    0% { filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.3)); }
                    50% { filter: drop-shadow(0 10px 15px rgba(59, 130, 246, 0.6)); }
                    100% { filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.3)); }
                }
                @keyframes tooltip-pop {
                    0% { opacity: 0; transform: scale(0.8) translateY(10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                
                .aina-container {
                    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
                    display: flex; flex-direction: column; align-items: flex-end;
                }

                .aina-tooltip {
                    background: white; color: var(--shop-text);
                    padding: 12px 18px; border-radius: 20px; border-bottom-right-radius: 0;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    margin-bottom: 15px; font-size: 0.9rem; font-weight: 500;
                    max-width: 220px; text-align: left; line-height: 1.4;
                    border: 1px solid var(--shop-border);
                    display: none; animation: tooltip-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    position: relative;
                }
                .aina-tooltip::after {
                    content: ''; position: absolute; bottom: -10px; right: 25px;
                    border-width: 10px 10px 0; border-style: solid;
                    border-color: white transparent transparent transparent;
                    display: block; width: 0;
                }

                .aina-character {
                    width: 110px; height: auto; cursor: pointer;
                    animation: aina-float 3.5s ease-in-out infinite, aina-wave 4s ease-in-out infinite, aina-glow 3.5s infinite;
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .aina-character:hover { transform: scale(1.15) rotate(-10deg); animation-play-state: paused; }

                /* Chat Window */
                .aina-chat-window {
                    display: none; flex-direction: column; position: fixed; 
                    bottom: 160px; right: 20px; width: 380px; height: 550px; 
                    max-height: 85vh; max-width: 92vw; background: var(--shop-surface); 
                    border: 1px solid var(--shop-border); border-radius: 16px; 
                    box-shadow: 0 15px 40px rgba(0,0,0,0.25); z-index: 9998; overflow: hidden;
                    transform-origin: bottom right;
                    animation: tooltip-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }

                .aina-header {
                    background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; 
                    padding: 12px 15px; display: flex; justify-content: space-between; align-items: center;
                }
                .aina-header-info { display: flex; align-items: center; gap: 12px; }
                .aina-header-avatar {
                    width: 42px; height: 42px; border-radius: 50%; object-fit: cover;
                    border: 2px solid white; background: white;
                }

                .shop-chat-tab-bar {
                    display: flex; background: #f1f5f9; padding: 4px; gap: 4px;
                    border-bottom: 1px solid var(--shop-border);
                }
                .shop-chat-tab-btn {
                    flex: 1; border: none; padding: 8px 10px; border-radius: 8px;
                    font-weight: 600; font-size: 0.82rem; cursor: pointer;
                    background: transparent; color: #64748b; transition: all 0.2s;
                    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                }
                .shop-chat-tab-btn.active {
                    background: white; color: #2563eb;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }

                .pharmacist-waiting-box {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    text-align: center; padding: 30px 20px; gap: 14px; background: white;
                    border-radius: 16px; border: 1px dashed #cbd5e1; margin: auto 15px;
                }
            </style>
        `;

        const greeting = this.getTimeGreeting();
        const currentUser = this.getCurrentUser();
        const isLoggedIn = this.isLoggedIn();

        const firstMsg = isLoggedIn
            ? `${greeting}, <strong>${currentUser?.name || currentUser?.hoTen || 'Quý khách'}</strong>! Tôi là Trợ lý Dược sĩ AINA. ${this.getContextHelp()}`
            : `${greeting}! Tôi là Trợ lý Dược sĩ AINA. Để được tư vấn chi tiết về thuốc và sức khỏe, bạn vui lòng đăng nhập tài khoản nhé!`;

        const authNoticeHtml = !isLoggedIn ? `
            <div id="shop-ai-auth-banner" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:10px 14px; margin-bottom:10px; color:#1e40af; font-size:0.83rem; line-height:1.4; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; align-items:flex-start; gap:8px;">
                    <i class="fa-solid fa-lock" style="color:#2563eb; margin-top:2px; font-size:0.95rem;"></i>
                    <div>
                        <strong>Yêu cầu đăng nhập:</strong> Chỉ khách hàng có tài khoản đã đăng nhập mới được phép hỏi đáp với Trợ lý AI để đảm bảo an toàn tư vấn.
                    </div>
                </div>
                <a href="${this.getLoginUrl()}" style="display:inline-flex; align-items:center; gap:6px; align-self:flex-end; background:#2563eb; color:white; padding:5px 12px; border-radius:20px; text-decoration:none; font-weight:600; font-size:0.78rem; box-shadow:0 2px 6px rgba(37,99,235,0.3);">
                    <i class="fa-solid fa-arrow-right-to-bracket"></i> Đăng nhập ngay
                </a>
            </div>
        ` : '';

        const html = `
            ${styleHtml}
            <!-- AINA Character -->
            <div id="shop-ai-container" class="aina-container">
                <div id="aina-tooltip" class="aina-tooltip">
                    Xin chào! Tôi là AINA.
                </div>
                <!-- Fallback to a placeholder character image if aina.png not found -->
                <img src="../../assets/images/aina.png" class="aina-character" onclick="ShopAI.toggle()" alt="AINA Assistant" onerror="this.src='https://cdn-icons-png.flaticon.com/512/8687/8687597.png'">
            </div>

            <!-- Chat Window with 2 Tabs -->
            <div id="shop-ai-window" class="aina-chat-window">
                <!-- Header -->
                <div class="aina-header">
                    <div class="aina-header-info">
                        <img src="../../assets/images/aina.png" class="aina-header-avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/8687/8687597.png'">
                        <div>
                            <div style="font-weight: 700; font-size: 1.05rem; letter-spacing: 0.5px;">AINA Pharmacy Chat</div>
                            <div style="font-size: 0.78rem; color: #bfdbfe; margin-top: 1px;"><i class="fa-solid fa-circle" style="color:#22c55e; font-size: 0.45rem; vertical-align: middle; margin-right: 2px;"></i> Sẵn sàng hỗ trợ</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <button type="button" id="btn-shop-ai-new-chat" onclick="ShopAI.resetAiChat()" title="Bắt đầu đoạn chat mới (Xóa lịch sử AI)" style="background:rgba(255,255,255,0.2); border:none; color:white; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:0.85rem; display:${isLoggedIn ? 'inline-flex' : 'none'}; align-items:center; gap:4px; transition:all 0.2s;">
                            <i class="fa-solid fa-pen-to-square"></i>
                            <span style="font-size:0.75rem; font-weight:600;">Chat mới</span>
                        </button>
                        <button type="button" id="btn-shop-ai-expand" onclick="ShopAI.openMessenger()" title="Mở trang Messenger toàn màn hình" style="background:rgba(255,255,255,0.2); border:none; color:white; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:0.85rem; display:${isLoggedIn ? 'inline-flex' : 'none'}; align-items:center; gap:4px; transition:all 0.2s;">
                            <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
                            <span style="font-size:0.75rem; font-weight:600;">Mở to</span>
                        </button>
                        <button type="button" onclick="ShopAI.toggle()" style="background:none; border:none; color:white; cursor:pointer; font-size:1.8rem; line-height:1; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">&times;</button>
                    </div>
                </div>

                <!-- 2-Tab Navigation Bar -->
                <div class="shop-chat-tab-bar">
                    <button id="shop-tab-ai" class="shop-chat-tab-btn active" onclick="ShopAI.switchTab('ai')">
                        <i class="fa-solid fa-robot"></i> Hỏi tư vấn AI
                    </button>
                    <button id="shop-tab-pharmacist" class="shop-chat-tab-btn" onclick="ShopAI.switchTab('pharmacist')">
                        <i class="fa-solid fa-user-doctor"></i> Tư vấn Dược sĩ
                        <span id="pharmacist-tab-dot" style="display:none; width:8px; height:8px; background:#ef4444; border-radius:50%;"></span>
                    </button>
                </div>

                <!-- TAB 1: AI ASSISTANT -->
                <div id="shop-ai-tab-body" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
                    <div style="background:#fffbeb; color:#b45309; padding:8px 14px; font-size:0.78rem; border-bottom:1px solid #fde68a; text-align:center; line-height:1.4;">
                        <i class="fa-solid fa-shield-heart"></i> <strong>Lưu ý:</strong> AINA cung cấp thông tin tham khảo, không thay thế bác sĩ hay dược sĩ chuyên môn.
                    </div>

                    <div id="shop-ai-messages" style="flex:1; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; background:#f8fafc;">
                    </div>

                    <div style="padding:10px 14px; display:flex; gap:8px; overflow-x:auto; white-space:nowrap; background:white; border-top:1px solid var(--shop-border); scrollbar-width:none;">
                        <button onclick="ShopAI.ask('Tư vấn vitamin')" style="background:#f1f5f9; border:none; border-radius:20px; padding:6px 12px; font-size:0.8rem; font-weight:500; cursor:pointer; color:#334155;">Tư vấn Vitamin</button>
                        <button onclick="ShopAI.ask('Thuốc giảm đau')" style="background:#f1f5f9; border:none; border-radius:20px; padding:6px 12px; font-size:0.8rem; font-weight:500; cursor:pointer; color:#334155;">Thuốc giảm đau</button>
                        <button onclick="ShopAI.ask('Sản phẩm khuyến mãi')" style="background:#f1f5f9; border:none; border-radius:20px; padding:6px 12px; font-size:0.8rem; font-weight:500; cursor:pointer; color:#334155;">Đang khuyến mãi</button>
                    </div>

                    <div style="display:flex; border-top:1px solid var(--shop-border); padding:10px 14px; background:white; align-items:center; gap:8px;">
                        <input type="text" id="shop-ai-input" placeholder="${isLoggedIn ? 'Nhập câu hỏi cho AINA...' : 'Vui lòng đăng nhập để gửi câu hỏi...'}" style="flex:1; border:none; background:#f1f5f9; border-radius:24px; font-family:inherit; font-size:0.92rem; padding:10px 15px; outline:none;" onkeypress="if(event.key==='Enter') ShopAI.send()">
                        <button onclick="ShopAI.send()" style="background:linear-gradient(135deg, #3b82f6, #2563eb); border:none; color:white; width:40px; height:40px; border-radius:50%; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow: 0 4px 10px rgba(37,99,235,0.3);"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>

                <!-- TAB 2: LIVE PHARMACIST CONSULTATION -->
                <div id="shop-pharmacist-tab-body" style="display:none; flex-direction:column; flex:1; overflow:hidden;">
                    <!-- Status Header for Active Session -->
                    <div id="pharmacist-status-bar" style="display:none; background:#eff6ff; border-bottom:1px solid #bfdbfe; padding:8px 14px; font-size:0.82rem; color:#1e40af; justify-content:space-between; align-items:center;">
                        <div id="pharmacist-status-text" style="display:flex; align-items:center; gap:6px; font-weight:600;">
                            <i class="fa-solid fa-user-doctor text-primary"></i> <span id="pharma-name">Dược sĩ trực quầy</span>
                        </div>
                        <button onclick="ShopAI.endConsultation()" class="btn btn-sm btn-outline text-danger" style="padding:2px 8px; font-size:0.75rem; border-radius:12px; background:white;" title="Kết thúc phiên">
                            <i class="fa-solid fa-power-off"></i> Đóng phiên
                        </button>
                    </div>

                    <!-- Main Dynamic Area for Tab 2 -->
                    <div id="shop-pharmacist-main" style="flex:1; display:flex; flex-direction:column; overflow-y:auto; background:#f8fafc; padding:15px;">
                        <!-- Rendered dynamically: Welcome state, Waiting state, or Chat messages -->
                    </div>

                    <!-- Image Preview Area -->
                    <div id="shop-pharmacist-preview" style="display:none; padding:8px 14px; background:#f1f5f9; border-top:1px solid #e2e8f0; align-items:center; gap:10px;">
                        <div style="position:relative; width:44px; height:44px; border-radius:8px; overflow:hidden; border:1px solid #cbd5e1; flex-shrink:0;">
                            <img id="shop-pharmacist-preview-img" src="" style="width:100%; height:100%; object-fit:cover;">
                            <button type="button" onclick="ShopAI.cancelPharmacistImage()" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.65); color:white; border:none; border-radius:50%; width:16px; height:16px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1;">&times;</button>
                        </div>
                        <div style="font-size:0.8rem; color:#475569; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            <span id="shop-pharmacist-preview-name" style="font-weight:600;">Ảnh đính kèm</span>
                            <div style="font-size:0.72rem; color:#94a3b8;">Bấm gửi để chuyển ảnh cho Dược sĩ</div>
                        </div>
                    </div>

                    <!-- Input bar for Pharmacist Chat -->
                    <div id="pharmacist-input-container" style="display:flex; border-top:1px solid var(--shop-border); padding:10px 14px; background:white; align-items:center; gap:8px;">
                        <button type="button" id="shop-pharmacist-attach-btn" disabled onclick="document.getElementById('shop-pharmacist-file').click()" title="Đính kèm ảnh đơn thuốc hoặc sản phẩm" style="background:none; border:none; color:#94a3b8; width:36px; height:36px; border-radius:50%; font-size:1.15rem; cursor:not-allowed; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:color 0.2s;">
                            <i class="fa-solid fa-image"></i>
                        </button>
                        <input type="file" id="shop-pharmacist-file" accept="image/*" style="display:none;" onchange="ShopAI.handlePharmacistImageSelected(event)">
                        
                        <input type="text" id="shop-pharmacist-input" disabled placeholder="Vui lòng yêu cầu và đợi Dược sĩ kết nối..." style="flex:1; border:none; background:#f1f5f9; border-radius:24px; font-family:inherit; font-size:0.92rem; padding:10px 15px; outline:none;" onkeypress="if(event.key==='Enter') ShopAI.sendPharmacistMessage()">
                        
                        <button id="shop-pharmacist-send-btn" disabled onclick="ShopAI.sendPharmacistMessage()" style="background:#94a3b8; border:none; color:white; width:40px; height:40px; border-radius:50%; font-size:1rem; cursor:not-allowed; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow: 0 4px 10px rgba(0,0,0,0.1);"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>

            </div>

            <!-- Global Chat Image Lightbox Viewer -->
            <div id="chat-image-lightbox" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:99999; justify-content:center; align-items:center; cursor:zoom-out;" onclick="this.style.display='none'">
                <img id="chat-lightbox-img" src="" style="max-width:90vw; max-height:90vh; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5); object-fit:contain;">
                <button type="button" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.25); border:none; color:white; font-size:1.8rem; border-radius:50%; width:44px; height:44px; cursor:pointer; display:flex; align-items:center; justify-content:center;" onclick="document.getElementById('chat-image-lightbox').style.display='none'">&times;</button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    currentTab: 'ai',
    activeSession: null,
    socket: null,
    pollTimer: null,

    switchTab: function(tab) {
        this.currentTab = tab;
        const btnAi = document.getElementById('shop-tab-ai');
        const btnPharma = document.getElementById('shop-tab-pharmacist');
        const bodyAi = document.getElementById('shop-ai-tab-body');
        const bodyPharma = document.getElementById('shop-pharmacist-tab-body');

        if (tab === 'ai') {
            if (btnAi) btnAi.classList.add('active');
            if (btnPharma) btnPharma.classList.remove('active');
            if (bodyAi) bodyAi.style.display = 'flex';
            if (bodyPharma) bodyPharma.style.display = 'none';
        } else {
            if (btnPharma) btnPharma.classList.add('active');
            if (btnAi) btnAi.classList.remove('active');
            if (bodyAi) bodyAi.style.display = 'none';
            if (bodyPharma) bodyPharma.style.display = 'flex';
            this.loadPharmacistTab();
        }
    },

    openMessenger: function() {
        if (!this.isLoggedIn()) {
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Vui lòng đăng nhập tài khoản để vào phòng tư vấn Messenger!', 'warning');
            }
            const path = window.location.pathname.toLowerCase();
            const loginUrl = path.includes('/customer/') ? '../public/shop-login.html' : 'shop-login.html';
            setTimeout(() => {
                window.location.href = loginUrl + '?redirect=' + encodeURIComponent(path.includes('/customer/') ? 'consultation.html' : '../customer/consultation.html');
            }, 600);
            return;
        }
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/customer/')) {
            window.location.href = 'consultation.html';
        } else {
            window.location.href = '../customer/consultation.html';
        }
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
                
                this.socket.on("receive_message", (msg) => {
                    if (this.activeSession && Number(msg.phienId) === Number(this.activeSession.id)) {
                        if (msg.vaiTroGui === 'KHACH_HANG') {
                            if (msg.tempId) {
                                const tempEl = document.querySelector(`[data-temp-msg="${msg.tempId}"]`);
                                if (tempEl) {
                                    const statusEl = tempEl.querySelector('.my-msg-status');
                                    if (statusEl) {
                                        statusEl.innerHTML = '<i class="fa-solid fa-check"></i> Đã gửi';
                                    }
                                    if (msg.laHinhAnh) {
                                        const imgEl = tempEl.querySelector('img');
                                        if (imgEl && msg.noiDung) {
                                            imgEl.src = msg.noiDung;
                                            tempEl.querySelector('.chat-img-wrap')?.setAttribute('onclick', `ShopAI.openImageLightbox('${msg.noiDung}')`);
                                        }
                                    }
                                    return;
                                }
                            }
                        } else {
                            this.appendPharmacistMsg(msg);
                            // Messenger style: chỉ tính là đã xem khi khách hàng đang mở chat và đang focus trực tiếp vào ô nhập tin nhắn
                            if (this.isPharmacistChatFocused()) {
                                this.markSessionSeen(msg.phienId);
                            } else {
                                const dot = document.getElementById('pharmacist-tab-dot');
                                if (dot) dot.style.display = 'inline-block';
                            }
                        }
                    }
                });

                this.socket.on("messages_seen", (data) => {
                    if (this.activeSession && Number(data.phienId) === Number(this.activeSession.id)) {
                        // CHỈ CẬP NHẬT KHI NGƯỜI XEM LÀ DƯỢC SĨ/NHÂN VIÊN
                        if (data && data.vaiTro !== 'KHACH_HANG') {
                            const statuses = document.querySelectorAll('#pharmacist-chat-messages .my-msg-status');
                            statuses.forEach(st => {
                                st.innerHTML = '<i class="fa-solid fa-check-double" style="color:#bfdbfe;"></i> Đã xem';
                                st.style.color = '#dbeafe';
                                st.style.fontWeight = '600';
                            });
                        }
                    }
                });

                this.socket.on("session_status_changed", (data) => {
                    if (data && this.activeSession && (data.status || data.phienId)) {
                        if (data.status === 'DANG_TU_VAN') {
                            this.loadPharmacistTab(true);
                            if (window.App && typeof App.showToast === 'function') {
                                App.showToast('Dược sĩ đã kết nối! Bạn có thể nhắn tin trực tiếp.', 'success');
                            }
                        } else if (data.status === 'KET_THUC') {
                            this.activeSession = null;
                            this.renderPharmacistWelcome('Phiên tư vấn đã kết thúc.');
                            if (window.App && typeof App.showToast === 'function') {
                                App.showToast(data.thongBao || 'Phiên tư vấn đã kết thúc.', 'info');
                            }
                        }
                    }
                });
            }

            if (callback) callback();
        });
    },

    loadPharmacistTab: async function(forceRefresh = false) {
        const main = document.getElementById('shop-pharmacist-main');
        const statusBar = document.getElementById('pharmacist-status-bar');
        const input = document.getElementById('shop-pharmacist-input');
        const sendBtn = document.getElementById('shop-pharmacist-send-btn');

        if (!this.isLoggedIn()) {
            if (statusBar) statusBar.style.display = 'none';
            if (input) input.disabled = true;
            if (sendBtn) sendBtn.disabled = true;
            if (main) {
                main.innerHTML = `
                    <div class="pharmacist-waiting-box">
                        <div style="width:60px; height:60px; border-radius:50%; background:#eff6ff; display:flex; align-items:center; justify-content:center; color:#2563eb; font-size:1.8rem;">
                            <i class="fa-solid fa-user-doctor"></i>
                        </div>
                        <h4 style="margin:0; font-size:1.05rem; color:#1e293b;">Tư vấn trực tiếp với Dược sĩ</h4>
                        <p style="margin:0; font-size:0.85rem; color:#64748b; line-height:1.4;">
                            Để kết nối 1-1 với Dược sĩ nhà thuốc và theo dõi đơn thuốc, vui lòng đăng nhập tài khoản của bạn.
                        </p>
                        <a href="${this.getLoginUrl()}" style="margin-top:6px; display:inline-flex; align-items:center; gap:8px; padding:10px 20px; background:#2563eb; color:white; border-radius:24px; text-decoration:none; font-weight:600; font-size:0.85rem; box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                            <i class="fa-solid fa-arrow-right-to-bracket"></i> Đăng nhập ngay
                        </a>
                    </div>
                `;
            }
            return;
        }

        try {
            const phien = await API.get('/api/tu-van/hien-tai');
            this.activeSession = phien;

            if (!phien) {
                this.renderPharmacistWelcome();
                return;
            }

            if (phien.trangThai === 'CHO_TU_VAN') {
                this.renderPharmacistWaiting(phien);
            } else if (phien.trangThai === 'DANG_TU_VAN') {
                this.renderPharmacistChat(phien);
            } else {
                this.renderPharmacistWelcome();
            }

            this.ensureSocket(() => {
                if (this.socket && phien.id) {
                    this.socket.emit("join_room", phien.id);
                }
            });

            if (phien.trangThai === 'CHO_TU_VAN') {
                this.startPharmacistPolling();
            } else {
                this.stopPharmacistPolling();
            }
        } catch (e) {
            console.error('Lỗi tải phiên tư vấn:', e);
            this.renderPharmacistWelcome();
        }
    },

    renderPharmacistWelcome: function(message = '') {
        this.stopPharmacistPolling();
        const main = document.getElementById('shop-pharmacist-main');
        const statusBar = document.getElementById('pharmacist-status-bar');
        const input = document.getElementById('shop-pharmacist-input');
        const sendBtn = document.getElementById('shop-pharmacist-send-btn');

        if (statusBar) statusBar.style.display = 'none';
        if (input) {
            input.disabled = true;
            input.placeholder = "Bấm 'Yêu cầu phiên tư vấn' ở trên để bắt đầu...";
        }
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.style.background = '#94a3b8';
            sendBtn.style.cursor = 'not-allowed';
        }

        if (main) {
            main.innerHTML = `
                <div class="pharmacist-waiting-box">
                    <div style="width:65px; height:65px; border-radius:50%; background:linear-gradient(135deg, #eff6ff, #dbeafe); display:flex; align-items:center; justify-content:center; color:#2563eb; font-size:2rem; box-shadow:0 4px 14px rgba(37,99,235,0.15);">
                        <i class="fa-solid fa-headset"></i>
                    </div>
                    <h4 style="margin:0; font-size:1.1rem; color:#1e293b;">Dược sĩ Trực Tuyến AINA</h4>
                    <p style="margin:0; font-size:0.85rem; color:#64748b; line-height:1.5;">
                        ${message ? `<strong style="color:#e11d48;">${message}</strong><br>` : ''}
                        Cần tư vấn chi tiết về đơn thuốc, cách uống hoặc tác dụng phụ? Hãy kết nối trực tiếp với Dược sĩ chuyên môn của chúng tôi.
                    </p>
                    <button onclick="ShopAI.requestConsultation()" style="margin-top:8px; border:none; display:inline-flex; align-items:center; gap:8px; padding:12px 24px; background:linear-gradient(135deg, #2563eb, #1d4ed8); color:white; border-radius:24px; font-weight:600; font-size:0.9rem; cursor:pointer; box-shadow:0 4px 14px rgba(37,99,235,0.35); transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fa-solid fa-headset"></i> Yêu cầu phiên tư vấn
                    </button>
                    <div style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">
                        <i class="fa-solid fa-shield-halved"></i> Tư vấn miễn phí & Bảo mật thông tin y tế
                    </div>
                </div>
            `;
        }
    },

    renderPharmacistWaiting: function(phien) {
        const main = document.getElementById('shop-pharmacist-main');
        const statusBar = document.getElementById('pharmacist-status-bar');
        const input = document.getElementById('shop-pharmacist-input');
        const sendBtn = document.getElementById('shop-pharmacist-send-btn');

        if (statusBar) statusBar.style.display = 'none';
        if (input) {
            input.disabled = true;
            input.placeholder = "Đang đợi Dược sĩ kết nối, vui lòng chờ trong giây lát...";
        }
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.style.background = '#94a3b8';
            sendBtn.style.cursor = 'not-allowed';
        }

        if (main) {
            main.innerHTML = `
                <div class="pharmacist-waiting-box" style="border-color:#38bdf8; background:#f0f9ff;">
                    <div style="position:relative; width:65px; height:65px; border-radius:50%; background:#e0f2fe; display:flex; align-items:center; justify-content:center; color:#0284c7; font-size:1.8rem;">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                    </div>
                    <h4 style="margin:0; font-size:1.05rem; color:#0369a1;">Đang đợi Dược sĩ kết nối...</h4>
                    <p style="margin:0; font-size:0.84rem; color:#475569; line-height:1.5;">
                        Yêu cầu tư vấn của bạn đã được chuyển đến quầy Dược sĩ.<br>
                        <strong>Vui lòng giữ cửa sổ chat</strong>, khung nhắn tin sẽ tự động mở ngay khi có Dược sĩ tiếp nhận!
                    </p>
                    <button onclick="ShopAI.endConsultation()" class="btn btn-outline btn-sm text-danger" style="margin-top:6px; font-size:0.8rem; padding:6px 16px; border-radius:20px; background:white;">
                        <i class="fa-solid fa-xmark"></i> Hủy yêu cầu
                    </button>
                </div>
            `;
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
        const lb = document.getElementById('chat-image-lightbox');
        const img = document.getElementById('chat-lightbox-img');
        if (lb && img) {
            img.src = src;
            lb.style.display = 'flex';
        }
    },

    selectedImage: null,

    handlePharmacistImageSelected: function(e) {
        const file = e.target?.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Vui lòng chỉ chọn tệp hình ảnh (JPG, PNG, WebP)!', 'warning');
            }
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Kích thước ảnh không được vượt quá 10MB!', 'warning');
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            this.selectedImage = { file, base64, name: file.name };
            
            const previewWrap = document.getElementById('shop-pharmacist-preview');
            const previewImg = document.getElementById('shop-pharmacist-preview-img');
            const previewName = document.getElementById('shop-pharmacist-preview-name');
            if (previewImg) previewImg.src = base64;
            if (previewName) previewName.innerText = file.name;
            if (previewWrap) previewWrap.style.display = 'flex';

            const sendBtn = document.getElementById('shop-pharmacist-send-btn');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
                sendBtn.style.cursor = 'pointer';
            }
        };
        reader.readAsDataURL(file);
    },

    cancelPharmacistImage: function() {
        this.selectedImage = null;
        const fileInput = document.getElementById('shop-pharmacist-file');
        if (fileInput) fileInput.value = '';
        const previewWrap = document.getElementById('shop-pharmacist-preview');
        if (previewWrap) previewWrap.style.display = 'none';

        const input = document.getElementById('shop-pharmacist-input');
        const sendBtn = document.getElementById('shop-pharmacist-send-btn');
        if (sendBtn && (!input || !input.value.trim())) {
            if (!this.activeSession || this.activeSession.trangThai !== 'DANG_TU_VAN') {
                sendBtn.disabled = true;
                sendBtn.style.background = '#94a3b8';
                sendBtn.style.cursor = 'not-allowed';
            }
        }
    },

    isPharmacistChatFocused: function() {
        if (!this.activeSession || document.hidden) return false;
        const win = document.getElementById('shop-ai-window');
        const isWindowOpen = win && (win.style.display === 'flex' || win.classList.contains('active'));
        if (!isWindowOpen || this.currentTab !== 'pharmacist') return false;

        const input = document.getElementById('shop-pharmacist-input');
        return Boolean(input && document.activeElement === input);
    },

    handlePharmacistInputInteraction: function() {
        if (!this.activeSession || !this.activeSession.id) return;
        const win = document.getElementById('shop-ai-window');
        const isWindowOpen = win && (win.style.display === 'flex' || win.classList.contains('active'));
        if (!isWindowOpen || this.currentTab !== 'pharmacist') return;

        const dot = document.getElementById('pharmacist-tab-dot');
        if (dot) dot.style.display = 'none';

        this.markSessionSeen(this.activeSession.id);
    },

    markSessionSeen: function(phienId) {
        if (!phienId) return;
        this.ensureSocket(() => {
            if (this.socket) {
                this.socket.emit("mark_seen", { phienId: Number(phienId), vaiTro: 'KHACH_HANG' });
            }
        });
        if (window.API) {
            API.post(`/api/tu-van/da-xem/${phienId}`).catch(() => {});
        }
    },

    buildPharmacistMsgHtml: function(m, phien) {
        const isMe = m.vaiTroGui === 'KHACH_HANG';
        const timeStr = this.formatMsgTime(m.taoLuc || new Date());
        const tempAttr = m.tempId ? `data-temp-msg="${m.tempId}"` : '';

        let statusHtml = '';
        if (isMe) {
            if (m.status === 'sending') {
                statusHtml = `<span class="my-msg-status" style="display:inline-flex; align-items:center; gap:3px; opacity:0.8; font-size:0.68rem;"><i class="fa-regular fa-clock fa-spin"></i> Đang gửi</span>`;
            } else if (m.daXem) {
                statusHtml = `<span class="my-msg-status" style="display:inline-flex; align-items:center; gap:3px; color:#dbeafe; font-weight:600; font-size:0.68rem;"><i class="fa-solid fa-check-double" style="color:#bfdbfe;"></i> Đã xem</span>`;
            } else {
                statusHtml = `<span class="my-msg-status" style="display:inline-flex; align-items:center; gap:3px; opacity:0.85; font-size:0.68rem;"><i class="fa-solid fa-check"></i> Đã gửi</span>`;
            }
        }

        const style = isMe
            ? 'align-self:flex-end; background:linear-gradient(135deg, #3b82f6, #2563eb); color:white; border-top-right-radius:4px; box-shadow:0 3px 8px rgba(37,99,235,0.25);'
            : 'align-self:flex-start; background:white; color:#1e293b; border:1px solid #e2e8f0; border-top-left-radius:4px; box-shadow:0 2px 6px rgba(0,0,0,0.04);';
        
        const senderLabel = isMe ? '' : `<div style="font-size:0.72rem; color:#64748b; font-weight:600; margin-bottom:3px;"><i class="fa-solid fa-user-doctor text-primary"></i> ${phien?.nhanVien?.hoTen || 'Dược sĩ'}</div>`;

        let contentHtml = '';
        if (m.laHinhAnh) {
            contentHtml = `
                <div class="chat-img-wrap" style="margin-bottom:4px; cursor:zoom-in; border-radius:10px; overflow:hidden;" onclick="ShopAI.openImageLightbox('${m.noiDung}')">
                    <img src="${m.noiDung}" alt="Ảnh đính kèm" style="max-width:200px; max-height:200px; object-fit:cover; display:block; border-radius:10px; border:1px solid rgba(0,0,0,0.1);">
                </div>
            `;
        } else {
            contentHtml = `<div style="word-break:break-word;">${m.noiDung}</div>`;
        }

        return `
            <div ${tempAttr} style="padding:10px 14px; border-radius:16px; max-width:85%; font-size:0.92rem; line-height:1.45; margin-bottom:10px; ${style}">
                ${senderLabel}
                ${contentHtml}
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:5px; font-size:0.68rem; margin-top:4px; opacity:0.85;">
                    <span>${timeStr}</span>
                    ${statusHtml}
                </div>
            </div>
        `;
    },

    renderPharmacistChat: function(phien) {
        this.stopPharmacistPolling();
        const main = document.getElementById('shop-pharmacist-main');
        const statusBar = document.getElementById('pharmacist-status-bar');
        const pharmaName = document.getElementById('pharma-name');
        const input = document.getElementById('shop-pharmacist-input');
        const sendBtn = document.getElementById('shop-pharmacist-send-btn');
        const attachBtn = document.getElementById('shop-pharmacist-attach-btn');

        if (statusBar) {
            statusBar.style.display = 'flex';
            if (pharmaName) {
                pharmaName.innerText = phien.nhanVien?.hoTen ? `Dược sĩ ${phien.nhanVien.hoTen}` : 'Dược sĩ trực quầy';
            }
        }

        if (input) {
            input.disabled = false;
            input.placeholder = "Nhập câu hỏi gửi Dược sĩ... (Enter để gửi)";
            input.onfocus = () => this.handlePharmacistInputInteraction();
            input.onclick = () => this.handlePharmacistInputInteraction();
            input.oninput = () => this.handlePharmacistInputInteraction();
        }
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            sendBtn.style.cursor = 'pointer';
        }
        if (attachBtn) {
            attachBtn.disabled = false;
            attachBtn.style.color = '#2563eb';
            attachBtn.style.cursor = 'pointer';
        }

        let messagesHtml = `
            <div style="align-self:center; background:#e0f2fe; color:#0369a1; padding:6px 14px; border-radius:15px; font-size:0.78rem; font-weight:600; margin-bottom:10px;">
                <i class="fa-solid fa-circle-check"></i> Đã kết nối với ${phien.nhanVien?.hoTen ? `Dược sĩ ${phien.nhanVien.hoTen}` : 'Dược sĩ trực quầy'}
            </div>
        `;

        const msgs = phien.tinNhan || [];
        msgs.forEach(m => {
            messagesHtml += this.buildPharmacistMsgHtml(m, phien);
        });

        if (main) {
            main.innerHTML = `<div id="pharmacist-chat-messages" style="display:flex; flex-direction:column; flex:1;">${messagesHtml}</div>`;
            main.scrollTop = main.scrollHeight;
            main.onclick = () => this.handlePharmacistInputInteraction();
        }
    },

    appendPharmacistMsg: function(m) {
        let chatContainer = document.getElementById('pharmacist-chat-messages');
        const main = document.getElementById('shop-pharmacist-main');
        if (!chatContainer && main) {
            main.innerHTML = `<div id="pharmacist-chat-messages" style="display:flex; flex-direction:column; flex:1;"></div>`;
            chatContainer = document.getElementById('pharmacist-chat-messages');
        }
        if (!chatContainer || !main) return;

        const msgHtml = this.buildPharmacistMsgHtml(m, this.activeSession);
        chatContainer.insertAdjacentHTML('beforeend', msgHtml);
        main.scrollTop = main.scrollHeight;
    },

    requestConsultation: async function() {
        if (!this.isLoggedIn()) {
            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Vui lòng đăng nhập để yêu cầu tư vấn!', 'warning');
            }
            window.location.href = this.getLoginUrl();
            return;
        }

        try {
            if (window.App && typeof App.showLoading === 'function') App.showLoading();
            const res = await API.post('/api/tu-van/bat-dau');
            if (window.App && typeof App.hideLoading === 'function') App.hideLoading();

            this.activeSession = res;
            this.ensureSocket(() => {
                if (this.socket && res.id) {
                    this.socket.emit("join_room", res.id);
                }
            });

            if (res.trangThai === 'DANG_TU_VAN') {
                this.renderPharmacistChat(res);
            } else {
                this.renderPharmacistWaiting(res);
                this.startPharmacistPolling();
            }

            if (window.App && typeof App.showToast === 'function') {
                App.showToast('Đã gửi yêu cầu tư vấn! Đang đợi Dược sĩ kết nối...', 'info');
            }
        } catch (e) {
            if (window.App && typeof App.hideLoading === 'function') App.hideLoading();
            if (window.App && typeof App.showToast === 'function') {
                App.showToast(e.message || 'Không thể gửi yêu cầu tư vấn lúc này!', 'error');
            }
        }
    },

    sendPharmacistMessage: async function() {
        if (!this.activeSession || this.activeSession.trangThai !== 'DANG_TU_VAN') return;

        const input = document.getElementById('shop-pharmacist-input');
        const text = input ? input.value.trim() : '';
        const hasImage = Boolean(this.selectedImage);

        if (!text && !hasImage) return;

        const user = this.getCurrentUser();
        const phienId = this.activeSession.id;
        const tempImage = this.selectedImage;

        if (input) input.value = '';
        this.cancelPharmacistImage();

        // 1. Gửi ảnh nếu có
        if (hasImage && tempImage) {
            const tempIdImg = 'temp_img_' + Date.now();
            this.appendPharmacistMsg({
                phienId,
                vaiTroGui: 'KHACH_HANG',
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
            }).catch(e => console.warn('Lỗi gửi ảnh qua HTTP:', e));
        }

        // 2. Gửi văn bản nếu có
        if (text) {
            const tempIdText = 'temp_txt_' + Date.now();
            this.appendPharmacistMsg({
                phienId,
                vaiTroGui: 'KHACH_HANG',
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
            }).catch(e => console.warn('Lỗi gửi tin qua HTTP:', e));
        }
    },

    endConsultation: async function() {
        const isWaiting = (this.activeSession && this.activeSession.trangThai === 'CHO_TU_VAN');
        const confirmMsg = isWaiting 
            ? 'Bạn có chắc chắn muốn hủy yêu cầu tư vấn với Dược sĩ không?' 
            : 'Bạn có chắc chắn muốn kết thúc phiên tư vấn này với Dược sĩ không?';

        const doEnd = async () => {
            try {
                await API.post('/api/tu-van/khach-hang-ket-thuc');
                this.activeSession = null;
                this.renderPharmacistWelcome(isWaiting ? 'Bạn đã hủy yêu cầu tư vấn.' : 'Bạn đã kết thúc phiên tư vấn.');
                if (window.App && typeof App.showToast === 'function') {
                    App.showToast(isWaiting ? 'Đã hủy yêu cầu tư vấn.' : 'Đã kết thúc phiên tư vấn thành công.', 'success');
                }
            } catch (e) {
                this.activeSession = null;
                this.renderPharmacistWelcome();
                if (window.App && typeof App.showToast === 'function') {
                    App.showToast(e.message || 'Lỗi khi đóng phiên tư vấn!', 'error');
                }
            }
        };

        if (window.App && typeof App.showConfirm === 'function') {
            App.showConfirm(confirmMsg, doEnd);
        } else {
            doEnd();
        }
    },

    startPharmacistPolling: function() {
        this.stopPharmacistPolling();
        this.pollTimer = setInterval(async () => {
            try {
                if (!this.activeSession || this.activeSession.trangThai !== 'CHO_TU_VAN') {
                    this.stopPharmacistPolling();
                    return;
                }
                const res = await API.get('/api/tu-van/hien-tai');
                if (res && res.trangThai === 'DANG_TU_VAN') {
                    this.activeSession = res;
                    this.renderPharmacistChat(res);
                    if (window.App && typeof App.showToast === 'function') {
                        App.showToast('Dược sĩ đã tiếp nhận! Bạn có thể nhắn tin trực tiếp.', 'success');
                    }
                    this.stopPharmacistPolling();
                } else if (!res || res.trangThai === 'KET_THUC') {
                    this.activeSession = null;
                    this.renderPharmacistWelcome('Phiên tư vấn đã kết thúc.');
                    this.stopPharmacistPolling();
                }
            } catch (e) {}
        }, 3000);
    },

    stopPharmacistPolling: function() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    },

    isLoggedIn: function() {
        const token = (window.API && typeof API.getToken === 'function') ? API.getToken() : (localStorage.getItem('shop_token') || localStorage.getItem('token'));
        const user = (window.API && typeof API.getCurrentUser === 'function') ? API.getCurrentUser() : (window.Storage ? Storage.get('shop_user') : null);
        return !!(token && user);
    },

    getCurrentUser: function() {
        return (window.API && typeof API.getCurrentUser === 'function') ? API.getCurrentUser() : (window.Storage ? Storage.get('shop_user') : null);
    },

    getLoginUrl: function() {
        const path = window.location.pathname;
        if (path.includes('/pages/customer/')) {
            return '../public/shop-login.html';
        }
        return 'shop-login.html';
    },

    getTimeGreeting: function() {
        const hour = new Date().getHours();
        if(hour >= 5 && hour < 12) return 'Chào buổi sáng';
        if(hour >= 12 && hour < 18) return 'Chào buổi chiều';
        if(hour >= 18 && hour < 22) return 'Chào buổi tối';
        return 'Chào bạn';
    },

    getContextHelp: function() {
        const path = window.location.pathname;
        if(path.includes('shop-detail')) {
            return 'Bạn đang xem chi tiết sản phẩm. Bạn có thắc mắc gì về công dụng hay cách dùng không?';
        } else if(path.includes('checkout')) {
            return 'Bạn đang ở bước thanh toán. Nếu gặp khó khăn khi nhập thông tin, hãy cho tôi biết nhé!';
        } else if(path.includes('index.html')) {
            return 'Bạn muốn tìm sản phẩm nào, hay cần gợi ý danh mục nổi bật hôm nay?';
        } else if(path.includes('wishlist')) {
            return 'Danh sách yêu thích của bạn tuyệt quá! Cần thông tin thêm về sản phẩm nào không?';
        }
        return 'Tôi có thể giúp bạn tra cứu nhanh thông tin sản phẩm và tư vấn các vấn đề cơ bản.';
    },

    showContextTooltip: function() {
        const tt = document.getElementById('aina-tooltip');
        if(tt && (document.getElementById('shop-ai-window').style.display === 'none' || document.getElementById('shop-ai-window').style.display === '')) {
            tt.innerText = this.getContextHelp();
            tt.style.display = 'block';
            setTimeout(() => {
                tt.style.display = 'none';
            }, 8000);
        }
    },

    toggle: function() {
        const win = document.getElementById('shop-ai-window');
        const tt = document.getElementById('aina-tooltip');
        if(win.style.display === 'none' || win.style.display === '') {
            win.style.display = 'flex';
            if(tt) tt.style.display = 'none';

            this.updateHeaderAuthButtons();
            this.renderAiMessages();
            const chat = document.getElementById('shop-ai-messages');
            if (chat) chat.scrollTop = chat.scrollHeight;
        } else {
            win.style.display = 'none';
        }
    },

    ask: function(q) {
        document.getElementById('shop-ai-input').value = q;
        this.send();
    },

    send: async function() {
        const input = document.getElementById('shop-ai-input');
        const text = input.value.trim();
        if(!text) return;

        if (!this.isLoggedIn()) {
            this.appendMsg('user', text, false);
            input.value = '';
            this.appendMsg('ai', `🔒 <strong>Bạn chưa đăng nhập!</strong><br><br>Tính năng Trợ lý Dược sĩ AI yêu cầu đăng nhập tài khoản khách hàng để đảm bảo an toàn tư vấn và lưu trữ lịch sử.<br><br><a href="${this.getLoginUrl()}" style="display:inline-flex; align-items:center; gap:6px; padding:8px 16px; background:#2563eb; color:white; border-radius:20px; text-decoration:none; font-weight:600; font-size:0.85rem; box-shadow:0 3px 8px rgba(37,99,235,0.3);"><i class="fa-solid fa-arrow-right-to-bracket"></i> Đăng nhập ngay</a>`, false);
            return;
        }
        
        input.value = '';
        this.appendMsg('user', text, true);
        this.appendTyping();

        try {
            const res = await API.post('/api/goi-y-ai/hoi', { cauHoi: text });
            this.removeTyping();
            if (res && res.traLoi) {
                let formatted = res.traLoi
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\n/g, '<br><br>')
                    .replace(/\n/g, '<br>');
                this.appendMsg('ai', formatted, true);
                return;
            }
        } catch (err) {
            this.removeTyping();
            console.warn('Lỗi gọi AI backend:', err);
            if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('đăng nhập') || err.message.toLowerCase().includes('token'))) {
                this.appendMsg('ai', `🔒 Phiên đăng nhập của bạn đã hết hạn hoặc chưa hợp lệ. Vui lòng <a href="${this.getLoginUrl()}" style="color:#2563eb; font-weight:600; text-decoration:underline;">đăng nhập lại</a> để tiếp tục sử dụng trợ lý AI.`, false);
                return;
            }
            this.processQuery(text.toLowerCase());
            return;
        }

        this.removeTyping();
        this.processQuery(text.toLowerCase());
    },

    saveAiMessage: function(role, text) {
        try {
            let history = [];
            try {
                const raw = localStorage.getItem('aina_messenger_ai_history');
                if (raw) history = JSON.parse(raw);
            } catch (e) { history = []; }

            const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            history.push({
                role: role === 'user' ? 'user' : 'agent',
                author: role === 'user' ? 'Bạn' : 'Trợ lý Dược sĩ AINA',
                text: text,
                time: timeStr
            });

            if (history.length > 20) {
                history = history.slice(-20);
            }
            localStorage.setItem('aina_messenger_ai_history', JSON.stringify(history));
        } catch (e) {
            console.warn('Lỗi lưu lịch sử AI:', e);
        }
    },

    updateHeaderAuthButtons: function() {
        const logged = this.isLoggedIn();
        const btnNew = document.getElementById('btn-shop-ai-new-chat');
        const btnExpand = document.getElementById('btn-shop-ai-expand');
        if (btnNew) btnNew.style.display = logged ? 'inline-flex' : 'none';
        if (btnExpand) btnExpand.style.display = logged ? 'inline-flex' : 'none';
    },

    showConfirmPopup: function(options) {
        let modal = document.getElementById('aina-custom-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'aina-custom-confirm-modal';
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
                    <button type="button" id="aina-confirm-btn-cancel" style="padding: 9px 18px; background: white; color: #475569; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.88rem; transition: all 0.15s;">
                        ${cancelText}
                    </button>
                    <button type="button" id="aina-confirm-btn-ok" style="padding: 9px 20px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.88rem; box-shadow: 0 4px 12px rgba(37,99,235,0.25); transition: all 0.15s;">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        const btnOk = document.getElementById('aina-confirm-btn-ok');
        const btnCancel = document.getElementById('aina-confirm-btn-cancel');

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

    showCustomToast: function(msg, type = 'success') {
        if (window.App && typeof App.showToast === 'function') {
            App.showToast(msg, type);
            return;
        }
        let toast = document.getElementById('shop-ai-inline-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'shop-ai-inline-toast';
            toast.style.cssText = 'position:fixed; top:24px; right:24px; z-index:1000002; padding:12px 20px; border-radius:12px; font-size:0.9rem; font-weight:600; display:flex; align-items:center; gap:8px; box-shadow:0 10px 25px rgba(0,0,0,0.15); transition:all 0.3s cubic-bezier(0.16,1,0.3,1);';
            document.body.appendChild(toast);
        }
        const bg = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#2563eb');
        toast.style.background = bg;
        toast.style.color = '#fff';
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${msg}</span>`;
        toast.style.display = 'flex';
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 2500);
    },

    resetAiChat: function() {
        this.showConfirmPopup({
            title: 'Bắt đầu cuộc trò chuyện mới?',
            message: 'Toàn bộ nội dung trao đổi hiện tại với Trợ lý AI sẽ được làm mới để bắt đầu lại từ đầu.\n\nThao tác này không thể hoàn tác.',
            confirmText: 'Làm mới ngay',
            cancelText: 'Hủy bỏ',
            onConfirm: () => {
                localStorage.removeItem('aina_messenger_ai_history');
                this.renderAiMessages();
                this.showCustomToast('Đã bắt đầu cuộc trò chuyện mới!', 'success');
            }
        });
    },

    renderAiMessages: function() {
        this.updateHeaderAuthButtons();
        const chat = document.getElementById('shop-ai-messages');
        if (!chat) return;

        const isLoggedIn = this.isLoggedIn();
        const authNoticeHtml = !isLoggedIn ? `
            <div id="shop-ai-auth-banner" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:10px 14px; margin-bottom:10px; color:#1e40af; font-size:0.83rem; line-height:1.4; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; align-items:flex-start; gap:8px;">
                    <i class="fa-solid fa-lock" style="color:#2563eb; margin-top:2px; font-size:0.95rem;"></i>
                    <div>
                        <strong>Yêu cầu đăng nhập:</strong> Chỉ khách hàng có tài khoản đã đăng nhập mới được phép hỏi đáp với Trợ lý AI để đảm bảo an toàn tư vấn.
                    </div>
                </div>
                <a href="${this.getLoginUrl()}" style="display:inline-flex; align-items:center; gap:6px; align-self:flex-end; background:#2563eb; color:white; padding:5px 12px; border-radius:20px; text-decoration:none; font-weight:600; font-size:0.78rem; box-shadow:0 2px 6px rgba(37,99,235,0.3);">
                    <i class="fa-solid fa-arrow-right-to-bracket"></i> Đăng nhập ngay
                </a>
            </div>
        ` : '';

        let history = [];
        try {
            const raw = localStorage.getItem('aina_messenger_ai_history');
            if (raw) history = JSON.parse(raw);
        } catch (e) { history = []; }

        let html = authNoticeHtml;

        if (history && history.length > 0) {
            history.forEach(item => {
                const isUser = item.role === 'user';
                const style = isUser
                    ? 'align-self:flex-end; background:linear-gradient(135deg, #3b82f6, #2563eb); color:white; border-top-right-radius:4px; border:none; box-shadow:0 4px 10px rgba(37,99,235,0.2);'
                    : 'align-self:flex-start; background:white; border:1px solid var(--shop-border); border-top-left-radius:4px; color:var(--shop-text); box-shadow:0 2px 8px rgba(0,0,0,0.04);';
                
                let textFormatted = item.text || '';
                if (!textFormatted.includes('<br>') && !textFormatted.includes('<p>') && !textFormatted.includes('<strong>')) {
                    textFormatted = textFormatted
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n\n/g, '<br><br>')
                        .replace(/\n/g, '<br>');
                }

                html += `
                    <div style="padding:12px 16px; border-radius:18px; max-width:85%; font-size:0.95rem; line-height:1.5; ${style}">
                        ${textFormatted}
                    </div>
                `;
            });
        } else {
            const greeting = this.getTimeGreeting();
            const currentUser = this.getCurrentUser();
            const firstMsg = isLoggedIn
                ? `${greeting}, <strong>${currentUser?.name || currentUser?.hoTen || 'Quý khách'}</strong>! Tôi là Trợ lý Dược sĩ AINA. ${this.getContextHelp()}`
                : `${greeting}! Tôi là Trợ lý Dược sĩ AINA. Để được tư vấn chi tiết về thuốc và sức khỏe, bạn vui lòng đăng nhập tài khoản nhé!`;
            html += `
                <div style="align-self:flex-start; background:white; padding:12px 16px; border-radius:18px; border-top-left-radius:4px; max-width:85%; font-size:0.95rem; border:1px solid var(--shop-border); box-shadow:0 2px 8px rgba(0,0,0,0.04); color:var(--shop-text);">
                    ${firstMsg}
                </div>
            `;
        }

        chat.innerHTML = html;
        chat.scrollTop = chat.scrollHeight;
    },

    appendMsg: function(sender, text, shouldSave = true) {
        const chat = document.getElementById('shop-ai-messages');
        if (!chat) return;

        let style = '';
        if(sender === 'user') {
            style = 'align-self:flex-end; background:linear-gradient(135deg, #3b82f6, #2563eb); color:white; border-top-right-radius:4px; border:none; box-shadow:0 4px 10px rgba(37,99,235,0.2);';
        } else {
            style = 'align-self:flex-start; background:white; border:1px solid var(--shop-border); border-top-left-radius:4px; color:var(--shop-text); box-shadow:0 2px 8px rgba(0,0,0,0.04);';
        }
        
        const html = `
            <div style="padding:12px 16px; border-radius:18px; max-width:85%; font-size:0.95rem; line-height:1.5; ${style}">
                ${text}
            </div>
        `;
        chat.insertAdjacentHTML('beforeend', html);
        chat.scrollTop = chat.scrollHeight;

        if (shouldSave) {
            this.saveAiMessage(sender, text);
        }
    },

    appendTyping: function() {
        const chat = document.getElementById('shop-ai-messages');
        const html = `
            <div id="shop-ai-typing" style="align-self:flex-start; background:white; padding:12px 20px; border-radius:18px; border-top-left-radius:4px; max-width:85%; border:1px solid var(--shop-border); color:var(--shop-text-muted); display:flex; gap:6px; align-items:center;">
                <div style="width:6px; height:6px; background:#94a3b8; border-radius:50%; animation:fade 1s infinite alternate;"></div>
                <div style="width:6px; height:6px; background:#94a3b8; border-radius:50%; animation:fade 1s infinite alternate; animation-delay:0.2s;"></div>
                <div style="width:6px; height:6px; background:#94a3b8; border-radius:50%; animation:fade 1s infinite alternate; animation-delay:0.4s;"></div>
            </div>
        `;

        if(!document.getElementById('aina-typing-style')) {
            const style = document.createElement('style');
            style.id = 'aina-typing-style';
            style.innerHTML = `@keyframes fade { 0% { opacity: 0.3; transform:translateY(0); } 100% { opacity: 1; transform:translateY(-3px); } }`;
            document.head.appendChild(style);
        }

        chat.insertAdjacentHTML('beforeend', html);
        chat.scrollTop = chat.scrollHeight;
    },

    removeTyping: function() {
        const typing = document.getElementById('shop-ai-typing');
        if(typing) typing.remove();
    },

    processQuery: function(q) {
        const products = Storage.get('products') || [];

        

        if (q.includes('chữa bệnh') || q.includes('đơn thuốc') || q.includes('điều trị') || q.includes('kê đơn') || q.includes('uống thế nào để khỏi')) {
            this.appendMsg('ai', '⚠️ Xin lỗi, AINA được lập trình để cung cấp thông tin sản phẩm và <strong>không được phép chẩn đoán, tư vấn điều trị hay kê đơn thuốc</strong> thay cho bác sĩ. Vui lòng đến cơ sở y tế gần nhất hoặc liên hệ dược sĩ chuyên môn để được tư vấn chính xác.');
            return;
        }

        if (q.includes('đau đầu') || q.includes('giảm đau') || q.includes('nhức đầu')) {
            const match = products.find(p => p.name.toLowerCase().includes('panadol') || p.category.includes('Giảm đau'));
            if(match) {
                this.appendMsg('ai', `AINA gợi ý sản phẩm phổ biến mang tính <strong>tham khảo</strong>: <strong>${match.name}</strong> (${App.formatCurrency(match.price)}).<br><br><em>Lưu ý: Xin vui lòng đọc kỹ hướng dẫn sử dụng và tham khảo ý kiến chuyên gia trước khi dùng.</em><br><br><a href="shop-detail.html?id=${match.id}" style="display:inline-block; margin-top:8px; padding:6px 12px; background:#eff6ff; color:#2563eb; border-radius:15px; text-decoration:none; font-weight:600; font-size:0.85rem;">Xem chi tiết sản phẩm</a>`);
                return;
            }
        }

        if (q.includes('vitamin') || q.includes('đề kháng') || q.includes('miễn dịch')) {
            const matches = products.filter(p => p.name.toLowerCase().includes('vitamin'));
            if(matches.length > 0) {
                this.appendMsg('ai', `Hiện AINA tìm thấy ${matches.length} loại Vitamin trong hệ thống. Nổi bật nhất là <strong>${matches[0].name}</strong> với giá ${App.formatCurrency(matches[0].price)}. Sản phẩm rất tốt để hỗ trợ nâng cao sức đề kháng.<br><br><a href="shop-detail.html?id=${matches[0].id}" style="display:inline-block; margin-top:8px; padding:6px 12px; background:#eff6ff; color:#2563eb; border-radius:15px; text-decoration:none; font-weight:600; font-size:0.85rem;">Xem chi tiết</a>`);
                return;
            }
        }

        if (q.includes('khuyến mãi') || q.includes('giảm giá') || q.includes('sale')) {
            const matches = products.filter(p => p.discount > 0);
            if(matches.length > 0) {
                this.appendMsg('ai', `Tin vui đây! AINA thấy hệ thống đang có ${matches.length} sản phẩm giảm giá cực mạnh. Bạn hãy bấm vào danh mục "Khuyến mãi" trên thanh Menu để xem và săn deal nhé!`);
                return;
            }
        }

        const found = products.find(p => q.includes(p.name.toLowerCase().split(' ')[0]));
        if (found) {
             this.appendMsg('ai', `AINA tìm thấy sản phẩm <strong>${found.name}</strong> (${App.formatCurrency(found.price)}) phù hợp với câu hỏi của bạn.<br><br><a href="shop-detail.html?id=${found.id}" style="display:inline-block; margin-top:8px; padding:6px 12px; background:#eff6ff; color:#2563eb; border-radius:15px; text-decoration:none; font-weight:600; font-size:0.85rem;">Xem ngay</a>`);
             return;
        }

        this.appendMsg('ai', 'AINA chưa tìm được thông tin phù hợp cho câu hỏi của bạn trong cơ sở dữ liệu. Để được tư vấn chuyên sâu hơn, bạn vui lòng liên hệ dược sĩ qua số Hotline 1900 1234 nhé!');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ShopAI.init();
});
