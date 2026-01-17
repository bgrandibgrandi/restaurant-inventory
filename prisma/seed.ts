import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default account
  const account = await prisma.account.upsert({
    where: { id: 'default-account' },
    update: {},
    create: {
      id: 'default-account',
      name: "Bruno's Restaurants",
      baseCurrency: 'EUR',
    },
  });

  console.log('Created default account:', account);

  // Create a default store
  const store = await prisma.store.upsert({
    where: { id: 'default-store' },
    update: {},
    create: {
      id: 'default-store',
      name: 'Main Location',
      accountId: account.id,
    },
  });

  console.log('Created default store:', store);

  // Create default waste reasons
  const wasteReasons = [
    { name: 'Expired', description: 'Product passed expiration date' },
    { name: 'Damaged', description: 'Product damaged in storage or handling' },
    { name: 'Spillage', description: 'Accidental spill or breakage' },
    { name: 'Preparation Loss', description: 'Normal loss during food preparation (trimmings, peels, etc.)' },
    { name: 'Staff Meal', description: 'Used for staff meals' },
    { name: 'Customer Complaint', description: 'Returned or remade due to customer complaint' },
    { name: 'Quality Issue', description: 'Did not meet quality standards' },
    { name: 'Other', description: 'Other reason (specify in notes)' },
  ];

  for (const reason of wasteReasons) {
    await prisma.wasteReason.upsert({
      where: {
        name_accountId: {
          name: reason.name,
          accountId: account.id,
        },
      },
      update: {},
      create: {
        name: reason.name,
        description: reason.description,
        accountId: account.id,
      },
    });
  }

  console.log('Created default waste reasons');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
