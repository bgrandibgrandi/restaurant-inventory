import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Get all stock entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    const stockEntries = await prisma.stockEntry.findMany({
      where: storeId ? { storeId } : {},
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
    const body = await request.json();
    const { itemId, storeId, quantity, unitCost, currency, notes, accountId } = body;

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
        accountId: accountId || 'default-account',
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
