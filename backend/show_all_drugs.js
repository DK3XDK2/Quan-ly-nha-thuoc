const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function show() {
  const list = await prisma.thuoc.findMany({
    select: { id: true, maThuoc: true, tenThuoc: true, hinhAnh: true, danhMucThuoc: { select: { tenDanhMuc: true } } }
  });
  console.log(JSON.stringify(list, null, 2));
  await prisma.$disconnect();
}
show();
