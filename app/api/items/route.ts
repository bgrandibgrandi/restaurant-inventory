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
    const { name, description, unit, categoryId, supplierId } = body;

    if (!name || !unit) {
      return NextResponse.json(
        { error: 'Name and unit are required' },
        { status: 400 }
      );
    }

    const item = await prisma.item.create({
      data: {
        name,
        description: description || null,
        unit,
        categoryId: categoryId || null,
        supplierId: supplierId || null,
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
