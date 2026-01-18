import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWithStore } from '@/lib/get-selected-store';

// Get all items for the selected store
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's selected store
    const userWithStore = await getUserWithStore();

    const items = await prisma.item.findMany({
      where: {
        accountId: session.user.accountId,
        // Filter by selected store if one is selected
        ...(userWithStore?.selectedStoreId && { storeId: userWithStore.selectedStoreId }),
      },
      include: {
        category: true,
        supplier: true,
        store: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// Create new item for the selected store
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's selected store
    const userWithStore = await getUserWithStore();
    if (!userWithStore?.selectedStoreId) {
      return NextResponse.json(
        { error: 'No store selected' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      unit,
      usageUnit,
      purchaseUnit,
      defaultConversion,
      categoryId,
      supplierId,
      sku,
      barcode,
      costPrice,
      minStockLevel,
      maxStockLevel,
      isSoldDirectly,
      isTransformed,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const item = await prisma.item.create({
      data: {
        name,
        description: description || null,
        unit: usageUnit || unit || 'kg',
        usageUnit: usageUnit || unit || 'kg',
        purchaseUnit: purchaseUnit || usageUnit || unit || 'kg',
        defaultConversion: defaultConversion || null,
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        sku: sku || null,
        barcode: barcode || null,
        costPrice: costPrice || null,
        minStockLevel: minStockLevel || null,
        maxStockLevel: maxStockLevel || null,
        isSoldDirectly: isSoldDirectly || false,
        isTransformed: isTransformed !== false,
        accountId: session.user.accountId,
        storeId: userWithStore.selectedStoreId,
      },
      include: {
        category: true,
        supplier: true,
        store: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
