const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const users = [
    { name: 'Alice Admin', email: 'admin@gamasupreme.com', role: 'admin' },
    { name: 'Sam Sales', email: 'sam@gamasupreme.com', role: 'sales_staff' },
    { name: 'Priya Sales', email: 'priya@gamasupreme.com', role: 'sales_staff' },
    { name: 'Amy Accountant', email: 'amy@gamasupreme.com', role: 'accountant' },
    { name: 'Ben Accountant', email: 'ben@gamasupreme.com', role: 'accountant' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password },
    });
  }

  const businesses = [
    { code: 'DM', name: 'Door Manufacturing', trn: '100123456700003' },
    { code: 'FO', name: 'Interior Fit-out', trn: '100234567800003' },
    { code: 'MT', name: 'Material Trading', trn: '100345678900003' },
    { code: 'MP', name: 'Manpower Supply', trn: null },
  ];
  for (const b of businesses) {
    await prisma.business.upsert({ where: { code: b.code }, update: { trn: b.trn }, create: b });
  }
  const dm = await prisma.business.findUnique({ where: { code: 'DM' } });
  const fo = await prisma.business.findUnique({ where: { code: 'FO' } });
  const mt = await prisma.business.findUnique({ where: { code: 'MT' } });

  const customers = [
    { name: 'Acme Retail Pte Ltd', email: 'procurement@acme.com', phone: '+971 4 111 2222', address: 'Sheikh Zayed Rd, Dubai, UAE', trn: '100987654300003' },
    { name: 'Golden Spoon Restaurant', email: 'owner@goldenspoon.ae', phone: '+971 4 222 3333', address: 'Al Wasl Rd, Dubai, UAE' },
  ];
  for (const c of customers) {
    const found = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!found) await prisma.customer.create({ data: c });
    else if (c.trn) await prisma.customer.update({ where: { id: found.id }, data: { trn: c.trn } });
  }

  const employees = [
    { name: 'John Tan', position: 'Sales Executive', monthlySalary: 3500, bankName: 'Emirates NBD', bankAccount: '123-456-789' },
    { name: 'Mary Lim', position: 'Accountant', monthlySalary: 4200, bankName: 'ADCB', bankAccount: '987-654-321' },
    { name: 'Rahim Ismail', position: 'Fitout Technician', monthlySalary: 3000, bankName: 'FAB', bankAccount: '555-111-222' },
  ];
  for (const e of employees) {
    const found = await prisma.employee.findFirst({ where: { name: e.name } });
    if (!found) await prisma.employee.create({ data: e });
  }

  // Material Trading: suppliers + a small product catalog.
  const suppliers = [
    { name: 'Gulf Hardware Supplies', contact: '+971 4 555 1010' },
  ];
  for (const s of suppliers) {
    const found = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!found) await prisma.supplier.create({ data: s });
  }

  const products = [
    { sku: 'MT-CEM-001', name: 'Cement Bag 50kg', unit: 'bag', unitCost: 18, stockQty: 120, reorderThreshold: 50 },
    { sku: 'MT-PIPE-002', name: 'PVC Pipe 4in x 3m', unit: 'pcs', unitCost: 25, stockQty: 30, reorderThreshold: 40 },
  ];
  for (const p of products) {
    const found = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!found) await prisma.product.create({ data: { ...p, businessId: mt.id } });
  }

  // Interior Fit-out: a sample project.
  const foCustomer = await prisma.customer.findFirst({ where: { name: 'Acme Retail Pte Ltd' } });
  const existingProject = await prisma.project.findFirst({ where: { name: 'Acme HQ Office Fitout' } });
  if (!existingProject) {
    const project = await prisma.project.create({
      data: {
        businessId: fo.id,
        name: 'Acme HQ Office Fitout',
        address: 'Business Bay, Dubai, UAE',
        customerId: foCustomer ? foCustomer.id : null,
        startDate: new Date(),
      },
    });
    await prisma.milestone.createMany({
      data: [
        { projectId: project.id, name: 'Design approval', status: 'done', order: 1 },
        { projectId: project.id, name: 'Civil & MEP works', status: 'in-progress', order: 2 },
        { projectId: project.id, name: 'Fit-out & finishing', status: 'pending', order: 3 },
        { projectId: project.id, name: 'Handover', status: 'pending', order: 4 },
      ],
    });
  }

  console.log('Seed complete. Demo users use password: password123');
  console.log(`Businesses seeded: ${dm.name} (${dm.code}), ${fo.name} (${fo.code}), ${mt.name} (${mt.code})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
