import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const CHANNELS = ['whatsapp', 'sms', 'email', 'rcs'] as const;
const TAGS_POOL = [
  'vip', 'frequent', 'new', 'churned', 'high-value',
  'bargain-hunter', 'loyal', 'seasonal', 'fashion', 'electronics',
  'beauty', 'sports', 'home', 'food', 'premium',
];

async function main() {
  console.log('🌱 Seeding Pulse CRM database...');

  // Clean up existing data
  await prisma.engagementHistory.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create 200 customers
  const customers = [];
  for (let i = 0; i < 200; i++) {
    const name = faker.person.fullName();
    const email = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] }).toLowerCase();
    const numTags = faker.number.int({ min: 1, max: 4 });
    const tags = faker.helpers.arrayElements(TAGS_POOL, numTags);

    customers.push({
      id: faker.string.nanoid(20),
      name,
      email,
      phone: faker.phone.number({ style: 'international' }),
      tags,
      totalSpend: 0,
      lastOrderDate: null as Date | null,
      createdAt: faker.date.past({ years: 2 }),
    });
  }

  await prisma.customer.createMany({ data: customers });
  console.log(`✅ Created ${customers.length} customers`);

  // Create 500-800 orders spread over 18 months
  const orderData = [];
  const spendMap: Record<string, number> = {};
  const lastOrderMap: Record<string, Date> = {};

  for (const customer of customers) {
    // Each customer gets 1-8 orders
    const numOrders = faker.number.int({ min: 1, max: 8 });
    for (let j = 0; j < numOrders; j++) {
      const amount = parseFloat(faker.commerce.price({ min: 200, max: 15000, dec: 2 }));
      const orderDate = faker.date.between({
        from: new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      });

      const numItems = faker.number.int({ min: 1, max: 5 });
      const items = Array.from({ length: numItems }, () => ({
        name: faker.commerce.productName(),
        qty: faker.number.int({ min: 1, max: 3 }),
        price: parseFloat(faker.commerce.price({ min: 100, max: 5000, dec: 2 })),
      }));

      orderData.push({
        customerId: customer.id,
        amount,
        items,
        date: orderDate,
      });

      spendMap[customer.id] = (spendMap[customer.id] || 0) + amount;
      if (!lastOrderMap[customer.id] || orderDate > lastOrderMap[customer.id]) {
        lastOrderMap[customer.id] = orderDate;
      }
    }
  }

  await prisma.order.createMany({ data: orderData });
  console.log(`✅ Created ${orderData.length} orders`);

  // Update customer totalSpend and lastOrderDate
  for (const customer of customers) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalSpend: Math.round((spendMap[customer.id] || 0) * 100) / 100,
        lastOrderDate: lastOrderMap[customer.id] || null,
      },
    });
  }
  console.log('✅ Updated customer spend aggregates');

  // Create EngagementHistory for each customer × channel
  const engagementData = [];
  for (const customer of customers) {
    // Each customer has 2-4 active channels
    const activeChannels = faker.helpers.arrayElements(CHANNELS, faker.number.int({ min: 2, max: 4 }));
    for (const channel of activeChannels) {
      engagementData.push({
        customerId: customer.id,
        channel,
        opens: faker.number.int({ min: 0, max: 50 }),
        clicks: faker.number.int({ min: 0, max: 20 }),
      });
    }
  }

  await prisma.engagementHistory.createMany({ data: engagementData });
  console.log(`✅ Created ${engagementData.length} engagement history records`);

  // Create 3 sample segments
  const segments = [
    {
      name: 'High Value Customers',
      description: 'Customers who spent over ₹10,000 in the last 6 months',
      filterJson: {
        operator: 'AND',
        conditions: [
          { field: 'totalSpend', op: 'gte', value: 10000 },
        ],
      },
    },
    {
      name: 'Churned Customers',
      description: 'Customers who haven\'t ordered in the last 90 days',
      filterJson: {
        operator: 'AND',
        conditions: [
          { field: 'daysSinceLastOrder', op: 'gte', value: 90 },
        ],
      },
    },
    {
      name: 'VIP Loyalists',
      description: 'Tagged as VIP or loyal with high spend',
      filterJson: {
        operator: 'AND',
        conditions: [
          { field: 'tags', op: 'contains', value: 'vip' },
          { field: 'totalSpend', op: 'gte', value: 5000 },
        ],
      },
    },
  ];

  for (const seg of segments) {
    await prisma.segment.create({ data: seg });
  }
  console.log('✅ Created 3 sample segments');

  console.log('\n🎉 Database seeded successfully!');
  console.log(`   📊 200 customers, ${orderData.length} orders, ${engagementData.length} engagement records`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
