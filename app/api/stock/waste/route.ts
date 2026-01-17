import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Record waste for one or more items
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items, storeId } = await request.json();

    // items should be array of { itemId, quantity, reasonId, notes }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Validate store
    const store = await prisma.store.findFirst({
      where: { id: storeId, accountId: session.user.accountId },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Validate all items exist
    const itemIds = items.map((i: any) => i.itemId);
    const dbItems = await prisma.item.findMany({
      where: { id: { in: itemIds }, accountId: session.user.accountId },
    });

    if (dbItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'One or more items not found' },
        { status: 404 }
      );
    }

    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    // Get waste reason names for the reason field
    const reasonIds = [...new Set(items.map((i: any) => i.reasonId).filter(Boolean))];
    const reasons = await prisma.wasteReason.findMany({
      where: { id: { in: reasonIds }, accountId: session.user.accountId },
    });
    const reasonMap = new Map(reasons.map((r) => [r.id, r.name]));

    // Create movements for each waste item
    const movements = [];
    for (const wasteItem of items) {
      const item = itemMap.get(wasteItem.itemId);
      if (!item) continue;

      const movement = await prisma.stockMovement.create({
        data: {
          itemId: wasteItem.itemId,
          storeId,
          quantity: -Math.abs(wasteItem.quantity), // Always negative for waste
          type: 'WASTE',
          reason: wasteItem.reasonId ? reasonMap.get(wasteItem.reasonId) : null,
          notes: wasteItem.notes,
          costPrice: item.costPrice,
          referenceId: wasteItem.reasonId,
          referenceType: 'waste_reason',
          createdBy: session.user.id,
          accountId: session.user.accountId,
        },
        include: {
          item: { select: { id: true, name: true, unit: true } },
        },
      });
      movements.push(movement);
    }

    // Calculate total waste value
    const totalValue = movements.reduce((sum, m) => {
      return sum + Math.abs(m.quantity) * (m.costPrice || 0);
    }, 0);

    return NextResponse.json({
      movements,
      count: movements.length,
      totalValue,
    });
  } catch (error) {
    console.error('Error recording waste:', error);
    return NextResponse.json(
      { error: 'Failed to record waste' },
      { status: 500 }
    );
  }
}

// GET - Get waste summary with filters
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
    const groupBy = searchParams.get('groupBy') || 'reason'; // reason, item, date

    const where: any = {
      accountId: session.user.accountId,
      type: 'WASTE',
    };

    if (storeId) where.storeId = storeId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get all waste movements
    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, unit: true, costPrice: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totalQuantity = movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const totalValue = movements.reduce((sum, m) => {
      return sum + Math.abs(m.quantity) * (m.costPrice || 0);
    }, 0);

    // Group by reason
    const byReason: Record<string, { count: number; value: number }> = {};
    movements.forEach((m) => {
      const reason = m.reason || 'Unspecified';
      if (!byReason[reason]) {
        byReason[reason] = { count: 0, value: 0 };
      }
      byReason[reason].count += Math.abs(m.quantity);
      byReason[reason].value += Math.abs(m.quantity) * (m.costPrice || 0);
    });

    // Group by item
    const byItem: Record<string, { name: string; count: number; value: number; unit: string }> = {};
    movements.forEach((m) => {
      if (!byItem[m.itemId]) {
        byItem[m.itemId] = {
          name: m.item.name,
          count: 0,
          value: 0,
          unit: m.item.unit,
        };
      }
      byItem[m.itemId].count += Math.abs(m.quantity);
      byItem[m.itemId].value += Math.abs(m.quantity) * (m.costPrice || 0);
    });

    return NextResponse.json({
      movements,
      summary: {
        totalQuantity,
        totalValue,
        byReason: Object.entries(byReason).map(([reason, data]) => ({
          reason,
          ...data,
        })).sort((a, b) => b.value - a.value),
        byItem: Object.entries(byItem).map(([itemId, data]) => ({
          itemId,
          ...data,
        })).sort((a, b) => b.value - a.value),
      },
    });
  } catch (error) {
    console.error('Error fetching waste summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waste summary' },
      { status: 500 }
    );
  }
}
