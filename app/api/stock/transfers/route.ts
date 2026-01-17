import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - List transfers with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      accountId: session.user.accountId,
    };

    if (storeId) {
      where.OR = [{ fromStoreId: storeId }, { toStoreId: storeId }];
    }

    if (status) {
      where.status = status;
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, unit: true, costPrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}

// POST - Create a new transfer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fromStoreId, toStoreId, items, notes } = await request.json();

    if (!fromStoreId || !toStoreId) {
      return NextResponse.json(
        { error: 'From and To store IDs are required' },
        { status: 400 }
      );
    }

    if (fromStoreId === toStoreId) {
      return NextResponse.json(
        { error: 'Cannot transfer to the same store' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Validate stores belong to account
    const stores = await prisma.store.findMany({
      where: {
        id: { in: [fromStoreId, toStoreId] },
        accountId: session.user.accountId,
      },
    });

    if (stores.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid store(s)' },
        { status: 400 }
      );
    }

    // Validate items
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

    // Create transfer with items
    const transfer = await prisma.stockTransfer.create({
      data: {
        fromStoreId,
        toStoreId,
        notes,
        createdBy: session.user.id,
        accountId: session.user.accountId,
        items: {
          create: items.map((i: any) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });

    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    );
  }
}
