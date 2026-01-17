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

    // Build update data object with only the fields that were provided
    const updateData: Record<string, unknown> = {};

    if ('name' in body) updateData.name = body.name;
    if ('description' in body) updateData.description = body.description || null;
    if ('unit' in body) updateData.unit = body.unit;
    if ('categoryId' in body) updateData.categoryId = body.categoryId || null;
    if ('supplierId' in body) updateData.supplierId = body.supplierId || null;
    if ('sku' in body) updateData.sku = body.sku || null;
    if ('barcode' in body) updateData.barcode = body.barcode || null;
    if ('minStockLevel' in body) updateData.minStockLevel = body.minStockLevel;
    if ('maxStockLevel' in body) updateData.maxStockLevel = body.maxStockLevel;
    if ('costPrice' in body) updateData.costPrice = body.costPrice;

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
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
