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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
