
const MockData = {
    initialize: function(forceReset = false) {
        if (forceReset) {
            Storage.clearAll();
        }

        const currentProducts = Storage.get('products');
        const hasValidImages = currentProducts && currentProducts.length > 0 && currentProducts[0].image && currentProducts[0].image.includes('v1/static');
        const needsProductReset = !currentProducts || currentProducts.length < 50 || !hasValidImages;

        if (!Storage.get('users')) this.initUsers();
        if (!Storage.get('suppliers')) this.initSuppliers();
        if (needsProductReset) this.initProductsAndBatches();
        if (!Storage.get('customers') || Storage.get('customers').length < 30) this.initCustomers();
        if (!Storage.get('orders') || Storage.get('orders').length < 50) this.initOrders();
        if (!Storage.get('notifications')) this.initNotifications();
        if (!Storage.get('settings')) this.initSettings();
    },

    initUsers: function() {
        const users = [
            { id: 'NV001', email: 'admin@pharmacy.local', password: '123', name: 'Nguyễn Admin', role: 'ADMIN', phone: '0900000001', status: 'ACTIVE' },
            { id: 'NV002', email: 'pharmacist@pharmacy.local', password: '123', name: 'Trần Dược Sĩ', role: 'PHARMACIST', phone: '0900000002', status: 'ACTIVE' },
            { id: 'NV003', email: 'cashier@pharmacy.local', password: '123', name: 'Lê Thu Ngân', role: 'CASHIER', phone: '0900000003', status: 'ACTIVE' }
        ];

        for(let i=4; i<=10; i++) {
            users.push({
                id: 'NV00' + i,
                email: `emp${i}@pharmacy.local`,
                password: '123',
                name: `Nhân viên ${i}`,
                role: i % 2 === 0 ? 'PHARMACIST' : 'CASHIER',
                phone: `090000000${i}`,
                status: i === 10 ? 'INACTIVE' : 'ACTIVE'
            });
        }
        Storage.set('users', users);
    },

    initSuppliers: function() {
        const names = ['Dược Hậu Giang', 'Traphaco', 'Sanofi', 'Mekophar', 'Domesco', 'Mega We Care', 'OPC', 'Boston Pharma', 'Imexpharm', 'Rohto'];
        const suppliers = [];
        for (let i=0; i<20; i++) {
            suppliers.push({
                id: 'NCC' + (i+1).toString().padStart(3, '0'),
                name: names[i % names.length] + (i >= names.length ? ` (CN ${i})` : ''),
                phone: '0283' + Math.floor(Math.random() * 900000),
                email: `contact${i}@supplier.com`,
                address: `Số ${Math.floor(Math.random()*100)} Nguyễn Văn Linh, HCM`,
                debt: Math.floor(Math.random() * 50000000)
            });
        }
        Storage.set('suppliers', suppliers);
    },

    initProductsAndBatches: function() {
        const today = new Date();
        const getExpiry = (days) => { const d = new Date(); d.setDate(today.getDate() + days); return d.toISOString().split('T')[0]; };
        
        const categories = ['Thuốc', 'Thực phẩm bảo vệ sức khỏe', 'Vitamin & khoáng chất', 'Chăm sóc cá nhân', 'Thiết bị y tế', 'Dược mỹ phẩm', 'Mẹ & bé', 'Chăm sóc răng miệng'];
        const brands = ['DHG Pharma', 'OPC', 'Sanofi', 'Traphaco', 'Rohto', 'Mega We Care', 'Blackmores', 'Abbott'];
        
        const baseProducts = [
            { 
                name: 'Panadol Extra', 
                ingredient: 'Paracetamol 500mg, Caffeine 65mg', 
                cat: 'Thuốc',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/DSC_099842_74c1fc532a.png'
            },
            { 
                name: 'Vitamin C 1000mg', 
                ingredient: 'Ascorbic acid 1000mg', 
                cat: 'Vitamin & khoáng chất',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/IMG_1758_33831b7cab.jpg'
            },
            { 
                name: 'Amoxicillin 500mg', 
                ingredient: 'Amoxicillin', 
                cat: 'Thuốc',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/amoxicillin_500mg_10x10_domesco_00000740_4f06bb4231.png'
            },
            { 
                name: 'Oresol Cam', 
                ingredient: 'Electrolytes', 
                cat: 'Thực phẩm bảo vệ sức khỏe',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/bot_hapacol_250_dhg_giam_dau_ha_sot_24_goi_00003627_3_cb4b38b2df.png'
            },
            { 
                name: 'Sữa rửa mặt Cetaphil', 
                ingredient: 'Purified water', 
                cat: 'Dược mỹ phẩm',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/00503325_sua_rua_mat_ngua_mun_duong_am_va_lam_sang_da_reihaku_hatomugi_acne_care_and_facial_washing_130g_9270_63ed_large_3f5868bde7.jpg'
            },
            { 
                name: 'Kem chống nắng La Roche-Posay', 
                ingredient: 'Titanium dioxide', 
                cat: 'Dược mỹ phẩm',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/IMG_9629_8628daed64.jpg'
            },
            { 
                name: 'Nước súc miệng Listerine', 
                ingredient: 'Menthol, Thymol', 
                cat: 'Chăm sóc răng miệng',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/chai_xit_nhiet_mieng_tay_chan_mieng_aloclair_plus_15ml_00502899_1_b6e114616e.jpg'
            },
            { 
                name: 'Sữa non ColosBaby', 
                ingredient: 'Sữa non', 
                cat: 'Mẹ & bé',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/Vien_ho_tro_phat_trien_nao_bo_suc_khoe_cho_mat_Brauer_Baby_and_Kids_Ultra_Pure_DHA_00033687_79d080f5b6.png'
            },
            { 
                name: 'Máy đo huyết áp Omron', 
                ingredient: 'Nhựa y tế', 
                cat: 'Thiết bị y tế',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/MAY_DO_HUYET_AP_BAP_TAY_OMRON_EZ_HEM_7183_HO_TRO_DO_HUYET_AP_NHIP_TIM_00050892_1_2073a34ed6.png'
            },
            { 
                name: 'Dầu cá Omega 3', 
                ingredient: 'Fish oil 1000mg', 
                cat: 'Vitamin & khoáng chất',
                image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/VIEN_UONG_HO_TRO_BO_GAN_GIAI_DOC_GAN_BOGANIC_PREMIUM_TRAPHACO_60_V_00050786_1_f9e9211160.jpg'
            }
        ];

        let products = [];
        let batches = [];
        let idCounter = 1;

        for (let i = 0; i < 50; i++) {
            const base = baseProducts[i % baseProducts.length];
            const price = Math.floor(Math.random() * 50) * 10000 + 20000;
            const isDiscount = Math.random() > 0.6;
            const discount = isDiscount ? Math.floor(Math.random() * 30) + 5 : 0;
            const oldPrice = isDiscount ? Math.floor(price / (1 - discount/100)) : price;
            
            const productId = 'SP' + idCounter.toString().padStart(3, '0');
            const stock = Math.floor(Math.random() * 150);

            products.push({
                id: productId,
                name: base.name + (i >= 10 ? ` (Mẫu ${i})` : ''),
                sku: productId + '-SKU',
                barcode: '893' + Math.floor(Math.random() * 1000000000),
                brand: brands[i % brands.length],
                category: base.cat,
                activeIngredient: base.ingredient,
                description: `Sản phẩm ${base.name} giúp hỗ trợ chăm sóc sức khỏe toàn diện.`,
                ingredient: base.ingredient + ' và tá dược.',
                usage: 'Sử dụng theo hướng dẫn của chuyên gia y tế.',
                price: price,
                oldPrice: oldPrice,
                cost: Math.floor(price * 0.7),
                discount: discount,
                rating: (3.5 + Math.random() * 1.5).toFixed(1),
                sold: Math.floor(Math.random() * 2000),
                stock: stock,
                minStock: 20,
                unit: i % 3 === 0 ? 'Hộp' : (i % 2 === 0 ? 'Lọ' : 'Tuýp'),
                image: base.image,
                images: [base.image],
                supplierId: 'NCC001',
                tags: isDiscount ? ['Khuyến mãi'] : ['Bán chạy'],
                status: stock === 0 ? 'INACTIVE' : 'ACTIVE'
            });

            const numBatches = stock > 0 ? (Math.random() > 0.5 ? 2 : 1) : 0;
            let remainingStock = stock;
            
            for(let b=0; b<numBatches; b++) {
                const batchStock = b === numBatches - 1 ? remainingStock : Math.floor(remainingStock / 2);
                remainingStock -= batchStock;

                let expiryDays = Math.floor(Math.random() * 800) - 10;
                if (i === 1) expiryDays = -5;
                if (i === 2) expiryDays = 15;
                
                batches.push({
                    id: 'L0' + productId + '-' + (b+1),
                    productId: productId,
                    productName: products[i].name,
                    quantity: batchStock,
                    expiryDate: getExpiry(expiryDays),
                    manufacturingDate: getExpiry(expiryDays - 700),
                    status: expiryDays < 0 ? 'EXPIRED' : (expiryDays <= 30 ? 'EXPIRING' : 'ACTIVE')
                });
            }
            idCounter++;
        }
        
        Storage.set('products', products);
        Storage.set('batches', batches);
    },

    initCustomers: function() {
        const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
        const lastNames = ['An', 'Bình', 'Châu', 'Dương', 'Hương', 'Linh', 'Minh', 'Ngọc', 'Phúc', 'Quân'];
        let customers = [];
        for (let i = 1; i <= 30; i++) {
            const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
            const points = Math.floor(Math.random() * 1000);
            customers.push({
                id: 'KH' + i.toString().padStart(3, '0'),
                name: `${fname} ${lname}`,
                phone: '09' + Math.floor(10000000 + Math.random() * 90000000),
                email: `khachhang${i}@gmail.com`,
                points: points,
                tier: points > 800 ? 'Gold' : (points > 300 ? 'Silver' : 'Member'),
                address: `Quận ${Math.floor(Math.random() * 12) + 1}, TP.HCM`,
                totalSpent: points * 10000
            });
        }
        Storage.set('customers', customers);
    },

    initOrders: function() {
        const products = Storage.get('products');
        const customers = Storage.get('customers');
        const users = Storage.get('users');
        let orders = [];

        for (let i = 1; i <= 50; i++) {
            const numItems = Math.floor(Math.random() * 4) + 1;
            let items = [];
            let total = 0;
            
            for(let j=0; j<numItems; j++) {
                const p = products[Math.floor(Math.random() * products.length)];
                const qty = Math.floor(Math.random() * 3) + 1;
                items.push({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    image: p.image,
                    quantity: qty
                });
                total += (p.price * qty);
            }

            const statuses = ['PENDING', 'PROCESSING', 'SHIPPING', 'COMPLETED', 'CANCELLED'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 60));

            const customer = customers[Math.floor(Math.random() * customers.length)];
            const employee = users[Math.floor(Math.random() * users.length)];

            orders.push({
                id: 'DH' + date.getTime().toString().slice(0,10) + i.toString().padStart(3, '0'),
                timestamp: date.toISOString(),
                customerId: customer.id,
                customerName: customer.name,
                customerPhone: customer.phone,
                customerAddress: customer.address,
                paymentMethod: Math.random() > 0.5 ? 'COD' : 'BANK',
                employeeId: employee.id,
                employeeName: employee.name,
                status: randomStatus,
                items: items,
                summary: {
                    subtotal: total,
                    tax: 0,
                    discount: Math.floor(total * (Math.random() > 0.8 ? 0.1 : 0)),
                    total: total - (Math.floor(total * (Math.random() > 0.8 ? 0.1 : 0)))
                }
            });
        }

        orders.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        Storage.set('orders', orders);
    },

    initNotifications: function() {
        const notis = [];
        const types = ['info', 'warning', 'error', 'success'];
        const messages = [
            'Sản phẩm Panadol Extra sắp hết hàng.',
            'Đơn hàng DH123456 đã được giao thành công.',
            'Lô L0SP001-1 sắp hết hạn sử dụng.',
            'Có 3 đơn đặt hàng mới từ Shop Online.',
            'Khách hàng Nguyễn Văn A vừa đạt hạng Gold.',
            'Hệ thống vừa cập nhật phiên bản mới.'
        ];
        
        for (let i=0; i<20; i++) {
            notis.push({
                id: 'NOTI' + i,
                type: types[Math.floor(Math.random() * types.length)],
                message: messages[Math.floor(Math.random() * messages.length)],
                timestamp: new Date(Date.now() - Math.random() * 100000000).toISOString(),
                isRead: Math.random() > 0.6
            });
        }
        notis.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        Storage.set('notifications', notis);
    },

    initSettings: function() {
        Storage.set('settings', {
            theme: 'light',
            language: 'vi',
            currency: 'VND',
            notiEmail: true,
            notiPush: true
        });
    }
};

if (typeof window !== 'undefined' && typeof MockData !== 'undefined' && MockData.initialize) {
    MockData.initialize();
}

