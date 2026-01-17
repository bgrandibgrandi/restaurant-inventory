import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Get a specific transfer
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
      where: { id, accountId: session.user.accountId },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, unit: true, costPrice: true } },
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

// PATCH - Update transfer status (complete, cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, accountId: session.user.accountId },
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

    if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot modify a completed or cancelled transfer' },
        { status: 400 }
      );
    }

    // If completing the transfer, create stock movements
    if (status === 'COMPLETED') {
      // Create movements in a transaction
      await prisma.$transaction(async (tx) => {
        for (const transferItem of transfer.items) {
          // Transfer OUT from source store
          await tx.stockMovement.create({
            data: {
              itemId: transferItem.itemId,
              storeId: transfer.fromStoreId,
              quantity: -transferItem.quantity,
              type: 'TRANSFER_OUT',
              notes: `Transfer to ${transfer.toStoreId}`,
              referenceId: transfer.id,
              referenceType: 'transfer',
              costPrice: transferItem.item.costPrice,
              createdBy: session.user.id,
              accountId: session.user.accountId,
            },
          });

          // Transfer IN to destination store
          await tx.stockMovement.create({
            data: {
              itemId: transferItem.itemId,
              storeId: transfer.toStoreId,
              quantity: transferItem.quantity,
              type: 'TRANSFER_IN',
              notes: `Transfer from ${transfer.fromStoreId}`,
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
    } else if (status === 'CANCELLED') {
      await prisma.stockTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    } else if (status === 'IN_TRANSIT') {
      await prisma.stockTransfer.update({
        where: { id },
        data: { status: 'IN_TRANSIT' },
      });
    }

    const updated = await prisma.stockTransfer.findFirst({
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
  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to update transfer' },
      { status: 500 }
    );
  }
}
