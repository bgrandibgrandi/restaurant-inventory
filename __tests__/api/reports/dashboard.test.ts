/**
 * Tests for Reports Dashboard calculations
 */

type StockEntry = {
  itemId: string;
  storeId: string;
  quantity: number;
  unitCost: number | null;
  createdAt: Date;
};

type Item = {
  id: string;
  name: string;
  costPrice: number | null;
  minStockLevel: number | null;
  unit: string;
};

type WasteMovement = {
  quantity: number;
  costPrice: number | null;
  reason: string | null;
};

// Calculate inventory value from stock entries
function calculateInventoryValue(
  entries: StockEntry[],
  items: Map<string, Item>
): number {
  // Get latest entry per item/store
  const latestByItemStore = new Map<string, StockEntry>();

  // Sort by date descending to get latest first
  const sorted = [...entries].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  sorted.forEach((entry) => {
    const key = `${entry.itemId}-${entry.storeId}`;
    if (!latestByItemStore.has(key)) {
      latestByItemStore.set(key, entry);
    }
  });

  let totalValue = 0;
  latestByItemStore.forEach((entry) => {
    const item = items.get(entry.itemId);
    const cost = entry.unitCost || item?.costPrice || 0;
    totalValue += entry.quantity * cost;
  });

  return totalValue;
}

// Calculate low stock items
function getLowStockItems(
  entries: StockEntry[],
  items: Item[]
): { id: string; name: string; current: number; min: number }[] {
  const lowStock: { id: string; name: string; current: number; min: number }[] = [];

  // Get latest quantity per item
  const latestByItem = new Map<string, number>();
  const sorted = [...entries].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  sorted.forEach((entry) => {
    if (!latestByItem.has(entry.itemId)) {
      latestByItem.set(entry.itemId, entry.quantity);
    }
  });

  items.forEach((item) => {
    if (item.minStockLevel !== null) {
      const currentQty = latestByItem.get(item.id) || 0;
      if (currentQty < item.minStockLevel) {
        lowStock.push({
          id: item.id,
          name: item.name,
          current: currentQty,
          min: item.minStockLevel,
        });
      }
    }
  });

  return lowStock;
}

// Calculate waste value by reason
function calculateWasteByReason(
  movements: WasteMovement[]
): Record<string, number> {
  const wasteByReason: Record<string, number> = {};

  movements.forEach((m) => {
    const reason = m.reason || 'Unspecified';
    const value = Math.abs(m.quantity) * (m.costPrice || 0);
    wasteByReason[reason] = (wasteByReason[reason] || 0) + value;
  });

  return wasteByReason;
}

describe('Reports Dashboard', () => {
  describe('Inventory value calculation', () => {
    it('should calculate total value from latest entries', () => {
      const items = new Map<string, Item>([
        ['item1', { id: 'item1', name: 'Tomatoes', costPrice: 2.5, minStockLevel: 10, unit: 'kg' }],
        ['item2', { id: 'item2', name: 'Onions', costPrice: 1.5, minStockLevel: 5, unit: 'kg' }],
      ]);

      const entries: StockEntry[] = [
        { itemId: 'item1', storeId: 'store1', quantity: 100, unitCost: null, createdAt: new Date('2024-01-01') },
        { itemId: 'item1', storeId: 'store1', quantity: 80, unitCost: null, createdAt: new Date('2024-01-15') },
        { itemId: 'item2', storeId: 'store1', quantity: 50, unitCost: null, createdAt: new Date('2024-01-10') },
      ];

      const value = calculateInventoryValue(entries, items);

      // Latest: item1=80 @ 2.5 = 200, item2=50 @ 1.5 = 75
      expect(value).toBe(275);
    });

    it('should use entry unitCost over item costPrice', () => {
      const items = new Map<string, Item>([
        ['item1', { id: 'item1', name: 'Tomatoes', costPrice: 2.5, minStockLevel: 10, unit: 'kg' }],
      ]);

      const entries: StockEntry[] = [
        { itemId: 'item1', storeId: 'store1', quantity: 100, unitCost: 3.0, createdAt: new Date('2024-01-01') },
      ];

      const value = calculateInventoryValue(entries, items);

      // 100 @ 3.0 (unitCost) = 300, not 100 @ 2.5 (costPrice) = 250
      expect(value).toBe(300);
    });

    it('should handle multiple stores separately', () => {
      const items = new Map<string, Item>([
        ['item1', { id: 'item1', name: 'Tomatoes', costPrice: 2.0, minStockLevel: 10, unit: 'kg' }],
      ]);

      const entries: StockEntry[] = [
        { itemId: 'item1', storeId: 'store1', quantity: 50, unitCost: null, createdAt: new Date('2024-01-01') },
        { itemId: 'item1', storeId: 'store2', quantity: 30, unitCost: null, createdAt: new Date('2024-01-01') },
      ];

      const value = calculateInventoryValue(entries, items);

      // store1: 50 @ 2.0 = 100, store2: 30 @ 2.0 = 60
      expect(value).toBe(160);
    });

    it('should return 0 for empty entries', () => {
      const items = new Map<string, Item>();
      const entries: StockEntry[] = [];

      const value = calculateInventoryValue(entries, items);
      expect(value).toBe(0);
    });
  });

  describe('Low stock detection', () => {
    it('should identify items below minimum level', () => {
      const items: Item[] = [
        { id: 'item1', name: 'Tomatoes', costPrice: 2.5, minStockLevel: 10, unit: 'kg' },
        { id: 'item2', name: 'Onions', costPrice: 1.5, minStockLevel: 20, unit: 'kg' },
      ];

      const entries: StockEntry[] = [
        { itemId: 'item1', storeId: 'store1', quantity: 5, unitCost: null, createdAt: new Date() },
        { itemId: 'item2', storeId: 'store1', quantity: 25, unitCost: null, createdAt: new Date() },
      ];

      const lowStock = getLowStockItems(entries, items);

      expect(lowStock.length).toBe(1);
      expect(lowStock[0].id).toBe('item1');
      expect(lowStock[0].current).toBe(5);
      expect(lowStock[0].min).toBe(10);
    });

    it('should treat missing entries as zero quantity', () => {
      const items: Item[] = [
        { id: 'item1', name: 'Tomatoes', costPrice: 2.5, minStockLevel: 10, unit: 'kg' },
      ];

      const entries: StockEntry[] = [];

      const lowStock = getLowStockItems(entries, items);

      expect(lowStock.length).toBe(1);
      expect(lowStock[0].current).toBe(0);
    });

    it('should skip items without minStockLevel', () => {
      const items: Item[] = [
        { id: 'item1', name: 'Tomatoes', costPrice: 2.5, minStockLevel: null, unit: 'kg' },
      ];

      const entries: StockEntry[] = [
        { itemId: 'item1', storeId: 'store1', quantity: 0, unitCost: null, createdAt: new Date() },
      ];

      const lowStock = getLowStockItems(entries, items);
      expect(lowStock.length).toBe(0);
    });
  });

  describe('Waste by reason calculation', () => {
    it('should group waste value by reason', () => {
      const movements: WasteMovement[] = [
        { quantity: -10, costPrice: 2.0, reason: 'Expired' },
        { quantity: -5, costPrice: 2.0, reason: 'Damaged' },
        { quantity: -3, costPrice: 2.0, reason: 'Expired' },
      ];

      const wasteByReason = calculateWasteByReason(movements);

      expect(wasteByReason['Expired']).toBe(26); // (10 + 3) * 2.0
      expect(wasteByReason['Damaged']).toBe(10); // 5 * 2.0
    });

    it('should use Unspecified for null reasons', () => {
      const movements: WasteMovement[] = [
        { quantity: -5, costPrice: 3.0, reason: null },
      ];

      const wasteByReason = calculateWasteByReason(movements);

      expect(wasteByReason['Unspecified']).toBe(15);
    });

    it('should handle zero cost price', () => {
      const movements: WasteMovement[] = [
        { quantity: -10, costPrice: 0, reason: 'Expired' },
        { quantity: -5, costPrice: null, reason: 'Expired' },
      ];

      const wasteByReason = calculateWasteByReason(movements);

      expect(wasteByReason['Expired']).toBe(0);
    });

    it('should return empty object for no movements', () => {
      const movements: WasteMovement[] = [];
      const wasteByReason = calculateWasteByReason(movements);

      expect(Object.keys(wasteByReason).length).toBe(0);
    });
  });
});
