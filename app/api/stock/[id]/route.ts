import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stockEntry = await prisma.stockEntry.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            category: true,
          },
        },
        store: true,
      },
    });

    if (!stockEntry) {
      return NextResponse.json({ error: 'Stock entry not found' }, { status: 404 });
    }

    return NextResponse.json(stockEntry);
  } catch (error) {
    console.error('Error fetching stock entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock entry' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity, unitCost, currency, notes } = body;

    const stockEntry = await prisma.stockEntry.update({
      where: { id },
      data: {
        quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
        unitCost: unitCost !== undefined ? (unitCost ? parseFloat(unitCost) : null) : undefined,
        currency: currency || undefined,
        notes: notes !== undefined ? notes : undefined,
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

    return NextResponse.json(stockEntry);
  } catch (error) {
    console.error('Error updating stock entry:', error);
    return NextResponse.json(
      { error: 'Failed to update stock entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.stockEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stock entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete stock entry' },
      { status: 500 }
    );
  }
}
