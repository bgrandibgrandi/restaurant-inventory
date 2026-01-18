import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Copy a supplier to another store
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { supplierId, targetStoreId } = body;

    if (!supplierId || !targetStoreId) {
      return NextResponse.json(
        { error: 'Supplier ID and target store ID are required' },
        { status: 400 }
      );
    }

    // Verify target store belongs to the account
    const targetStore = await prisma.store.findFirst({
      where: {
        id: targetStoreId,
        accountId: session.user.accountId,
      },
    });

    if (!targetStore) {
      return NextResponse.json(
        { error: 'Target store not found' },
        { status: 404 }
      );
    }

    // Get the source supplier
    const sourceSupplier = await prisma.supplier.findFirst({
      where: {
        id: supplierId,
        accountId: session.user.accountId,
      },
    });

    if (!sourceSupplier) {
      return NextResponse.json(
        { error: 'Source supplier not found' },
        { status: 404 }
      );
    }

    // Check if supplier already exists in target store (by name)
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        accountId: session.user.accountId,
        storeId: targetStoreId,
        name: {
          equals: sourceSupplier.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingSupplier) {
      return NextResponse.json(
        { error: 'A supplier with this name already exists in the target store' },
        { status: 409 }
      );
    }

    // Create the copy in the target store
    const copiedSupplier = await prisma.supplier.create({
      data: {
        name: sourceSupplier.name,
        email: sourceSupplier.email,
        phone: sourceSupplier.phone,
        address: sourceSupplier.address,
        notes: sourceSupplier.notes,
        accountId: session.user.accountId,
        storeId: targetStoreId,
        sourceSupplierId: sourceSupplier.id, // Track the source
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

    return NextResponse.json({
      ...copiedSupplier,
      copiedFrom: sourceSupplier.name,
      sourceStoreId: sourceSupplier.storeId,
    }, { status: 201 });
  } catch (error) {
    console.error('Error copying supplier:', error);
    return NextResponse.json(
      { error: 'Failed to copy supplier' },
      { status: 500 }
    );
  }
}
