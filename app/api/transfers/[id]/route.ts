import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get a single transfer
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

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
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
              select: { id: true, name: true, unit: true, costPrice: true },
            },
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error fetching transfer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfer' },
      { status: 500 }
    );
  }
}

// Update transfer status (complete, cancel, mark in transit)
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

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !['complete', 'cancel', 'in_transit'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action required: complete, cancel, or in_transit' },
        { status: 400 }
      );
    }

    // Validate state transitions
    if (action === 'complete' && transfer.status !== 'PENDING' && transfer.status !== 'IN_TRANSIT') {
      return NextResponse.json(
        { error: 'Can only complete pending or in-transit transfers' },
        { status: 400 }
      );
    }

    if (action === 'cancel' && transfer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only cancel pending transfers' },
        { status: 400 }
      );
    }

    if (action === 'in_transit' && transfer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only mark pending transfers as in transit' },
        { status: 400 }
      );
    }

    if (action === 'complete') {
      // Create stock movements for the transfer
      await prisma.$transaction(async (tx) => {
        // Create TRANSFER_OUT movements from source store
        // Create TRANSFER_IN movements to destination store
        for (const transferItem of transfer.items) {
          // Transfer out from source
          await tx.stockMovement.create({
            data: {
              itemId: transferItem.itemId,
              storeId: transfer.fromStoreId,
              quantity: -transferItem.quantity, // Negative for out
              type: 'TRANSFER_OUT',
              referenceId: transfer.id,
              referenceType: 'transfer',
              costPrice: transferItem.item.costPrice,
              createdBy: session.user.id,
              accountId: session.user.accountId,
            },
          });

          // Transfer in to destination
          await tx.stockMovement.create({
            data: {
              itemId: transferItem.itemId,
              storeId: transfer.toStoreId,
              quantity: transferItem.quantity, // Positive for in
              type: 'TRANSFER_IN',
              referenceId: transfer.id,
              referenceType: 'transfer',
              costPrice: transferItem.item.costPrice,
              createdBy: session.user.id,
              accountId: session.user.accountId,
            },
          });
        }

        // Update transfer status
        await tx.stockTransfer.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            completedBy: session.user.id,
          },
        });
      });

      const updated = await prisma.stockTransfer.findUnique({
        where: { id },
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

      return NextResponse.json(updated);
    }

    if (action === 'cancel') {
      const updated = await prisma.stockTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
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

      return NextResponse.json(updated);
    }

    if (action === 'in_transit') {
      const updated = await prisma.stockTransfer.update({
        where: { id },
        data: { status: 'IN_TRANSIT' },
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

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to update transfer' },
      { status: 500 }
    );
  }
}

// Delete a transfer (only pending ones)
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

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only delete pending transfers' },
        { status: 400 }
      );
    }

    // Delete transfer (items will be cascade deleted)
    await prisma.stockTransfer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transfer:', error);
    return NextResponse.json(
      { error: 'Failed to delete transfer' },
      { status: 500 }
    );
  }
}
