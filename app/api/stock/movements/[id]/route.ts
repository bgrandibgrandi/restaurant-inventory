import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get a single stock movement
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

    const movement = await prisma.stockMovement.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            unit: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!movement) {
      return NextResponse.json({ error: 'Movement not found' }, { status: 404 });
    }

    // Fetch related invoice if applicable
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
          fileUrl: true,
          items: {
            select: {
              id: true,
              rawName: true,
              quantity: true,
              unit: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ ...movement, invoice });
  } catch (error) {
    console.error('Error fetching stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock movement' },
      { status: 500 }
    );
  }
}

// Update a stock movement
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
    const { quantity, costPrice, reason, notes } = body;

    const movement = await prisma.stockMovement.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!movement) {
      return NextResponse.json({ error: 'Movement not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};

    if (quantity !== undefined) {
      // Ensure quantity sign is correct for movement type
      let adjustedQuantity = Math.abs(quantity);
      if (movement.type === 'WASTE' || movement.type === 'TRANSFER_OUT' || movement.type === 'SALE') {
        adjustedQuantity = -adjustedQuantity;
      } else if (movement.type === 'ADJUSTMENT') {
        adjustedQuantity = quantity;
      }
      updateData.quantity = adjustedQuantity;
    }

    if (costPrice !== undefined) {
      updateData.costPrice = costPrice;
    }

    if (reason !== undefined) {
      updateData.reason = reason;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updatedMovement = await prisma.stockMovement.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(updatedMovement);
  } catch (error) {
    console.error('Error updating stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to update stock movement' },
      { status: 500 }
    );
  }
}

// Delete a stock movement (only manual ones)
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

    const movement = await prisma.stockMovement.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!movement) {
      return NextResponse.json({ error: 'Movement not found' }, { status: 404 });
    }

    // Only allow deletion of manual entries
    if (movement.referenceType !== 'manual') {
      return NextResponse.json(
        { error: 'Only manual movements can be deleted' },
        { status: 400 }
      );
    }

    await prisma.stockMovement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to delete stock movement' },
      { status: 500 }
    );
  }
}
