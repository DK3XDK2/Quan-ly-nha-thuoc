
const Checkout = {
    cartItems: [],
    total: 0,
    isBuyNow: false,

    getCurrentUser: function() {
        try {
            if (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function') {
                const u = Auth.getCurrentUser();
                if (u) return u;
            }
            if (typeof API !== 'undefined' && typeof API.getCurrentUser === 'function') {
                const u = API.getCurrentUser();
                if (u) return u;
            }
            const s = localStorage.getItem('shop_user') || localStorage.getItem('currentUser');
            return s ? JSON.parse(s) : null;
        } catch(e) {
            return null;
        }
    },

    detectLocation: function() {
        if (!navigator.geolocation) {
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Trình duyệt của bạn không hỗ trợ định vị GPS.', 'warning');
            } else {
                alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
            }
            return;
        }

        const btn = document.getElementById('btn-detect-location');
        const addrInput = document.getElementById('co-address');
        const errEl = document.getElementById('err-address');
        const origContent = btn ? btn.innerHTML : '';

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang định vị...';
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                try {
                    let addressText = '';

                    // 1. Thử qua ArcGIS World Geocode (chính xác đến số nhà, tên đường, không bị chặn tại VN)
                    try {
                        const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=pjson&location=${lon},${lat}`;
                        const resArcgis = await fetch(arcgisUrl);
                        if (resArcgis.ok) {
                            const data = await resArcgis.json();
                            if (data && data.address) {
                                const a = data.address;
                                addressText = a.Match_addr || a.LongLabel || [a.Address, a.District, a.City, a.Region].filter(Boolean).join(', ');
                            }
                        }
                    } catch (eArcgis) {
                        console.warn('ArcGIS geocoding failed, trying fallback:', eArcgis);
                    }

                    // 2. Dự phòng qua BigDataCloud Reverse Geocode Client
                    if (!addressText) {
                        try {
                            const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`;
                            const resBdc = await fetch(bdcUrl);
                            if (resBdc.ok) {
                                const data = await resBdc.json();
                                const parts = [];
                                if (data.locality) parts.push(data.locality);
                                if (data.city && data.city !== data.locality) parts.push(data.city);
                                else if (data.principalSubdivision && data.principalSubdivision !== data.locality) parts.push(data.principalSubdivision);
                                if (data.countryName) parts.push(data.countryName);
                                if (parts.length > 0) addressText = parts.join(', ');
                            }
                        } catch (eBdc) {
                            console.warn('BigDataCloud fallback failed:', eBdc);
                        }
                    }

                    // 3. Dự phòng qua Nominatim
                    if (!addressText) {
                        try {
                            const resNom = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`);
                            if (resNom.ok) {
                                const data = await resNom.json();
                                addressText = data.display_name || '';
                            }
                        } catch (eNom) {
                            console.warn('Nominatim fallback failed:', eNom);
                        }
                    }

                    if (!addressText) {
                        throw new Error('Không thể giải mã địa chỉ từ các nguồn định vị');
                    }

                    if (addrInput) {
                        addrInput.value = addressText;
                        if (errEl) errEl.style.display = 'none';
                        addrInput.classList.remove('is-invalid');
                        addrInput.focus();
                    }

                    if (typeof App !== 'undefined' && App.showToast) {
                        App.showToast('Đã lấy vị trí hiện tại thành công!', 'success');
                    }
                } catch (err) {
                    console.error('Lỗi định vị:', err);
                    if (typeof App !== 'undefined' && App.showToast) {
                        App.showToast('Không thể giải mã địa chỉ từ tọa độ GPS.', 'warning');
                    }
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = origContent;
                    }
                }
            },
            (error) => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = origContent;
                }
                let msg = 'Không thể lấy vị trí hiện tại.';
                if (error.code === 1) {
                    msg = 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép quyền vị trí trên trình duyệt.';
                } else if (error.code === 2) {
                    msg = 'Không thể xác định vị trí GPS từ thiết bị/mạng.';
                } else if (error.code === 3) {
                    msg = 'Quá thời gian chờ lấy vị trí.';
                }
                if (typeof App !== 'undefined' && App.showToast) {
                    App.showToast(msg, 'warning');
                } else {
                    alert(msg);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    },

    init: function() {
        const urlParams = new URLSearchParams(window.location.search);
        this.isBuyNow = urlParams.get('mode') === 'buynow';

        if (this.isBuyNow) {
            this.cartItems = Storage.get('buy_now_item') || [];
        } else {
            this.cartItems = Storage.get('shop_cart') || [];
        }

        if (this.cartItems.length === 0) {
            const container = document.getElementById('co-items');
            if (container) {
                container.innerHTML = '<div style="color:#ef4444; padding:10px 0; font-size:0.875rem;"><i class="fa-solid fa-circle-exclamation"></i> Giỏ hàng đang trống. Vui lòng chọn sản phẩm trước khi thanh toán.</div>';
            }
            const btn = document.querySelector('.btn-checkout');
            if (btn) btn.disabled = true;
            return;
        }

        const user = this.getCurrentUser();
        if (user) {
            const nameEl = document.getElementById('co-name');
            const phoneEl = document.getElementById('co-phone');
            const addrEl = document.getElementById('co-address');

            if (nameEl && !nameEl.value) nameEl.value = user.name || user.hoTen || '';
            if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || user.soDienThoai || '';
            if (addrEl && !addrEl.value) addrEl.value = user.address || user.diaChi || '';
        }

        this.bindEvents();
        this.renderOrderSummary();
    },

    bindEvents: function() {
        const phoneInput = document.getElementById('co-phone');
        const nameInput = document.getElementById('co-name');
        const addressInput = document.getElementById('co-address');

        if (phoneInput) {
            phoneInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
                const err = document.getElementById('err-phone');
                if (this.value.length > 0 && !this.value.match(/^[0-9]{10,11}$/)) {
                    this.style.borderColor = '#ef4444';
                    if (err) { err.innerText = 'Số điện thoại phải từ 10 đến 11 chữ số'; err.style.display = 'block'; }
                } else {
                    this.style.borderColor = 'var(--shop-border)';
                    if (err) err.style.display = 'none';
                }
            });
        }

        if (nameInput) {
            nameInput.addEventListener('input', function() {
                const err = document.getElementById('err-name');
                if (this.value.trim().length > 0 && this.value.trim().length < 2) {
                    this.style.borderColor = '#ef4444';
                    if (err) { err.innerText = 'Họ và tên phải ít nhất 2 ký tự'; err.style.display = 'block'; }
                } else {
                    this.style.borderColor = 'var(--shop-border)';
                    if (err) err.style.display = 'none';
                }
            });
        }

        if (addressInput) {
            addressInput.addEventListener('input', function() {
                const err = document.getElementById('err-address');
                if (this.value.trim().length > 0 && this.value.trim().length < 5) {
                    this.style.borderColor = '#ef4444';
                    if (err) { err.innerText = 'Địa chỉ giao hàng quá ngắn (tối thiểu 5 ký tự)'; err.style.display = 'block'; }
                } else {
                    this.style.borderColor = 'var(--shop-border)';
                    if (err) err.style.display = 'none';
                }
            });
        }
    },

    renderOrderSummary: function() {
        const container = document.getElementById('co-items');
        if (!container) return;

        let html = '';
        this.total = 0;

        this.cartItems.forEach(item => {
            const price = Number(item.price || item.giaBan || 0);
            const qty = Number(item.quantity || 1);
            const itemTotal = price * qty;
            this.total += itemTotal;
            html += `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.875rem;">
                    <div style="flex:1; padding-right:10px;">${item.name || item.tenThuoc || 'Sản phẩm'} <strong style="color:var(--shop-primary);">x${qty}</strong></div>
                    <div style="font-weight:600;">${App.formatCurrency(itemTotal)}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        const subtotalEl = document.getElementById('co-subtotal');
        if (subtotalEl) subtotalEl.innerText = App.formatCurrency(this.total);
        const totalEl = document.getElementById('co-total');
        if (totalEl) totalEl.innerText = App.formatCurrency(this.total);
    },

    placeOrder: async function() {
        const name = document.getElementById('co-name').value.trim();
        const phone = document.getElementById('co-phone').value.trim();
        const address = document.getElementById('co-address').value.trim();
        const note = (document.getElementById('co-note')?.value || '').trim();
        const paymentElem = document.querySelector('input[name="payment"]:checked');
        const payment = paymentElem ? paymentElem.value : 'CASH';

        ['name', 'phone', 'address'].forEach(id => {
            const el = document.getElementById(`co-${id}`);
            const err = document.getElementById(`err-${id}`);
            if (el) el.style.borderColor = 'var(--shop-border)';
            if (err) err.style.display = 'none';
        });

        if (!name || name.length < 2) {
            document.getElementById('co-name').style.borderColor = '#ef4444';
            const err = document.getElementById('err-name');
            if (err) { err.innerText = 'Vui lòng nhập họ và tên hợp lệ (tối thiểu 2 ký tự)'; err.style.display = 'block'; }
            document.getElementById('co-name').focus();
            return;
        }

        if (!phone || !phone.match(/^[0-9]{10,11}$/)) {
            document.getElementById('co-phone').style.borderColor = '#ef4444';
            const err = document.getElementById('err-phone');
            if (err) { err.innerText = 'Số điện thoại không hợp lệ (phải gồm 10 đến 11 chữ số)'; err.style.display = 'block'; }
            document.getElementById('co-phone').focus();
            return;
        }

        if (!address || address.length < 5) {
            document.getElementById('co-address').style.borderColor = '#ef4444';
            const err = document.getElementById('err-address');
            if (err) { err.innerText = 'Vui lòng nhập địa chỉ giao hàng cụ thể hơn (tối thiểu 5 ký tự)'; err.style.display = 'block'; }
            document.getElementById('co-address').focus();
            return;
        }

        try {
            App.showLoading();

            const user = this.getCurrentUser();
            const payload = {
                tenNguoiNhan: name,
                soDienThoaiNhan: phone,
                emailNguoiNhan: user?.email || `${phone}@domain.com`,
                diaChiGiao: address,
                ghiChu: note,
                phiGiaoHang: 0,
                phuongThucThanhToan: payment === 'SEPAY' ? 'SEPAY' : 'CASH',
                chiTiet: this.cartItems.map(item => ({
                    thuocId: Number(item.dbId || item.id),
                    soLuong: Number(item.quantity || 1)
                }))
            };

            const endpoint = '/api/don-hang/dat-hang';
            const res = await API.post(endpoint, payload);

            if (this.isBuyNow) {
                Storage.set('buy_now_item', []);
            } else {
                Storage.set('shop_cart', []);
            }

            const createdOrder = res.duLieu || res;
            const orderCode = createdOrder.maDonHang || `DH${createdOrder.id || Date.now()}`;

            if (payment === 'SEPAY') {
                this.openSepayModal(createdOrder);
            } else {
                App.showToast('Đặt hàng thành công!', 'success');
                window.location.href = `order-success.html?id=${orderCode}`;
            }
        } catch (error) {
            App.showToast(error.message || 'Đặt hàng thất bại!', 'error');
        } finally {
            App.hideLoading();
        }
    },

    currentOrder: null,
    pollingInterval: null,

    openSepayModal: function(order) {
        this.currentOrder = order;
        const maDonHang = order.maDonHang || `DH${order.id || Date.now()}`;
        const tongTien = Number(order.tongThanhToan || this.total || 0);
        const bankId = order.bankId || 'VietinBank';
        const accountNo = order.accountNo || '102882794225';
        const accountName = order.accountName || 'VU QUANG HUY';

        const qrUrl = `https://qr.sepay.vn/img?acc=${accountNo}&bank=${bankId}&amount=${tongTien}&des=${encodeURIComponent(maDonHang)}`;
        const fallbackQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${tongTien}&addInfo=${encodeURIComponent(maDonHang)}&accountName=${encodeURIComponent(accountName)}`;

        const qrImg = document.getElementById('sepay-qr-img');
        if (qrImg) {
            qrImg.src = qrUrl;
            qrImg.onerror = function() {
                this.src = fallbackQrUrl;
            };
        }

        const bankEl = document.getElementById('sepay-bank-name');
        if (bankEl) bankEl.innerText = `${bankId} (Ngân hàng Công Thương Việt Nam)`;

        const accNoEl = document.getElementById('sepay-acc-no');
        if (accNoEl) accNoEl.innerText = accountNo;

        const accNameEl = document.getElementById('sepay-acc-name');
        if (accNameEl) accNameEl.innerText = accountName;

        const amtEl = document.getElementById('sepay-amount');
        if (amtEl) amtEl.innerText = App.formatCurrency(tongTien);

        const codeEl = document.getElementById('sepay-order-code');
        if (codeEl) codeEl.innerText = maDonHang;

        const modal = document.getElementById('sepay-modal');
        if (modal) modal.style.display = 'flex';

        this.startSepayPolling(maDonHang);
    },

    closeSepayModal: function() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        const modal = document.getElementById('sepay-modal');
        if (modal) modal.style.display = 'none';

        window.location.href = `shop-account.html#orders`;
    },

    startSepayPolling: function(maDonHang) {
        if (this.pollingInterval) clearInterval(this.pollingInterval);

        let checkCount = 0;
        this.pollingInterval = setInterval(async () => {
            checkCount++;
            try {
                const res = await API.get(`/api/thanh-toan/kiem-tra/${maDonHang}`);
                if (res && res.daThanhToan) {
                    this.onPaymentSuccess(maDonHang);
                }
            } catch (e) {
                // Ignore network error during polling
            }

            if (checkCount > 200) {
                clearInterval(this.pollingInterval);
            }
        }, 3000);
    },

    onPaymentSuccess: function(maDonHang) {
        if (this.pollingInterval) clearInterval(this.pollingInterval);

        const statusBox = document.getElementById('sepay-status-box');
        if (statusBox) {
            statusBox.style.background = '#dcfce7';
            statusBox.style.borderColor = '#86efac';
            statusBox.style.color = '#15803d';
            statusBox.innerHTML = `<i class="fa-solid fa-circle-check" style="font-size:1.2rem; color:#22c55e;"></i> <strong>Đã nhận được thanh toán thành công!</strong>`;
        }

        App.showToast('Thanh toán SePay thành công! Đang chuyển hướng...', 'success');

        setTimeout(() => {
            window.location.href = `order-success.html?id=${maDonHang}`;
        }, 1500);
    },

    confirmManualPayment: async function() {
        if (!this.currentOrder) return;
        const maDonHang = this.currentOrder.maDonHang || `DH${this.currentOrder.id || Date.now()}`;

        try {
            App.showLoading();
            await API.post(`/api/don-hang/${this.currentOrder.id || maDonHang}/trang-thai`, {
                trangThai: 'DA_XAC_NHAN'
            }).catch(() => null);

            const orders = Storage.get('orders') || [];
            const target = orders.find(o => o.maDonHang === maDonHang || String(o.id) === String(this.currentOrder.id));
            if (target) {
                target.trangThai = 'DA_XAC_NHAN';
                target.status = 'DA_XAC_NHAN';
                Storage.set('orders', orders);
            }

            this.onPaymentSuccess(maDonHang);
        } catch(e) {
            this.onPaymentSuccess(maDonHang);
        } finally {
            App.hideLoading();
        }
    },

    copyText: function(elementId, isAmount = false) {
        const el = document.getElementById(elementId);
        if (!el) return;
        let text = el.innerText.trim();
        if (isAmount) {
            text = text.replace(/[^0-9]/g, '');
        }
        navigator.clipboard.writeText(text).then(() => {
            App.showToast(`Đã sao chép: ${text}`, 'success');
        }).catch(() => {
            App.showToast('Không thể sao chép tự động', 'info');
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Checkout.init();
});
