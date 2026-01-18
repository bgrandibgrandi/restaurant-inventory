import { prisma } from '../db';

// Match result from deduplication check
export interface MatchResult {
  itemId: string;
  itemName: string;
  confidence: number;
  matchType: 'exact_barcode' | 'exact_sku' | 'name_similarity' | 'name_category' | 'no_match';
  matchDetails: string;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

// Input for checking duplicates
export interface DedupInput {
  name: string;
  barcode?: string | null;
  supplierSku?: string | null;
  supplierId?: string | null;
  categoryId?: string | null;
  accountId: string;
  excludeItemId?: string; // Exclude this item from results (useful when editing)
}

// Similarity threshold (70% as decided)
const SIMILARITY_THRESHOLD = 0.70;

/**
 * Find potential duplicate items based on multiple criteria
 */
export async function findPotentialMatches(input: DedupInput): Promise<MatchResult[]> {
  const matches: MatchResult[] = [];
  const seenItemIds = new Set<string>();

  // Priority 1: Exact barcode match (confidence: 1.0)
  if (input.barcode) {
    const barcodeMatches = await prisma.item.findMany({
      where: {
        barcode: input.barcode,
        accountId: input.accountId,
        ...(input.excludeItemId && { id: { not: input.excludeItemId } }),
      },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    for (const item of barcodeMatches) {
      if (!seenItemIds.has(item.id)) {
        seenItemIds.add(item.id);
        matches.push({
          itemId: item.id,
          itemName: item.name,
          confidence: 1.0,
          matchType: 'exact_barcode',
          matchDetails: `Código de barras idéntico: ${input.barcode}`,
          category: item.category,
          supplier: item.supplier,
        });
      }
    }

    // Also check ItemIdentifier table for barcodes
    const identifierMatches = await prisma.itemIdentifier.findMany({
      where: {
        identifierType: 'barcode',
        identifierValue: input.barcode,
        accountId: input.accountId,
        ...(input.excludeItemId && { itemId: { not: input.excludeItemId } }),
      },
      include: {
        item: {
          include: {
            category: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
          },
        },
      },
    });

    for (const match of identifierMatches) {
      if (!seenItemIds.has(match.itemId)) {
        seenItemIds.add(match.itemId);
        matches.push({
          itemId: match.itemId,
          itemName: match.item.name,
          confidence: 1.0,
          matchType: 'exact_barcode',
          matchDetails: `Código de barras idéntico: ${input.barcode}`,
          category: match.item.category,
          supplier: match.item.supplier,
        });
      }
    }
  }

  // Priority 2: Supplier SKU match (confidence: 0.95)
  if (input.supplierSku && input.supplierId) {
    const skuMatches = await prisma.supplierItemPrice.findMany({
      where: {
        supplierSku: input.supplierSku,
        supplierId: input.supplierId,
        ...(input.excludeItemId && { itemId: { not: input.excludeItemId } }),
      },
      include: {
        item: {
          include: {
            category: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
          },
        },
      },
    });

    for (const match of skuMatches) {
      if (!seenItemIds.has(match.itemId)) {
        seenItemIds.add(match.itemId);
        matches.push({
          itemId: match.itemId,
          itemName: match.item.name,
          confidence: 0.95,
          matchType: 'exact_sku',
          matchDetails: `SKU de proveedor idéntico: ${input.supplierSku}`,
          category: match.item.category,
          supplier: match.item.supplier,
        });
      }
    }
  }

  // Priority 3: Name similarity (confidence varies)
  const nameMatches = await findSimilarByName(
    input.name,
    input.accountId,
    input.categoryId,
    input.excludeItemId,
    seenItemIds
  );
  matches.push(...nameMatches);

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Find items with similar names using Levenshtein distance
 */
async function findSimilarByName(
  name: string,
  accountId: string,
  categoryId: string | null | undefined,
  excludeItemId: string | undefined,
  seenItemIds: Set<string>
): Promise<MatchResult[]> {
  const normalizedInput = normalizeName(name);
  const matches: MatchResult[] = [];

  // Get all items to compare
  const allItems = await prisma.item.findMany({
    where: {
      accountId,
      ...(excludeItemId && { id: { not: excludeItemId } }),
    },
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });

  for (const item of allItems) {
    if (seenItemIds.has(item.id)) continue;

    const normalizedItemName = normalizeName(item.name);
    const similarity = calculateSimilarity(normalizedInput, normalizedItemName);

    if (similarity >= SIMILARITY_THRESHOLD) {
      // Boost confidence if same category
      const sameCategory = categoryId && item.categoryId === categoryId;
      const adjustedConfidence = sameCategory
        ? Math.min(similarity + 0.1, 0.95) // Boost by 10% if same category, max 0.95
        : similarity;

      matches.push({
        itemId: item.id,
        itemName: item.name,
        confidence: adjustedConfidence,
        matchType: sameCategory ? 'name_category' : 'name_similarity',
        matchDetails: sameCategory
          ? `Nombre ${Math.round(similarity * 100)}% similar, misma categoría`
          : `Nombre ${Math.round(similarity * 100)}% similar`,
        category: item.category,
        supplier: item.supplier,
      });
    }
  }

  return matches;
}

/**
 * Normalize a name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Create a duplicate candidate record
 */
export async function createDuplicateCandidate(
  itemId: string,
  matchedItemId: string,
  matchType: string,
  confidence: number,
  accountId: string
): Promise<void> {
  // Check if already exists
  const existing = await prisma.duplicateCandidate.findFirst({
    where: {
      OR: [
        { itemId, matchedItemId },
        { itemId: matchedItemId, matchedItemId: itemId },
      ],
      accountId,
    },
  });

  if (existing) return;

  await prisma.duplicateCandidate.create({
    data: {
      itemId,
      matchedItemId,
      matchType,
      confidence,
      status: 'pending',
      accountId,
    },
  });

  // Mark item as needing review
  await prisma.item.update({
    where: { id: itemId },
    data: { needsReview: true },
  });
}

/**
 * Run a full duplicate scan for an account
 */
export async function scanAllDuplicates(accountId: string): Promise<{
  scanned: number;
  duplicatesFound: number;
}> {
  const items = await prisma.item.findMany({
    where: { accountId },
    select: {
      id: true,
      name: true,
      barcode: true,
      categoryId: true,
      supplierId: true,
    },
  });

  let duplicatesFound = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const matches = await findPotentialMatches({
      name: item.name,
      barcode: item.barcode,
      categoryId: item.categoryId,
      supplierId: item.supplierId,
      accountId,
      excludeItemId: item.id,
    });

    // Only consider high-confidence matches
    const significantMatches = matches.filter((m) => m.confidence >= SIMILARITY_THRESHOLD);

    for (const match of significantMatches) {
      await createDuplicateCandidate(
        item.id,
        match.itemId,
        match.matchType,
        match.confidence,
        accountId
      );
      duplicatesFound++;
    }
  }

  return {
    scanned: items.length,
    duplicatesFound,
  };
}

/**
 * Get items that would be affected by merging two items
 */
export async function getAffectedByMerge(
  itemToRemoveId: string,
  itemToKeepId: string,
  accountId: string
): Promise<{
  recipes: { id: string; name: string }[];
  invoiceItems: number;
  stockMovements: number;
  stockEntries: number;
}> {
  const [recipes, invoiceItems, stockMovements, stockEntries] = await Promise.all([
    // Recipes using the item to be removed
    prisma.recipeIngredient.findMany({
      where: { itemId: itemToRemoveId },
      include: {
        recipe: { select: { id: true, name: true } },
      },
    }),
    // Invoice items
    prisma.invoiceItem.count({
      where: { matchedItemId: itemToRemoveId },
    }),
    // Stock movements
    prisma.stockMovement.count({
      where: { itemId: itemToRemoveId },
    }),
    // Stock entries
    prisma.stockEntry.count({
      where: { itemId: itemToRemoveId },
    }),
  ]);

  return {
    recipes: recipes.map((r) => ({ id: r.recipe.id, name: r.recipe.name })),
    invoiceItems,
    stockMovements,
    stockEntries,
  };
}

/**
 * Merge two items into one
 */
export async function mergeItems(
  itemToRemoveId: string,
  itemToKeepId: string,
  accountId: string,
  userId: string
): Promise<{ success: boolean; migratedRecipes: number; migratedMovements: number }> {
  // Verify both items exist and belong to the account
  const [itemToRemove, itemToKeep] = await Promise.all([
    prisma.item.findFirst({ where: { id: itemToRemoveId, accountId } }),
    prisma.item.findFirst({ where: { id: itemToKeepId, accountId } }),
  ]);

  if (!itemToRemove || !itemToKeep) {
    throw new Error('One or both items not found');
  }

  // Run everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update recipe ingredients to use the kept item
    const recipeUpdate = await tx.recipeIngredient.updateMany({
      where: { itemId: itemToRemoveId },
      data: { itemId: itemToKeepId },
    });

    // 2. Update stock movements
    const movementUpdate = await tx.stockMovement.updateMany({
      where: { itemId: itemToRemoveId },
      data: { itemId: itemToKeepId },
    });

    // 3. Update stock entries
    await tx.stockEntry.updateMany({
      where: { itemId: itemToRemoveId },
      data: { itemId: itemToKeepId },
    });

    // 4. Update invoice items
    await tx.invoiceItem.updateMany({
      where: { matchedItemId: itemToRemoveId },
      data: { matchedItemId: itemToKeepId },
    });

    // 5. Update stock transfer items
    await tx.stockTransferItem.updateMany({
      where: { itemId: itemToRemoveId },
      data: { itemId: itemToKeepId },
    });

    // 6. Merge supplier prices (add any that don't exist on kept item)
    const removedItemPrices = await tx.supplierItemPrice.findMany({
      where: { itemId: itemToRemoveId },
    });

    for (const price of removedItemPrices) {
      const existingPrice = await tx.supplierItemPrice.findFirst({
        where: { itemId: itemToKeepId, supplierId: price.supplierId },
      });

      if (!existingPrice) {
        await tx.supplierItemPrice.create({
          data: {
            ...price,
            id: undefined,
            itemId: itemToKeepId,
          },
        });
      }
    }

    // 7. Merge identifiers
    const removedIdentifiers = await tx.itemIdentifier.findMany({
      where: { itemId: itemToRemoveId },
    });

    for (const identifier of removedIdentifiers) {
      const existingIdentifier = await tx.itemIdentifier.findFirst({
        where: {
          itemId: itemToKeepId,
          identifierType: identifier.identifierType,
          identifierValue: identifier.identifierValue,
        },
      });

      if (!existingIdentifier) {
        await tx.itemIdentifier.create({
          data: {
            ...identifier,
            id: undefined,
            itemId: itemToKeepId,
          },
        });
      }
    }

    // 8. Update duplicate candidates
    await tx.duplicateCandidate.updateMany({
      where: {
        OR: [{ itemId: itemToRemoveId }, { matchedItemId: itemToRemoveId }],
      },
      data: { status: 'merged' },
    });

    // 9. Delete the removed item (cascades will clean up remaining relations)
    await tx.item.delete({
      where: { id: itemToRemoveId },
    });

    // 10. Clear needsReview flag on kept item
    await tx.item.update({
      where: { id: itemToKeepId },
      data: { needsReview: false },
    });

    return {
      migratedRecipes: recipeUpdate.count,
      migratedMovements: movementUpdate.count,
    };
  });

  return {
    success: true,
    ...result,
  };
}

/**
 * Mark a duplicate candidate as not a duplicate
 */
export async function dismissDuplicate(
  duplicateId: string,
  accountId: string,
  userId: string
): Promise<void> {
  const candidate = await prisma.duplicateCandidate.findFirst({
    where: { id: duplicateId, accountId },
  });

  if (!candidate) {
    throw new Error('Duplicate candidate not found');
  }

  await prisma.duplicateCandidate.update({
    where: { id: duplicateId },
    data: {
      status: 'not_duplicate',
      reviewedAt: new Date(),
      reviewedBy: userId,
    },
  });

  // Check if item has any other pending duplicates
  const otherPending = await prisma.duplicateCandidate.count({
    where: {
      OR: [{ itemId: candidate.itemId }, { matchedItemId: candidate.itemId }],
      status: 'pending',
      id: { not: duplicateId },
    },
  });

  // If no other pending duplicates, clear the needsReview flag
  if (otherPending === 0) {
    await prisma.item.update({
      where: { id: candidate.itemId },
      data: { needsReview: false },
    });
  }
}
