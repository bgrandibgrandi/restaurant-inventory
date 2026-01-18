import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWithStore } from '@/lib/get-selected-store';

// Get all suppliers for the selected store
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's selected store
    const userWithStore = await getUserWithStore();

    const suppliers = await prisma.supplier.findMany({
      where: {
        accountId: session.user.accountId,
        // Filter by selected store if one is selected
        ...(userWithStore?.selectedStoreId && { storeId: userWithStore.selectedStoreId }),
      },
      include: {
        _count: {
          select: {
            invoices: true,
            items: true,
          },
        },
        store: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// Create a new supplier for the selected store
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
    const { name, email, phone, address, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    // Check for existing supplier with same name in the same store (case-insensitive)
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        accountId: session.user.accountId,
        storeId: userWithStore.selectedStoreId,
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existingSupplier) {
      return NextResponse.json(
        { error: 'A supplier with this name already exists in this store', existingSupplier },
        { status: 409 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        accountId: session.user.accountId,
        storeId: userWithStore.selectedStoreId,
      },
      include: {
        _count: {
          select: {
            invoices: true,
            items: true,
          },
        },
        store: true,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
