import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Record waste for an item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, storeId, quantity, wasteReasonId, notes } = body;

    // Validate required fields
    if (!itemId || !storeId || !quantity || !wasteReasonId) {
      return NextResponse.json(
        { error: 'itemId, storeId, quantity, and wasteReasonId are required' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify item belongs to account
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        accountId: session.user.accountId,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Verify store belongs to account
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        accountId: session.user.accountId,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Verify waste reason belongs to account
    const wasteReason = await prisma.wasteReason.findFirst({
      where: {
        id: wasteReasonId,
        accountId: session.user.accountId,
        isActive: true,
      },
    });

    if (!wasteReason) {
      return NextResponse.json({ error: 'Waste reason not found' }, { status: 404 });
    }

    // Create waste movement (negative quantity)
    const movement = await prisma.stockMovement.create({
      data: {
        itemId,
        storeId,
        quantity: -Math.abs(quantity), // Ensure negative for waste
        type: 'WASTE',
        reason: wasteReason.name,
        notes: notes || null,
        referenceType: 'manual',
        costPrice: item.costPrice || null,
        createdBy: session.user.id,
        accountId: session.user.accountId,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error('Error recording waste:', error);
    return NextResponse.json(
      { error: 'Failed to record waste' },
      { status: 500 }
    );
  }
}

// Get waste summary with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {
      accountId: session.user.accountId,
      type: 'WASTE',
    };

    if (storeId) where.storeId = storeId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    // Get waste grouped by reason
    const wasteByReason = await prisma.stockMovement.groupBy({
      by: ['reason'],
      where,
      _sum: {
        quantity: true,
      },
      _count: true,
    });

    // Get waste grouped by item
    const wasteByItem = await prisma.stockMovement.groupBy({
      by: ['itemId'],
      where,
      _sum: {
        quantity: true,
      },
      _count: true,
    });

    // Get item details
    const itemIds = wasteByItem.map((w) => w.itemId);
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true, unit: true, costPrice: true },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    // Calculate total waste value
    let totalWasteValue = 0;
    const wasteByItemWithDetails = wasteByItem.map((w) => {
      const item = itemMap.get(w.itemId);
      const quantity = Math.abs(w._sum.quantity || 0);
      const value = quantity * (item?.costPrice || 0);
      totalWasteValue += value;

      return {
        itemId: w.itemId,
        itemName: item?.name || 'Unknown',
        unit: item?.unit || 'units',
        quantity,
        value,
        count: w._count,
      };
    });

    return NextResponse.json({
      summary: {
        totalWasteValue,
        totalIncidents: wasteByReason.reduce((sum, w) => sum + w._count, 0),
      },
      byReason: wasteByReason.map((w) => ({
        reason: w.reason || 'Unknown',
        quantity: Math.abs(w._sum.quantity || 0),
        count: w._count,
      })),
      byItem: wasteByItemWithDetails.sort((a, b) => b.value - a.value),
    });
  } catch (error) {
    console.error('Error fetching waste summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waste summary' },
      { status: 500 }
    );
  }
}
