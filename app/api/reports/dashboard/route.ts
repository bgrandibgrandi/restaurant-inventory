import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Dashboard summary data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = session.user.accountId;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build store filter
    const storeFilter = storeId ? { storeId } : {};

    // 1. Total inventory value (from latest stock entries per item/store)
    const stockEntries = await prisma.stockEntry.findMany({
      where: { accountId, ...storeFilter },
      include: { item: { select: { costPrice: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Get unique latest entry per item/store
    const latestByItemStore = new Map<string, typeof stockEntries[0]>();
    stockEntries.forEach((entry) => {
      const key = `${entry.itemId}-${entry.storeId}`;
      if (!latestByItemStore.has(key)) {
        latestByItemStore.set(key, entry);
      }
    });

    let totalInventoryValue = 0;
    let totalItems = 0;
    latestByItemStore.forEach((entry) => {
      const cost = entry.unitCost || entry.item.costPrice || 0;
      totalInventoryValue += entry.quantity * cost;
      totalItems++;
    });

    // 2. Variance from recent counts
    const recentCounts = await prisma.stockCount.findMany({
      where: {
        accountId,
        ...storeFilter,
        completedAt: { gte: startDate },
      },
      include: {
        entries: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    let totalVarianceValue = 0;
    let totalVarianceItems = 0;
    recentCounts.forEach((count) => {
      if (count.discrepancyValue) {
        totalVarianceValue += count.discrepancyValue;
      }
      count.entries.forEach((entry) => {
        if (entry.discrepancy && entry.discrepancy !== 0) {
          totalVarianceItems++;
        }
      });
    });

    // 3. Low stock items (below minStockLevel)
    const itemsWithMinStock = await prisma.item.findMany({
      where: {
        accountId,
        minStockLevel: { not: null },
      },
      select: {
        id: true,
        name: true,
        unit: true,
        minStockLevel: true,
      },
    });

    const lowStockItems: { id: string; name: string; current: number; min: number; unit: string }[] = [];
    for (const item of itemsWithMinStock) {
      const latestEntry = await prisma.stockEntry.findFirst({
        where: { itemId: item.id, accountId, ...storeFilter },
        orderBy: { createdAt: 'desc' },
      });
      const currentStock = latestEntry?.quantity || 0;
      if (currentStock < (item.minStockLevel || 0)) {
        lowStockItems.push({
          id: item.id,
          name: item.name,
          current: currentStock,
          min: item.minStockLevel || 0,
          unit: item.unit,
        });
      }
    }

    // 4. Waste summary for period
    const wasteMovements = await prisma.stockMovement.findMany({
      where: {
        accountId,
        ...storeFilter,
        type: 'WASTE',
        createdAt: { gte: startDate },
      },
      include: {
        item: { select: { name: true } },
      },
    });

    const wasteTotal = wasteMovements.reduce((sum, m) => {
      return sum + Math.abs(m.quantity) * (m.costPrice || 0);
    }, 0);

    const wasteByReason: Record<string, number> = {};
    wasteMovements.forEach((m) => {
      const reason = m.reason || 'Unspecified';
      wasteByReason[reason] = (wasteByReason[reason] || 0) + Math.abs(m.quantity) * (m.costPrice || 0);
    });

    // 5. Recent stock movements summary
    const recentMovements = await prisma.stockMovement.findMany({
      where: {
        accountId,
        ...storeFilter,
        createdAt: { gte: startDate },
      },
    });

    const movementsByType: Record<string, { count: number; value: number }> = {};
    recentMovements.forEach((m) => {
      if (!movementsByType[m.type]) {
        movementsByType[m.type] = { count: 0, value: 0 };
      }
      movementsByType[m.type].count++;
      movementsByType[m.type].value += Math.abs(m.quantity) * (m.costPrice || 0);
    });

    // 6. Inventory value trend (simplified - current value only for now)
    const valueTrend = [
      { date: new Date().toISOString().split('T')[0], value: totalInventoryValue },
    ];

    return NextResponse.json({
      summary: {
        totalInventoryValue,
        totalItems,
        lowStockCount: lowStockItems.length,
        wasteValue: wasteTotal,
        varianceValue: totalVarianceValue,
        varianceItemCount: totalVarianceItems,
      },
      lowStockItems: lowStockItems.slice(0, 10),
      wasteByReason: Object.entries(wasteByReason)
        .map(([reason, value]) => ({ reason, value }))
        .sort((a, b) => b.value - a.value),
      movementsByType: Object.entries(movementsByType)
        .map(([type, data]) => ({ type, ...data })),
      valueTrend,
      recentCounts: recentCounts.slice(0, 5).map((c) => ({
        id: c.id,
        name: c.name,
        completedAt: c.completedAt,
        totalValue: c.totalValue,
        discrepancyValue: c.discrepancyValue,
        itemsCounted: c.itemsCounted,
      })),
      period: { days, startDate: startDate.toISOString() },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
