import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get all stock entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    const stockEntries = await prisma.stockEntry.findMany({
      where: {
        accountId: session.user.accountId,
        ...(storeId ? { storeId } : {}),
      },
      include: {
        item: {
          include: {
            category: true,
          },
        },
        store: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(stockEntries);
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock' },
      { status: 500 }
    );
  }
}

// Add stock entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, storeId, quantity, unitCost, currency, notes } = body;

    if (!itemId || !storeId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Item, store, and quantity are required' },
        { status: 400 }
      );
    }

    const stockEntry = await prisma.stockEntry.create({
      data: {
        itemId,
        storeId,
        quantity: parseFloat(quantity),
        unitCost: unitCost ? parseFloat(unitCost) : null,
        currency: currency || 'EUR',
        notes: notes || null,
        accountId: session.user.accountId,
      },
      include: {
        item: {
          include: {
            category: true,
          },
        },
        store: true,
      },
    });

    return NextResponse.json(stockEntry, { status: 201 });
  } catch (error) {
    console.error('Error creating stock entry:', error);
    return NextResponse.json(
      { error: 'Failed to create stock entry' },
      { status: 500 }
    );
  }
}
