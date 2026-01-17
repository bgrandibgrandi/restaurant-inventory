import { prisma } from './db';
import { MovementType } from '@prisma/client';

export interface CalculatedStock {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  quantity: number;
  value: number;
  unit: string;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  isLowStock: boolean;
  isOverStock: boolean;
  categoryId: string | null;
  categoryName: string | null;
}

export interface StockAlert {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  currentQuantity: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  unit: string;
  alertType: 'LOW_STOCK' | 'OVER_STOCK';
  severity: 'warning' | 'critical';
}

// Movement types that add to stock
const INBOUND_TYPES: MovementType[] = ['PURCHASE', 'TRANSFER_IN', 'ADJUSTMENT'];
// Movement types that subtract from stock
const OUTBOUND_TYPES: MovementType[] = ['WASTE', 'TRANSFER_OUT', 'SALE'];

/**
 * Calculate current stock levels for all items in a store
 * Based on sum of all stock movements
 */
export async function calculateStockByStore(
  accountId: string,
  storeId?: string
): Promise<CalculatedStock[]> {
  // Get all movements grouped by item and store
  const movements = await prisma.stockMovement.groupBy({
    by: ['itemId', 'storeId'],
    where: {
      accountId,
      ...(storeId && { storeId }),
    },
    _sum: {
      quantity: true,
    },
  });

  // Get item and store details
  const itemIds = [...new Set(movements.map((m) => m.itemId))];
  const storeIds = [...new Set(movements.map((m) => m.storeId))];

  const [items, stores] = await Promise.all([
    prisma.item.findMany({
      where: { id: { in: itemIds } },
      include: { category: true },
    }),
    prisma.store.findMany({
      where: { id: { in: storeIds } },
    }),
  ]);

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const storeMap = new Map(stores.map((s) => [s.id, s]));

  // Calculate stock for each item/store combination
  const results: CalculatedStock[] = movements.map((m) => {
    const item = itemMap.get(m.itemId);
    const store = storeMap.get(m.storeId);
    const quantity = m._sum.quantity || 0;
    const costPrice = item?.costPrice || 0;

    return {
      itemId: m.itemId,
      itemName: item?.name || 'Unknown',
      storeId: m.storeId,
      storeName: store?.name || 'Unknown',
      quantity,
      value: quantity * costPrice,
      unit: item?.unit || 'units',
      minStockLevel: item?.minStockLevel || null,
      maxStockLevel: item?.maxStockLevel || null,
      isLowStock: item?.minStockLevel ? quantity < item.minStockLevel : false,
      isOverStock: item?.maxStockLevel ? quantity > item.maxStockLevel : false,
      categoryId: item?.categoryId || null,
      categoryName: item?.category?.name || null,
    };
  });

  return results.sort((a, b) => a.itemName.localeCompare(b.itemName));
}

/**
 * Calculate stock for a single item across all stores or a specific store
 */
export async function calculateStockForItem(
  accountId: string,
  itemId: string,
  storeId?: string
): Promise<number> {
  const result = await prisma.stockMovement.aggregate({
    where: {
      accountId,
      itemId,
      ...(storeId && { storeId }),
    },
    _sum: {
      quantity: true,
    },
  });

  return result._sum.quantity || 0;
}

/**
 * Get low stock alerts for items below their minimum level
 */
export async function getStockAlerts(
  accountId: string,
  storeId?: string
): Promise<StockAlert[]> {
  const stockLevels = await calculateStockByStore(accountId, storeId);

  const alerts: StockAlert[] = [];

  for (const stock of stockLevels) {
    if (stock.isLowStock && stock.minStockLevel !== null) {
      const percentOfMin = (stock.quantity / stock.minStockLevel) * 100;
      alerts.push({
        itemId: stock.itemId,
        itemName: stock.itemName,
        storeId: stock.storeId,
        storeName: stock.storeName,
        currentQuantity: stock.quantity,
        minStockLevel: stock.minStockLevel,
        maxStockLevel: stock.maxStockLevel,
        unit: stock.unit,
        alertType: 'LOW_STOCK',
        severity: percentOfMin < 25 ? 'critical' : 'warning',
      });
    }

    if (stock.isOverStock && stock.maxStockLevel !== null) {
      alerts.push({
        itemId: stock.itemId,
        itemName: stock.itemName,
        storeId: stock.storeId,
        storeName: stock.storeName,
        currentQuantity: stock.quantity,
        minStockLevel: stock.minStockLevel || 0,
        maxStockLevel: stock.maxStockLevel,
        unit: stock.unit,
        alertType: 'OVER_STOCK',
        severity: 'warning',
      });
    }
  }

  // Sort by severity (critical first) then by name
  return alerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return a.itemName.localeCompare(b.itemName);
  });
}

/**
 * Calculate total inventory value for a store or all stores
 */
export async function calculateInventoryValue(
  accountId: string,
  storeId?: string
): Promise<{ totalValue: number; totalItems: number; byStore: Record<string, number> }> {
  const stockLevels = await calculateStockByStore(accountId, storeId);

  const byStore: Record<string, number> = {};
  let totalValue = 0;
  let totalItems = 0;

  for (const stock of stockLevels) {
    totalValue += stock.value;
    totalItems++;
    byStore[stock.storeId] = (byStore[stock.storeId] || 0) + stock.value;
  }

  return { totalValue, totalItems, byStore };
}

/**
 * Get expected stock quantity for an item at a specific point in time
 * Used for stock count discrepancy calculation
 */
export async function getExpectedStockAtTime(
  accountId: string,
  itemId: string,
  storeId: string,
  beforeDate: Date
): Promise<number> {
  const result = await prisma.stockMovement.aggregate({
    where: {
      accountId,
      itemId,
      storeId,
      createdAt: {
        lt: beforeDate,
      },
    },
    _sum: {
      quantity: true,
    },
  });

  return result._sum.quantity || 0;
}

/**
 * Create a stock movement record
 */
export async function createStockMovement(params: {
  accountId: string;
  itemId: string;
  storeId: string;
  quantity: number;
  type: MovementType;
  reason?: string;
  notes?: string;
  referenceId?: string;
  referenceType?: string;
  costPrice?: number;
  createdBy?: string;
}) {
  return prisma.stockMovement.create({
    data: {
      accountId: params.accountId,
      itemId: params.itemId,
      storeId: params.storeId,
      quantity: params.quantity,
      type: params.type,
      reason: params.reason,
      notes: params.notes,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      costPrice: params.costPrice,
      createdBy: params.createdBy,
    },
    include: {
      item: true,
      store: true,
    },
  });
}

/**
 * Get movement type label for display
 */
export function getMovementTypeLabel(type: MovementType): string {
  const labels: Record<MovementType, string> = {
    PURCHASE: 'Purchase',
    WASTE: 'Waste',
    TRANSFER_IN: 'Transfer In',
    TRANSFER_OUT: 'Transfer Out',
    ADJUSTMENT: 'Adjustment',
    SALE: 'Sale',
  };
  return labels[type] || type;
}

/**
 * Check if a movement type adds stock (positive) or removes stock (negative)
 */
export function isInboundMovement(type: MovementType): boolean {
  return INBOUND_TYPES.includes(type);
}
