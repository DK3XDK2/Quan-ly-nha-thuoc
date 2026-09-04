const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDrugImage(keyword) {
  const url = `https://nhathuoclongchau.com.vn/tim-kiem?s=${encodeURIComponent(keyword)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const html = await res.text();
    // Exclude generic small icons and headers
    const matches = html.match(/https:\/\/cdn\.nhathuoclongchau\.com\.vn\/v1\/static\/(?!smalls\/|Banner_|Tag_|1200x628|Desk_|Resp_|M_Theme|D_Theme|Theme_)[^"'\s\)]+\.(?:jpg|png|webp)/gi);
    if (matches && matches.length > 0) {
      // Test the URL
      for (const imgUrl of matches) {
        try {
          const testRes = await fetch(imgUrl, { method: 'HEAD' });
          if (testRes.status === 200) {
            return imgUrl;
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error('Err fetching', keyword, e.message);
  }
  return null;
}

async function run() {
  const drugs = await prisma.thuoc.findMany();
  console.log(`Bắt đầu tìm ảnh cho ${drugs.length} sản phẩm...`);

  const results = {};
  for (const drug of drugs) {
    // Clean keyword (e.g. remove 500mg, 40mg etc if needed, or search full name)
    let img = await getDrugImage(drug.tenThuoc);
    if (!img) {
      // try without dosage
      const shortName = drug.tenThuoc.split(' ')[0];
      img = await getDrugImage(shortName);
    }
    if (img) {
      console.log(`[OK] ${drug.tenThuoc} => ${img}`);
      results[drug.id] = img;
      await prisma.thuoc.update({
        where: { id: drug.id },
        data: { hinhAnh: img }
      });
    } else {
      console.log(`[MISS] ${drug.tenThuoc}`);
    }
  }

  console.log('Hoàn tất cập nhật ảnh thuốc vào database!');
  await prisma.$disconnect();
}

run();
