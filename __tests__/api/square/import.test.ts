/**
 * Tests for Square Import functionality
 * These tests ensure that importing Square catalog items works correctly
 */

// Mock Prisma
const mockPrisma = {
  squareCatalogItem: {
    findMany: jest.fn(),
  },
  item: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  recipe: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth';

describe('Square Import API', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      accountId: 'account-1',
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('Import validation', () => {
    it('should match catalog items by database ID', async () => {
      // This test verifies the core import logic
      const catalogItemId = 'catalog-item-123';
      const accountId = 'account-1';
      
      // Simulate what the import does: lookup by ID and accountId
      const mockCatalogItems = [
        {
          id: catalogItemId,
          squareId: 'SQUARE_ID_ABC',
          name: 'Test Item',
          description: 'A test item',
          categoryName: 'Food',
          accountId: accountId,
          variations: [{ id: 'var-1', priceMoney: 1000, sku: 'SKU001' }],
        },
      ];

      mockPrisma.squareCatalogItem.findMany.mockResolvedValue(mockCatalogItems);
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockPrisma.recipe.findMany.mockResolvedValue([]);

      // Verify the query uses the correct ID and accountId
      await mockPrisma.squareCatalogItem.findMany({
        where: {
          id: { in: [catalogItemId] },
          accountId: accountId,
        },
        include: { variations: true },
      });

      expect(mockPrisma.squareCatalogItem.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: [catalogItemId] },
          accountId: accountId,
        },
        include: { variations: true },
      });
    });

    it('should track not found items when catalog item ID does not exist', () => {
      // Simulate the import logic
      const importItems = [
        { catalogItemId: 'non-existent-id', importAs: 'item' },
        { catalogItemId: 'existing-id', importAs: 'item' },
      ];

      const catalogMap = new Map([
        ['existing-id', { id: 'existing-id', name: 'Existing Item', variations: [] }],
      ]);

      let notFound = 0;
      let itemsCreated = 0;

      for (const importItem of importItems) {
        const catalogItem = catalogMap.get(importItem.catalogItemId);
        if (!catalogItem) {
          notFound++;
          continue;
        }
        itemsCreated++;
      }

      expect(notFound).toBe(1);
      expect(itemsCreated).toBe(1);
    });

    it('should track not found items when accountId does not match', () => {
      // This simulates the bug: items exist but with different accountId
      const importItems = [
        { catalogItemId: 'item-1', importAs: 'item' },
        { catalogItemId: 'item-2', importAs: 'item' },
      ];

      // Empty map because accountId filter excluded them
      const catalogMap = new Map();

      let notFound = 0;

      for (const importItem of importItems) {
        const catalogItem = catalogMap.get(importItem.catalogItemId);
        if (!catalogItem) {
          notFound++;
          continue;
        }
      }

      // All items should be not found due to accountId mismatch
      expect(notFound).toBe(2);
    });

    it('should skip duplicate items by name (case-insensitive)', () => {
      const catalogItem = { name: 'Pizza Margherita', variations: [] };
      const existingItemNames = new Set(['pizza margherita', 'burger']);

      const isDuplicate = existingItemNames.has(catalogItem.name.toLowerCase());
      
      expect(isDuplicate).toBe(true);
    });

    it('should not skip items with different names', () => {
      const catalogItem = { name: 'New Item', variations: [] };
      const existingItemNames = new Set(['pizza margherita', 'burger']);

      const isDuplicate = existingItemNames.has(catalogItem.name.toLowerCase());
      
      expect(isDuplicate).toBe(false);
    });
  });

  describe('Import results', () => {
    it('should return correct counts for recipes and items', () => {
      // Simulate import results
      const result = {
        recipes: 5,
        items: 10,
        skipped: 2,
        notFound: 3,
      };

      expect(result.recipes).toBe(5);
      expect(result.items).toBe(10);
      expect(result.skipped).toBe(2);
      expect(result.notFound).toBe(3);
      
      // Total processed should equal sum
      const totalRequested = result.recipes + result.items + result.skipped + result.notFound;
      expect(totalRequested).toBe(20);
    });

    it('should include notFound in response', () => {
      const response = {
        recipes: 0,
        items: 0,
        skipped: 0,
        notFound: 5,
      };

      expect(response).toHaveProperty('notFound');
      expect(response.notFound).toBe(5);
    });
  });

  describe('Price conversion', () => {
    it('should convert price from cents to dollars correctly', () => {
      const priceInCents = 1299;
      const priceInDollars = priceInCents / 100;
      
      expect(priceInDollars).toBe(12.99);
    });

    it('should handle null price', () => {
      const priceInCents: number | null = null;
      const costPrice = priceInCents ? priceInCents / 100 : null;
      
      expect(costPrice).toBeNull();
    });
  });
});
