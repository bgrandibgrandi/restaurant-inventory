/**
 * Migration script to assign existing data to stores
 * Run with: npx ts-node scripts/migrate-to-store-specific.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Store colors for auto-assignment
const STORE_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
];

async function main() {
  console.log('Starting migration to store-specific data...\n');

  // Get all accounts
  const accounts = await prisma.account.findMany({
    include: {
      stores: true,
    },
  });

  for (const account of accounts) {
    console.log(`\nProcessing account: ${account.name} (${account.id})`);

    if (account.stores.length === 0) {
      console.log('  - No stores found, skipping...');
      continue;
    }

    // Assign colors to stores if not set
    for (let i = 0; i < account.stores.length; i++) {
      const store = account.stores[i];
      if (!store.color) {
        const color = STORE_COLORS[i % STORE_COLORS.length];
        await prisma.store.update({
          where: { id: store.id },
          data: { color },
        });
        console.log(`  - Assigned color ${color} to store: ${store.name}`);
      }
    }

    // Use the first store as the default for existing data
    const defaultStore = account.stores[0];
    console.log(`  - Using "${defaultStore.name}" as default store for existing data`);

    // Update Items without storeId
    const itemsUpdated = await prisma.item.updateMany({
      where: {
        accountId: account.id,
        storeId: null,
      },
      data: {
        storeId: defaultStore.id,
      },
    });
    console.log(`  - Updated ${itemsUpdated.count} items`);

    // Update Suppliers without storeId
    const suppliersUpdated = await prisma.supplier.updateMany({
      where: {
        accountId: account.id,
        storeId: null,
      },
      data: {
        storeId: defaultStore.id,
      },
    });
    console.log(`  - Updated ${suppliersUpdated.count} suppliers`);

    // Update Recipes without storeId
    const recipesUpdated = await prisma.recipe.updateMany({
      where: {
        accountId: account.id,
        storeId: null,
      },
      data: {
        storeId: defaultStore.id,
      },
    });
    console.log(`  - Updated ${recipesUpdated.count} recipes`);

    // Update RecipeTags without storeId
    const tagsUpdated = await prisma.recipeTag.updateMany({
      where: {
        accountId: account.id,
        storeId: null,
      },
      data: {
        storeId: defaultStore.id,
      },
    });
    console.log(`  - Updated ${tagsUpdated.count} recipe tags`);

    // Set user's selectedStoreId to first store if not set
    const usersUpdated = await prisma.user.updateMany({
      where: {
        accountId: account.id,
        selectedStoreId: null,
      },
      data: {
        selectedStoreId: defaultStore.id,
      },
    });
    console.log(`  - Updated ${usersUpdated.count} users with default store`);
  }

  console.log('\n✅ Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
