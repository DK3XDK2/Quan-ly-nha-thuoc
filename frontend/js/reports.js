const Reports = {
    orders: [],
    chartInstance: null,

    init: async function() {
        App.showLoading();
        try {
            const [listHoaDon, listDonHang] = await Promise.all([
                API.get('/api/hoa-don').catch(() => null),
                API.get('/api/don-hang/quan-ly').catch(() => null)
            ]);

            if (listHoaDon === null && listDonHang === null) {

                this.orders = Storage.get('orders') || [];
            } else {
                let combined = [];

                if (listHoaDon) {
                    listHoaDon.forEach(hd => {
                        combined.push({
                            status: hd.trangThai || 'HOAN_TAT',
                            timestamp: hd.ngayTao || hd.taoLuc || hd.createdAt || new Date().toISOString(),
                            summary: { total: Number(hd.tongTien) || 0 },
                            items: (hd.chiTietHoaDon || hd.chiTiet || []).map(i => ({
                                id: i.maThuoc || i.thuoc?.maThuoc || 'N/A',
                                name: i.thuoc?.tenThuoc || i.tenThuoc || 'Sản phẩm',
                                quantity: Number(i.soLuong) || 0
                            }))
                        });
                    });
                }

                if (listDonHang) {
                    listDonHang.forEach(dh => {
                        combined.push({
                            status: dh.trangThai === 'HUY' ? 'CANCELLED' : 'COMPLETED',
                            timestamp: dh.taoLuc || dh.ngayTao || dh.createdAt || new Date().toISOString(),
                            summary: { total: Number(dh.tongThanhToan) || Number(dh.tongTien) || 0 },
                            items: (dh.chiTietDonHang || dh.chiTiet || []).map(i => ({
                                id: i.thuocId || i.maThuoc || i.thuoc?.maThuoc || 'N/A',
                                name: i.thuoc?.tenThuoc || i.tenThuoc || 'Sản phẩm',
                                quantity: Number(i.soLuong) || 0
                            }))
                        });
                    });
                }
                this.orders = combined;
            }
        } catch(e) {
            console.error(e);
            this.orders = Storage.get('orders') || [];
        } finally {
            App.hideLoading();
        }
        
        this.generate();
    },

    generate: function() {
        const period = document.getElementById('report-period').value;
        const now = new Date();
        
        let filteredOrders = this.orders.filter(o => o.status !== 'CANCELLED');
        
        if (period === 'today') {
            const todayStr = now.toISOString().split('T')[0];
            filteredOrders = filteredOrders.filter(o => o.timestamp.startsWith(todayStr));
        } else if (period === '7days') {
            const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredOrders = filteredOrders.filter(o => new Date(o.timestamp) >= last7Days);
        } else if (period === 'thismonth') {
            const monthStr = now.toISOString().slice(0, 7);
            filteredOrders = filteredOrders.filter(o => o.timestamp.startsWith(monthStr));
        }

        let totalRevenue = 0;
        let totalItems = 0;
        let productSales = {};

        filteredOrders.forEach(o => {
            totalRevenue += o.summary.total;
            o.items.forEach(item => {
                totalItems += item.quantity;
                if (!productSales[item.id]) {
                    productSales[item.id] = { name: item.name, qty: 0 };
                }
                productSales[item.id].qty += item.quantity;
            });
        });

        const profit = totalRevenue * 0.3;

        document.getElementById('rep-revenue').innerText = App.formatCurrency(totalRevenue);
        document.getElementById('rep-profit').innerText = App.formatCurrency(profit);
        document.getElementById('rep-orders').innerText = filteredOrders.length;
        document.getElementById('rep-items').innerText = totalItems;

        this.currentProductSales = productSales;
        this.filteredOrders = filteredOrders;

        this.renderTopProducts(productSales);

        let chartMap = {};
        filteredOrders.forEach(o => {
            const dateStr = new Date(o.timestamp).toLocaleDateString('vi-VN');
            if (!chartMap[dateStr]) chartMap[dateStr] = 0;
            chartMap[dateStr] += o.summary.total;
        });


        let chartLabels = Object.keys(chartMap).sort((a,b) => {
            let [d1,m1,y1] = a.split('/');
            let [d2,m2,y2] = b.split('/');
            return new Date(y1, m1-1, d1) - new Date(y2, m2-1, d2);
        });
        
        let chartData = chartLabels.map(label => chartMap[label]);

        if(chartLabels.length === 0) {
            chartLabels = ['Không có dữ liệu'];
            chartData = [0];
        }

        this.renderChart(chartLabels, chartData);
    },

    toggleExportMenu: function(e) {
        if(e) e.stopPropagation();
        const menu = document.getElementById('export-menu');
        if (menu) {
            const isHidden = menu.style.display === 'none';
            menu.style.display = isHidden ? 'block' : 'none';
        }
    },

    printReport: function(e) {
        if(e) e.preventDefault();
        document.getElementById('export-menu').style.display = 'none';
        window.print();
    },

    exportPDF: function(e) {
        if(e) e.preventDefault();
        document.getElementById('export-menu').style.display = 'none';
        
        const element = document.querySelector('.page-content');
        if (typeof html2pdf !== 'undefined') {
            App.showLoading();
            const opt = {
                margin:       0.3,
                filename:     `BaoCao_KinhDoanh_${new Date().toISOString().slice(0, 10)}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save().then(() => {
                App.hideLoading();
                if (typeof App !== 'undefined' && App.showToast) {
                    App.showToast('Đã tải xuống file PDF thành công!', 'success');
                }
            }).catch(err => {
                App.hideLoading();
                console.error("PDF generation error:", err);
                window.print();
            });
        } else {
            window.print();
        }
    },

    exportWord: function(e) {
        if(e) e.preventDefault();
        document.getElementById('export-menu').style.display = 'none';
        
        const periodSelect = document.getElementById('report-period');
        const periodText = periodSelect ? periodSelect.options[periodSelect.selectedIndex].text : 'Tất cả';
        const rev = document.getElementById('rep-revenue').innerText;
        const profit = document.getElementById('rep-profit').innerText;
        const orders = document.getElementById('rep-orders').innerText;
        const items = document.getElementById('rep-items').innerText;

        let wordHTML = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Báo cáo Kinh doanh</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                    h1 { color: #007bff; text-align: center; }
                    .card { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #007bff; color: white; }
                </style>
            </head>
            <body>
                <h1>BÁO CÁO KINH DOANH - AINA PHARMACY</h1>
                <p><strong>Thời gian báo cáo:</strong> ${periodText}</p>
                <p><strong>Ngày xuất báo cáo:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                <hr/>
                <div class="card">
                    <h3>Tổng quan kinh doanh</h3>
                    <p><strong>Tổng doanh thu:</strong> ${rev}</p>
                    <p><strong>Lợi nhuận ước tính (30%):</strong> ${profit}</p>
                    <p><strong>Số lượng đơn hàng:</strong> ${orders}</p>
                    <p><strong>Tổng sản phẩm đã bán:</strong> ${items}</p>
                </div>
                <h3>Danh sách Sản phẩm Bán chạy</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Mã sản phẩm</th>
                            <th>Tên sản phẩm</th>
                            <th>Số lượng bán</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const sortedProducts = Object.entries(this.currentProductSales || {}).sort((a,b) => b[1].qty - a[1].qty);
        if (sortedProducts.length === 0) {
            wordHTML += `<tr><td colspan="3" style="text-align:center;">Không có dữ liệu</td></tr>`;
        } else {
            sortedProducts.forEach(([id, p]) => {
                wordHTML += `<tr><td>${id}</td><td>${p.name}</td><td>${p.qty}</td></tr>`;
            });
        }

        wordHTML += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', wordHTML], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BaoCao_KinhDoanh_${new Date().toISOString().slice(0, 10)}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (typeof App !== 'undefined' && App.showToast) {
            App.showToast('Xuất file Word (.doc) thành công!', 'success');
        }
    },

    exportCSV: function(e) {
        if(e) e.preventDefault();
        document.getElementById('export-menu').style.display = 'none';
        
        const periodSelect = document.getElementById('report-period');
        const periodText = periodSelect ? periodSelect.options[periodSelect.selectedIndex].text : 'Tất cả';
        const rev = document.getElementById('rep-revenue').innerText;
        const profit = document.getElementById('rep-profit').innerText;
        const orders = document.getElementById('rep-orders').innerText;
        const items = document.getElementById('rep-items').innerText;

        let csv = "\uFEFF";
        csv += "BÁO CÁO KINH DOANH - AINA PHARMACY\n";
        csv += `Thời gian báo cáo:,${periodText}\n`;
        csv += `Ngày xuất báo cáo:,${new Date().toLocaleString('vi-VN')}\n\n`;

        csv += "TỔNG QUAN HỌAT ĐỘNG KINH DOANH\n";
        csv += "Tổng doanh thu,Lợi nhuận ước tính (30%),Số lượng đơn hàng,Tổng sản phẩm đã bán\n";
        csv += `"${rev}","${profit}","${orders}","${items}"\n\n`;

        csv += "DANH SÁCH SẢN PHẨM BÁN CHẠY\n";
        csv += "Mã SP,Tên sản phẩm,Số lượng bán\n";

        const sortedProducts = Object.entries(this.currentProductSales || {}).sort((a,b) => b[1].qty - a[1].qty);
        if (sortedProducts.length === 0) {
            csv += "N/A,Không có dữ liệu,0\n";
        } else {
            sortedProducts.forEach(([id, p]) => {
                const cleanName = (p.name || '').replace(/"/g, '""');
                csv += `"${id}","${cleanName}",${p.qty}\n`;
            });
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BaoCao_KinhDoanh_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        if (typeof App !== 'undefined' && App.showToast) {
            App.showToast('Xuất báo cáo Excel (CSV) thành công!', 'success');
        }
    },

    exportJSON: function(e) {
        if(e) e.preventDefault();
        document.getElementById('export-menu').style.display = 'none';

        const periodSelect = document.getElementById('report-period');
        const data = {
            title: "Báo cáo Kinh doanh - AINA Pharmacy",
            exportedAt: new Date().toISOString(),
            period: periodSelect ? periodSelect.value : 'all',
            summary: {
                revenue: document.getElementById('rep-revenue').innerText,
                profit: document.getElementById('rep-profit').innerText,
                totalOrders: document.getElementById('rep-orders').innerText,
                totalItemsSold: document.getElementById('rep-items').innerText
            },
            topProducts: Object.entries(this.currentProductSales || {}).map(([id, p]) => ({ id, name: p.name, quantity: p.qty }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BaoCao_KinhDoanh_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (typeof App !== 'undefined' && App.showToast) {
            App.showToast('Xuất báo cáo JSON thành công!', 'success');
        }
    },

    renderTopProducts: function(productSales) {
        const sorted = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5); // top 5
        const tbody = document.getElementById('rep-top-products');
        
        if (sorted.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding: 1rem; color: var(--text-muted);">Không có dữ liệu</td></tr>`;
            return;
        }

        let html = '';
        sorted.forEach(p => {
            html += `
                <tr>
                    <td style="font-weight: 500;">${p.name}</td>
                    <td style="text-align: right; color: var(--primary-color); font-weight: bold;">${p.qty}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    renderChart: function(labels, data) {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Doanh thu (₫)',
                    data: data,
                    borderColor: '#007BFF',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('export-menu');
    if (menu && menu.style.display === 'block') {
        if (!e.target.closest('.dropdown')) {
            menu.style.display = 'none';
        }
    }
});
