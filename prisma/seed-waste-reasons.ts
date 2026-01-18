import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default waste reasons for restaurant operations
const DEFAULT_WASTE_REASONS = [
  { name: 'Caducado', description: 'Producto pasado de fecha de caducidad o consumo preferente' },
  { name: 'Dañado', description: 'Producto dañado durante manipulación o almacenamiento' },
  { name: 'Derrame', description: 'Pérdida por derrame accidental' },
  { name: 'Pérdida en preparación', description: 'Merma normal durante la preparación de alimentos' },
  { name: 'Error de cocina', description: 'Plato mal preparado o quemado' },
  { name: 'Devolución cliente', description: 'Producto devuelto por el cliente' },
  { name: 'Control de calidad', description: 'Retirado por no cumplir estándares de calidad' },
  { name: 'Robo/Pérdida', description: 'Producto desaparecido o robado' },
  { name: 'Otro', description: 'Otra razón no especificada' },
];

async function seedWasteReasonsForAccount(accountId: string, accountName: string) {
  console.log(`\nSeeding waste reasons for account: ${accountName} (${accountId})`);

  for (const reason of DEFAULT_WASTE_REASONS) {
    const existing = await prisma.wasteReason.findFirst({
      where: {
        name: reason.name,
        accountId,
      },
    });

    if (existing) {
      console.log(`  Already exists: ${reason.name}`);
    } else {
      await prisma.wasteReason.create({
        data: {
          name: reason.name,
          description: reason.description,
          isActive: true,
          accountId,
        },
      });
      console.log(`  Created: ${reason.name}`);
    }
  }

  const count = await prisma.wasteReason.count({
    where: { accountId },
  });

  console.log(`  Total waste reasons for account: ${count}`);
}

async function main() {
  console.log('Starting waste reasons seed...\n');

  // Get all accounts
  const accounts = await prisma.account.findMany({
    select: { id: true, name: true },
  });

  if (accounts.length === 0) {
    console.log('No accounts found. Please create an account first.');
    return;
  }

  console.log(`Found ${accounts.length} account(s)`);

  // Seed waste reasons for each account
  for (const account of accounts) {
    await seedWasteReasonsForAccount(account.id, account.name);
  }

  console.log('\nWaste reasons seed completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding waste reasons:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Export for use in other scripts
export { DEFAULT_WASTE_REASONS, seedWasteReasonsForAccount };
