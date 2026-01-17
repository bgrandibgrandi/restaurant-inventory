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
    const item = await prisma.item.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item' },
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

    // Verify item belongs to user's account
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      unit,
      categoryId,
      supplierId,
      sku,
      barcode,
      minStockLevel,
      maxStockLevel,
      costPrice,
    } = body;

    const item = await prisma.item.update({
      where: { id },
      data: {
        name,
        description: description || null,
        unit,
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        sku: sku || null,
        barcode: barcode || null,
        minStockLevel: minStockLevel !== undefined ? minStockLevel : undefined,
        maxStockLevel: maxStockLevel !== undefined ? maxStockLevel : undefined,
        costPrice: costPrice !== undefined ? costPrice : undefined,
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
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

    // Verify item belongs to user's account
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Delete associated stock entries first
    await prisma.stockEntry.deleteMany({
      where: { itemId: id },
    });

    // Then delete the item
    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
