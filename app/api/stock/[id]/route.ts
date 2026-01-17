import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const stockEntry = await prisma.stockEntry.findFirst({
      where: {
        id,
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify stock entry belongs to user's account
    const existingEntry = await prisma.stockEntry.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Stock entry not found' }, { status: 404 });
    }

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify stock entry belongs to user's account
    const existingEntry = await prisma.stockEntry.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Stock entry not found' }, { status: 404 });
    }

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
