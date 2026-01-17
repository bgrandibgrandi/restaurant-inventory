import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TransferStatus } from '@prisma/client';

// Get all transfers with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as TransferStatus | null;
    const fromStoreId = searchParams.get('fromStoreId');
    const toStoreId = searchParams.get('toStoreId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {
      accountId: session.user.accountId,
    };

    if (status) where.status = status;
    if (fromStoreId) where.fromStoreId = fromStoreId;
    if (toStoreId) where.toStoreId = toStoreId;

    const [transfers, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        where,
        include: {
          fromStore: {
            select: { id: true, name: true },
          },
          toStore: {
            select: { id: true, name: true },
          },
          items: {
            include: {
              item: {
                select: { id: true, name: true, unit: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.stockTransfer.count({ where }),
    ]);

    return NextResponse.json({
      transfers,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}

// Create a new transfer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fromStoreId, toStoreId, items, notes } = body;

    // Validate required fields
    if (!fromStoreId || !toStoreId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'fromStoreId, toStoreId, and items array are required' },
        { status: 400 }
      );
    }

    if (fromStoreId === toStoreId) {
      return NextResponse.json(
        { error: 'Cannot transfer to the same store' },
        { status: 400 }
      );
    }

    // Verify stores belong to account
    const [fromStore, toStore] = await Promise.all([
      prisma.store.findFirst({
        where: { id: fromStoreId, accountId: session.user.accountId },
      }),
      prisma.store.findFirst({
        where: { id: toStoreId, accountId: session.user.accountId },
      }),
    ]);

    if (!fromStore) {
      return NextResponse.json({ error: 'Source store not found' }, { status: 404 });
    }

    if (!toStore) {
      return NextResponse.json({ error: 'Destination store not found' }, { status: 404 });
    }

    // Validate items
    for (const item of items) {
      if (!item.itemId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Each item must have itemId and positive quantity' },
          { status: 400 }
        );
      }

      const existingItem = await prisma.item.findFirst({
        where: { id: item.itemId, accountId: session.user.accountId },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: `Item ${item.itemId} not found` },
          { status: 404 }
        );
      }
    }

    // Create transfer with items
    const transfer = await prisma.stockTransfer.create({
      data: {
        fromStoreId,
        toStoreId,
        notes: notes || null,
        createdBy: session.user.id,
        accountId: session.user.accountId,
        items: {
          create: items.map((item: { itemId: string; quantity: number }) => ({
            itemId: item.itemId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        fromStore: {
          select: { id: true, name: true },
        },
        toStore: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            item: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    );
  }
}
