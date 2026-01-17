import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Get all counts with full details
    const counts = await prisma.stockCount.findMany({
      where: {
        accountId: session.user.accountId,
        ...(storeId && storeId !== 'all' ? { storeId } : {}),
        ...(status && status !== 'all' ? { status } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      include: {
        store: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        entries: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get stores for filter dropdown
    const stores = await prisma.store.findMany({
      where: { accountId: session.user.accountId },
      select: { id: true, name: true },
    });

    // Calculate summary statistics
    const totalCounts = counts.length;
    const completedCounts = counts.filter(c => c.status === 'completed').length;
    const inProgressCounts = counts.filter(c => c.status === 'in_progress').length;

    const totalValue = counts
      .filter(c => c.totalValue !== null)
      .reduce((sum, c) => sum + (c.totalValue || 0), 0);

    const totalDiscrepancy = counts
      .filter(c => c.discrepancyValue !== null)
      .reduce((sum, c) => sum + (c.discrepancyValue || 0), 0);

    const totalItemsCounted = counts.reduce((sum, c) => sum + c.itemsCounted, 0);

    // Average count value
    const avgCountValue = completedCounts > 0
      ? totalValue / completedCounts
      : 0;

    // Counts by store
    const countsByStore = stores.map(store => {
      const storeCounts = counts.filter(c => c.storeId === store.id);
      const storeCompleted = storeCounts.filter(c => c.status === 'completed');
      return {
        storeId: store.id,
        storeName: store.name,
        totalCounts: storeCounts.length,
        completedCounts: storeCompleted.length,
        totalValue: storeCompleted.reduce((sum, c) => sum + (c.totalValue || 0), 0),
        totalDiscrepancy: storeCompleted.reduce((sum, c) => sum + (c.discrepancyValue || 0), 0),
      };
    });

    // Counts by month (for trend chart)
    const countsByMonth: Record<string, { month: string; count: number; value: number }> = {};
    counts.forEach(c => {
      const month = c.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!countsByMonth[month]) {
        countsByMonth[month] = { month, count: 0, value: 0 };
      }
      countsByMonth[month].count++;
      if (c.status === 'completed' && c.totalValue) {
        countsByMonth[month].value += c.totalValue;
      }
    });
    const monthlyTrend = Object.values(countsByMonth).sort((a, b) => a.month.localeCompare(b.month));

    // Top items by value across all counts
    const itemValues: Record<string, { itemId: string; name: string; category: string; totalValue: number; totalQuantity: number; countAppearances: number }> = {};
    counts.forEach(count => {
      count.entries.forEach(entry => {
        if (entry.item) {
          const key = entry.itemId;
          if (!itemValues[key]) {
            itemValues[key] = {
              itemId: entry.itemId,
              name: entry.item.name,
              category: entry.item.category?.name || 'Uncategorized',
              totalValue: 0,
              totalQuantity: 0,
              countAppearances: 0,
            };
          }
          const entryValue = entry.quantity * (entry.unitCost || 0);
          itemValues[key].totalValue += entryValue;
          itemValues[key].totalQuantity += entry.quantity;
          itemValues[key].countAppearances++;
        }
      });
    });
    const topItems = Object.values(itemValues)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 20);

    // Items with discrepancies
    const discrepancyItems: { itemId: string; name: string; category: string; discrepancy: number; expected: number; actual: number; countId: string; countDate: Date; storeName: string }[] = [];
    counts.forEach(count => {
      count.entries.forEach(entry => {
        if (entry.discrepancy && entry.discrepancy !== 0 && entry.item) {
          discrepancyItems.push({
            itemId: entry.itemId,
            name: entry.item.name,
            category: entry.item.category?.name || 'Uncategorized',
            discrepancy: entry.discrepancy,
            expected: entry.expectedQuantity || 0,
            actual: entry.quantity,
            countId: count.id,
            countDate: count.createdAt,
            storeName: count.store.name,
          });
        }
      });
    });

    // Value by category
    const categoryValues: Record<string, { category: string; totalValue: number; itemCount: number }> = {};
    counts.forEach(count => {
      count.entries.forEach(entry => {
        if (entry.item) {
          const category = entry.item.category?.name || 'Uncategorized';
          if (!categoryValues[category]) {
            categoryValues[category] = { category, totalValue: 0, itemCount: 0 };
          }
          categoryValues[category].totalValue += entry.quantity * (entry.unitCost || 0);
          categoryValues[category].itemCount++;
        }
      });
    });
    const valueByCategory = Object.values(categoryValues).sort((a, b) => b.totalValue - a.totalValue);

    // Counts by user
    const countsByUser: Record<string, { userId: string; userName: string; totalCounts: number; completedCounts: number }> = {};
    counts.forEach(c => {
      const key = c.userId;
      if (!countsByUser[key]) {
        countsByUser[key] = {
          userId: c.userId,
          userName: c.user.name || c.user.email,
          totalCounts: 0,
          completedCounts: 0,
        };
      }
      countsByUser[key].totalCounts++;
      if (c.status === 'completed') {
        countsByUser[key].completedCounts++;
      }
    });

    // Format counts for display
    const formattedCounts = counts.map(c => ({
      id: c.id,
      name: c.name,
      storeName: c.store.name,
      storeId: c.storeId,
      userName: c.user.name || c.user.email,
      status: c.status,
      itemsCounted: c.itemsCounted,
      totalValue: c.totalValue,
      expectedValue: c.expectedValue,
      discrepancyValue: c.discrepancyValue,
      createdAt: c.createdAt,
      completedAt: c.completedAt,
      entries: c.entries.map(e => ({
        id: e.id,
        itemId: e.itemId,
        itemName: e.item?.name || 'Unknown Item',
        category: e.item?.category?.name || 'Uncategorized',
        quantity: e.quantity,
        unitCost: e.unitCost,
        totalValue: e.quantity * (e.unitCost || 0),
        expectedQuantity: e.expectedQuantity,
        discrepancy: e.discrepancy,
        unit: e.item?.unit || 'units',
      })),
    }));

    return NextResponse.json({
      summary: {
        totalCounts,
        completedCounts,
        inProgressCounts,
        totalValue,
        totalDiscrepancy,
        totalItemsCounted,
        avgCountValue,
      },
      stores,
      counts: formattedCounts,
      countsByStore,
      countsByUser: Object.values(countsByUser),
      monthlyTrend,
      topItems,
      discrepancyItems: discrepancyItems.sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy)).slice(0, 50),
      valueByCategory,
    });
  } catch (error) {
    console.error('Error fetching count reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
