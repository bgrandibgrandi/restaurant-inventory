import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MovementType } from '@prisma/client';

// Get stock movements with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const itemId = searchParams.get('itemId');
    const type = searchParams.get('type') as MovementType | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {
      accountId: session.user.accountId,
    };

    if (storeId) where.storeId = storeId;
    if (itemId) where.itemId = itemId;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              unit: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      movements,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock movements' },
      { status: 500 }
    );
  }
}

// Create a new stock movement (manual entry)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, storeId, quantity, type, reason, notes, costPrice } = body;

    // Validate required fields
    if (!itemId || !storeId || quantity === undefined || !type) {
      return NextResponse.json(
        { error: 'itemId, storeId, quantity, and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes: MovementType[] = ['PURCHASE', 'WASTE', 'ADJUSTMENT', 'SALE'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid movement type. Must be one of: ${validTypes.join(', ')}` },
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

    // Determine quantity sign based on movement type
    let adjustedQuantity = Math.abs(quantity);
    if (type === 'WASTE' || type === 'SALE') {
      adjustedQuantity = -adjustedQuantity;
    }

    const movement = await prisma.stockMovement.create({
      data: {
        itemId,
        storeId,
        quantity: adjustedQuantity,
        type,
        reason: reason || null,
        notes: notes || null,
        referenceType: 'manual',
        costPrice: costPrice || item.costPrice || null,
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
    console.error('Error creating stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to create stock movement' },
      { status: 500 }
    );
  }
}
