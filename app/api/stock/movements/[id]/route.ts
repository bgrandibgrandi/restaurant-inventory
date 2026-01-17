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

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Error fetching stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock movement' },
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
