import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get a single stock count with all entries
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

    const stockCount = await prisma.stockCount.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        store: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        entries: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!stockCount) {
      return NextResponse.json(
        { error: 'Count not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(stockCount);
  } catch (error) {
    console.error('Error fetching count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch count' },
      { status: 500 }
    );
  }
}

// Update a stock count (add entry, complete, etc.)
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
    const body = await request.json();

    // Check if count exists and belongs to account
    const existingCount = await prisma.stockCount.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingCount) {
      return NextResponse.json(
        { error: 'Count not found' },
        { status: 404 }
      );
    }

    // Handle adding an entry to the count
    if (body.action === 'add_entry') {
      const { itemId, quantity, unitCost, currency, notes } = body;

      if (!itemId || quantity === undefined) {
        return NextResponse.json(
          { error: 'Item and quantity are required' },
          { status: 400 }
        );
      }

      // Create the stock entry linked to this count
      const entry = await prisma.stockEntry.create({
        data: {
          itemId,
          storeId: existingCount.storeId,
          quantity: parseFloat(quantity),
          unitCost: unitCost ? parseFloat(unitCost) : null,
          currency: currency || 'EUR',
          notes: notes || null,
          accountId: session.user.accountId,
          stockCountId: id,
        },
        include: {
          item: {
            include: {
              category: true,
            },
          },
        },
      });

      // Update count stats
      await prisma.stockCount.update({
        where: { id },
        data: {
          itemsCounted: { increment: 1 },
        },
      });

      return NextResponse.json(entry);
    }

    // Handle completing the count
    if (body.action === 'complete') {
      // Calculate total value
      const entries = await prisma.stockEntry.findMany({
        where: { stockCountId: id },
      });

      const totalValue = entries.reduce((sum, entry) => {
        if (entry.unitCost) {
          return sum + entry.quantity * entry.unitCost;
        }
        return sum;
      }, 0);

      const updatedCount = await prisma.stockCount.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          totalValue,
          notes: body.notes || existingCount.notes,
        },
        include: {
          store: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return NextResponse.json(updatedCount);
    }

    // Handle updating entry quantity (quick edit during count)
    if (body.action === 'update_entry') {
      const { entryId, quantity } = body;

      const updatedEntry = await prisma.stockEntry.update({
        where: { id: entryId },
        data: {
          quantity: parseFloat(quantity),
        },
        include: {
          item: {
            include: {
              category: true,
            },
          },
        },
      });

      return NextResponse.json(updatedEntry);
    }

    // Handle deleting an entry
    if (body.action === 'delete_entry') {
      const { entryId } = body;

      await prisma.stockEntry.delete({
        where: { id: entryId },
      });

      // Update count stats
      await prisma.stockCount.update({
        where: { id },
        data: {
          itemsCounted: { decrement: 1 },
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating count:', error);
    return NextResponse.json(
      { error: 'Failed to update count' },
      { status: 500 }
    );
  }
}

// Delete a stock count
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

    // Check if count exists and belongs to account
    const existingCount = await prisma.stockCount.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingCount) {
      return NextResponse.json(
        { error: 'Count not found' },
        { status: 404 }
      );
    }

    // Delete all entries first, then the count
    await prisma.stockEntry.deleteMany({
      where: { stockCountId: id },
    });

    await prisma.stockCount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting count:', error);
    return NextResponse.json(
      { error: 'Failed to delete count' },
      { status: 500 }
    );
  }
}
