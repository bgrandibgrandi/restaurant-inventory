import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get a single supplier
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

    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        items: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            invoices: true,
            items: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

// Update a supplier
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
    const { name, email, phone, address, notes } = body;

    // Check if supplier exists and belongs to account
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // If name is changing, check for duplicates
    if (name && name.trim().toLowerCase() !== existingSupplier.name.toLowerCase()) {
      const duplicateSupplier = await prisma.supplier.findFirst({
        where: {
          accountId: session.user.accountId,
          name: {
            equals: name.trim(),
            mode: 'insensitive',
          },
          NOT: {
            id,
          },
        },
      });

      if (duplicateSupplier) {
        return NextResponse.json(
          { error: 'A supplier with this name already exists' },
          { status: 409 }
        );
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name?.trim() || undefined,
        email: email !== undefined ? (email?.trim() || null) : undefined,
        phone: phone !== undefined ? (phone?.trim() || null) : undefined,
        address: address !== undefined ? (address?.trim() || null) : undefined,
        notes: notes !== undefined ? (notes?.trim() || null) : undefined,
      },
      include: {
        _count: {
          select: {
            invoices: true,
            items: true,
          },
        },
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

// Delete a supplier
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

    // Check if supplier exists and belongs to account
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        _count: {
          select: {
            invoices: true,
            items: true,
          },
        },
      },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Warn if supplier has invoices or items
    if (existingSupplier._count.invoices > 0 || existingSupplier._count.items > 0) {
      // Unlink items and invoices from supplier before deleting
      await prisma.$transaction([
        prisma.item.updateMany({
          where: { supplierId: id },
          data: { supplierId: null },
        }),
        prisma.invoice.updateMany({
          where: { supplierId: id },
          data: { supplierId: null },
        }),
        prisma.supplier.delete({
          where: { id },
        }),
      ]);
    } else {
      await prisma.supplier.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
