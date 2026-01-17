import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get a single waste reason
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

    const reason = await prisma.wasteReason.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!reason) {
      return NextResponse.json({ error: 'Waste reason not found' }, { status: 404 });
    }

    return NextResponse.json(reason);
  } catch (error) {
    console.error('Error fetching waste reason:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waste reason' },
      { status: 500 }
    );
  }
}

// Update a waste reason
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

    const existing = await prisma.wasteReason.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Waste reason not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    // Check for duplicate name if changing
    if (name && name !== existing.name) {
      const duplicate = await prisma.wasteReason.findFirst({
        where: {
          name,
          accountId: session.user.accountId,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A waste reason with this name already exists' },
          { status: 400 }
        );
      }
    }

    const reason = await prisma.wasteReason.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(reason);
  } catch (error) {
    console.error('Error updating waste reason:', error);
    return NextResponse.json(
      { error: 'Failed to update waste reason' },
      { status: 500 }
    );
  }
}

// Delete a waste reason (soft delete by deactivating)
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

    const existing = await prisma.wasteReason.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Waste reason not found' }, { status: 404 });
    }

    // Soft delete by deactivating
    await prisma.wasteReason.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting waste reason:', error);
    return NextResponse.json(
      { error: 'Failed to delete waste reason' },
      { status: 500 }
    );
  }
}
