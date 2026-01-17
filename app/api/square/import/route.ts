import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface ImportItem {
  catalogItemId: string;
  importAs: 'recipe' | 'item';
  useDescription: boolean;
  useCategory: boolean;
  usePrice: boolean;
  categoryId: string | null;
}

// Import Square catalog items as Recipes or Items
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items }: { items: ImportItem[] } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items to import' }, { status: 400 });
    }

    const accountId = session.user.accountId;
    let recipesCreated = 0;
    let itemsCreated = 0;
    let skippedDuplicates = 0;
    let notFound = 0;

    // Get all catalog items in one query
    const catalogItemIds = items.map((i) => i.catalogItemId);
    const catalogItems = await prisma.squareCatalogItem.findMany({
      where: {
        id: { in: catalogItemIds },
        accountId,
      },
      include: {
        variations: true,
      },
    });

    console.log(`Import request: ${items.length} items requested, ${catalogItems.length} found in DB`);
    console.log(`First 3 requested IDs:`, catalogItemIds.slice(0, 3));
    console.log(`First 3 found IDs:`, catalogItems.slice(0, 3).map(c => c.id));
    console.log(`Account ID:`, accountId);

    // Create a map for quick lookup
    const catalogMap = new Map(catalogItems.map((c) => [c.id, c]));

    // Get existing item and recipe names to avoid duplicates
    const existingItems = await prisma.item.findMany({
      where: { accountId },
      select: { name: true },
    });
    const existingRecipes = await prisma.recipe.findMany({
      where: { accountId },
      select: { name: true },
    });
    const existingItemNames = new Set(existingItems.map((i) => i.name.toLowerCase()));
    const existingRecipeNames = new Set(existingRecipes.map((r) => r.name.toLowerCase()));

    // Get or create categories based on Square category names
    const squareCategoryNames = new Set<string>();
    items.forEach((item) => {
      if (item.useCategory) {
        const catalogItem = catalogMap.get(item.catalogItemId);
        if (catalogItem?.categoryName) {
          squareCategoryNames.add(catalogItem.categoryName);
        }
      }
    });

    // Find or create categories for Square category names
    const categoryNameToId = new Map<string, string>();
    for (const categoryName of squareCategoryNames) {
      let category = await prisma.category.findFirst({
        where: { name: categoryName, accountId },
      });
      if (!category) {
        category = await prisma.category.create({
          data: { name: categoryName, accountId },
        });
      }
      categoryNameToId.set(categoryName, category.id);
    }

    // Process each import item
    for (const importItem of items) {
      const catalogItem = catalogMap.get(importItem.catalogItemId);
      if (!catalogItem) {
        notFound++;
        continue;
      }

      // Determine category ID
      let categoryId: string | null = null;
      if (importItem.useCategory && catalogItem.categoryName) {
        categoryId = categoryNameToId.get(catalogItem.categoryName) || null;
      } else if (importItem.categoryId) {
        categoryId = importItem.categoryId;
      }

      // Get price from first variation if available
      const firstVariation = catalogItem.variations[0];
      const priceInCents = firstVariation?.priceMoney;

      if (importItem.importAs === 'recipe') {
        // Check for duplicate recipe
        if (existingRecipeNames.has(catalogItem.name.toLowerCase())) {
          skippedDuplicates++;
          continue;
        }
        // Create Recipe
        await prisma.recipe.create({
          data: {
            name: catalogItem.name,
            description: importItem.useDescription ? catalogItem.description : null,
            categoryId,
            accountId,
            yieldQuantity: 1,
            yieldUnit: 'portions',
            isSubRecipe: false,
            isActive: true,
          },
        });
        existingRecipeNames.add(catalogItem.name.toLowerCase());
        recipesCreated++;
      } else if (importItem.importAs === 'item') {
        // Check for duplicate item
        if (existingItemNames.has(catalogItem.name.toLowerCase())) {
          skippedDuplicates++;
          continue;
        }
        // Create Inventory Item
        await prisma.item.create({
          data: {
            name: catalogItem.name,
            description: importItem.useDescription ? catalogItem.description : null,
            categoryId,
            accountId,
            unit: 'pieces', // Default unit, can be changed later
            costPrice: importItem.usePrice && priceInCents ? priceInCents / 100 : null,
            sku: firstVariation?.sku,
          },
        });
        existingItemNames.add(catalogItem.name.toLowerCase());
        itemsCreated++;
      }
    }

    return NextResponse.json({
      recipes: recipesCreated,
      items: itemsCreated,
      skipped: skippedDuplicates,
      notFound: notFound,
    });
  } catch (error) {
    console.error('Error importing Square items:', error);
    return NextResponse.json(
      { error: 'Failed to import items' },
      { status: 500 }
    );
  }
}
