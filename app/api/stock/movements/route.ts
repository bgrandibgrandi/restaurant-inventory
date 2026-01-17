import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MovementType } from '@prisma/client';

// GET - List movements with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const itemId = searchParams.get('itemId');
    const type = searchParams.get('type') as MovementType | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      accountId: session.user.accountId,
    };

    if (storeId) where.storeId = storeId;
    if (itemId) where.itemId = itemId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
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
              category: { select: { id: true, name: true } },
            },
          },
          store: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    // Fetch related invoices for movements that have invoice references
    const movementsWithInvoices = await Promise.all(
      movements.map(async (movement) => {
        let invoice = null;
        if (movement.referenceType === 'invoice' && movement.referenceId) {
          invoice = await prisma.invoice.findUnique({
            where: { id: movement.referenceId },
            select: {
              id: true,
              invoiceNumber: true,
              supplierName: true,
              invoiceDate: true,
              totalAmount: true,
              fileName: true,
            },
          });
        }
        return { ...movement, invoice };
      })
    );

    return NextResponse.json({
      movements: movementsWithInvoices,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movements' },
      { status: 500 }
    );
  }
}

// POST - Create a manual movement (purchase, waste, adjustment)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      itemId,
      storeId,
      quantity,
      type,
      reason,
      notes,
      costPrice,
      referenceId,
      referenceType,
    } = await request.json();

    // Validate required fields
    if (!itemId || !storeId || quantity === undefined || !type) {
      return NextResponse.json(
        { error: 'itemId, storeId, quantity, and type are required' },
        { status: 400 }
      );
    }

    // Validate item exists and belongs to account
    const item = await prisma.item.findFirst({
      where: { id: itemId, accountId: session.user.accountId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Validate store exists and belongs to account
    const store = await prisma.store.findFirst({
      where: { id: storeId, accountId: session.user.accountId },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Ensure quantity sign matches movement type
    let adjustedQuantity = Math.abs(quantity);
    if (type === 'WASTE' || type === 'TRANSFER_OUT' || type === 'SALE') {
      adjustedQuantity = -adjustedQuantity;
    } else if (type === 'ADJUSTMENT') {
      // Adjustments can be positive or negative
      adjustedQuantity = quantity;
    }

    const movement = await prisma.stockMovement.create({
      data: {
        itemId,
        storeId,
        quantity: adjustedQuantity,
        type,
        reason,
        notes,
        costPrice: costPrice || item.costPrice,
        referenceId,
        referenceType: referenceType || 'manual',
        createdBy: session.user.id,
        accountId: session.user.accountId,
      },
      include: {
        item: { select: { id: true, name: true, unit: true } },
        store: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Error creating movement:', error);
    return NextResponse.json(
      { error: 'Failed to create movement' },
      { status: 500 }
    );
  }
}
