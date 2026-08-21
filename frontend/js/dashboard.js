/**
 * Module Dashboard - Hiển thị thống kê dữ liệu thực tế từ Backend
 */
const Dashboard = {
    invoices: [],
    onlineOrders: [],
    products: [],
    chart: null,
    currentFilter: '7days',

    init: async function() {
        await this.loadData();
        this.bindEvents();
        this.updateData();
    },

    loadData: async function() {
        try {
            App.showLoading();
            const [listHoaDon, listDonHang, listThuoc] = await Promise.all([
                API.get('/api/hoa-don').catch(() => []),
                API.get('/api/don-hang/quan-ly').catch(() => []),
                API.get('/api/thuoc').catch(() => [])
            ]);

            this.invoices = listHoaDon || [];
            this.onlineOrders = listDonHang || [];
            this.products = (listThuoc || []).map(item => ({
                id: item.maThuoc || item.id,
                name: item.tenThuoc,
                price: Number(item.giaBan),
                stock: item.loTonKho ? item.loTonKho.reduce((sum, lo) => sum + lo.soLuongTon, 0) : (item.tonKho || 0),
                minStock: item.tonKhoToiThieu || 5
            }));
        } catch (e) {
            console.error('Lỗi tải dữ liệu dashboard:', e);
        } finally {
            App.hideLoading();
        }
    },

    bindEvents: function() {
        const dateInput = document.getElementById('dashboard-date-filter');
        if (dateInput && typeof flatpickr !== 'undefined') {
            const today = new Date();
            const lastWeek = new Date();
            lastWeek.setDate(today.getDate() - 7);

            flatpickr(dateInput, {
                mode: "range",
                dateFormat: "d/m/Y",
                locale: "vn",
                defaultDate: [lastWeek, today],
                onChange: (selectedDates) => {
                    if (selectedDates.length === 2) {
                        this.customStartDate = selectedDates[0];
                        this.customEndDate = selectedDates[1];
                        this.currentFilter = 'custom';
                        this.updateData();
                    }
                }
            });
            
            this.customStartDate = lastWeek;
            this.customEndDate = today;
            this.currentFilter = 'custom';
        }
    },

    updateData: function() {
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (this.currentFilter === 'custom' && this.customStartDate && this.customEndDate) {
            startDate = new Date(this.customStartDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(this.customEndDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (this.currentFilter === '7days') {
            startDate.setDate(endDate.getDate() - 7);
        } else if (this.currentFilter === '30days') {
            startDate.setDate(endDate.getDate() - 30);
        } else if (this.currentFilter === 'all') {
            startDate = new Date(0);
        }

        // Aggregate completed retail invoices + completed online orders
        const filteredInvoices = this.invoices.filter(h => {
            const d = new Date(h.taoLuc);
            return d >= startDate && d <= endDate;
        });

        const filteredOnline = this.onlineOrders.filter(o => {
            const d = new Date(o.taoLuc);
            return d >= startDate && d <= endDate && o.trangThai === 'HOAN_TAT';
        });

        const revenuePOS = filteredInvoices.reduce((sum, h) => sum + parseFloat(h.tongTien || 0), 0);
        const revenueOnline = filteredOnline.reduce((sum, o) => sum + parseFloat(o.tongThanhToan || 0), 0);
        const totalRevenue = revenuePOS + revenueOnline;

        const totalOrderCount = filteredInvoices.length + filteredOnline.length;
        const lowStock = this.products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
        const outOfStock = this.products.filter(p => p.stock === 0).length;

        const revEl = document.getElementById('revenue-today');
        if (revEl) revEl.innerText = App.formatCurrency(totalRevenue);
        
        const ordEl = document.getElementById('orders-today');
        if (ordEl) ordEl.innerText = totalOrderCount;
        
        const stockEl = document.getElementById('low-stock-count');
        if (stockEl) stockEl.innerText = lowStock + outOfStock;

        this.renderRecentOrders();
        this.renderChart(filteredInvoices, filteredOnline);
    },

    renderRecentOrders: function() {
        const tbody = document.getElementById('recent-orders');
        if (!tbody) return;

        const allRecent = [
            ...this.invoices.map(h => ({
                id: `HD${h.id}`,
                name: h.khachHang ? h.khachHang.hoTen : 'Khách lẻ',
                timestamp: h.taoLuc,
                total: parseFloat(h.tongTien),
                type: 'POS',
                statusClass: 'badge-success',
                statusText: 'Hoàn thành'
            })),
            ...this.onlineOrders.map(o => ({
                id: o.maDonHang || `DH${o.id}`,
                name: o.tenNguoiNhan || 'Khách online',
                timestamp: o.taoLuc,
                total: parseFloat(o.tongThanhToan),
                type: 'Online',
                statusClass: o.trangThai === 'HOAN_TAT' ? 'badge-success' : 'badge-warning',
                statusText: o.trangThai === 'HOAN_TAT' ? 'Hoàn tất' : 'Đang xử lý'
            }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

        if (allRecent.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Chưa có giao dịch nào</td></tr>`;
            return;
        }

        let html = '';
        allRecent.forEach(o => {
            html += `
                <tr>
                    <td style="font-weight: 500; color: var(--primary-color)">${o.id}</td>
                    <td>${o.name}</td>
                    <td>${new Date(o.timestamp).toLocaleString('vi-VN')}</td>
                    <td>${App.formatCurrency(o.total)}</td>
                    <td><span class="badge ${o.statusClass}">${o.statusText}</span></td>
                </tr>
            `;
        });
        html += `<tr><td colspan="5" style="text-align: center; cursor: pointer; color: var(--primary-color); font-size: 0.875rem;" onclick="window.location.href='orders.html'">Xem tất cả đơn hàng</td></tr>`;
        tbody.innerHTML = html;
    },

    renderChart: function(invoices, onlineOrders) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        const dateMap = {};
        invoices.forEach(h => {
            const dateStr = new Date(h.taoLuc).toLocaleDateString('vi-VN');
            dateMap[dateStr] = (dateMap[dateStr] || 0) + parseFloat(h.tongTien || 0);
        });

        onlineOrders.forEach(o => {
            const dateStr = new Date(o.taoLuc).toLocaleDateString('vi-VN');
            dateMap[dateStr] = (dateMap[dateStr] || 0) + parseFloat(o.tongThanhToan || 0);
        });

        const labels = Object.keys(dateMap).sort((a, b) => {
            const [d1, m1, y1] = a.split('/');
            const [d2, m2, y2] = b.split('/');
            return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
        });
        
        const finalLabels = labels.slice(-14);
        const finalData = finalLabels.map(l => dateMap[l]);

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: finalLabels.length > 0 ? finalLabels : ['Chưa có dữ liệu'],
                datasets: [{
                    label: 'Doanh thu (VNĐ)',
                    data: finalData.length > 0 ? finalData : [0],
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderColor: '#0ea5e9',
                    borderWidth: 2,
                    pointBackgroundColor: '#0ea5e9',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
};
