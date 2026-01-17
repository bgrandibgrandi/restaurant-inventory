import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Merge multiple suppliers into one target supplier
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetSupplierId, sourceSuppliersIds } = body;

    if (!targetSupplierId) {
      return NextResponse.json(
        { error: 'Target supplier ID is required' },
        { status: 400 }
      );
    }

    if (!sourceSuppliersIds || !Array.isArray(sourceSuppliersIds) || sourceSuppliersIds.length === 0) {
      return NextResponse.json(
        { error: 'Source supplier IDs are required' },
        { status: 400 }
      );
    }

    // Ensure target is not in source list
    if (sourceSuppliersIds.includes(targetSupplierId)) {
      return NextResponse.json(
        { error: 'Target supplier cannot be in the source list' },
        { status: 400 }
      );
    }

    // Verify target supplier exists and belongs to account
    const targetSupplier = await prisma.supplier.findFirst({
      where: {
        id: targetSupplierId,
        accountId: session.user.accountId,
      },
    });

    if (!targetSupplier) {
      return NextResponse.json(
        { error: 'Target supplier not found' },
        { status: 404 }
      );
    }

    // Verify all source suppliers exist and belong to account
    const sourceSuppliers = await prisma.supplier.findMany({
      where: {
        id: { in: sourceSuppliersIds },
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

    if (sourceSuppliers.length !== sourceSuppliersIds.length) {
      return NextResponse.json(
        { error: 'One or more source suppliers not found' },
        { status: 404 }
      );
    }

    // Perform the merge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let totalInvoicesMerged = 0;
      let totalItemsMerged = 0;

      // Update all invoices from source suppliers to target supplier
      const invoicesResult = await tx.invoice.updateMany({
        where: {
          supplierId: { in: sourceSuppliersIds },
        },
        data: {
          supplierId: targetSupplierId,
        },
      });
      totalInvoicesMerged = invoicesResult.count;

      // Update all items from source suppliers to target supplier
      const itemsResult = await tx.item.updateMany({
        where: {
          supplierId: { in: sourceSuppliersIds },
        },
        data: {
          supplierId: targetSupplierId,
        },
      });
      totalItemsMerged = itemsResult.count;

      // Delete the source suppliers
      await tx.supplier.deleteMany({
        where: {
          id: { in: sourceSuppliersIds },
        },
      });

      return {
        invoicesMerged: totalInvoicesMerged,
        itemsMerged: totalItemsMerged,
        suppliersDeleted: sourceSuppliersIds.length,
      };
    });

    // Get the updated target supplier with counts
    const updatedTargetSupplier = await prisma.supplier.findUnique({
      where: { id: targetSupplierId },
      include: {
        _count: {
          select: {
            invoices: true,
            items: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Merged ${result.suppliersDeleted} supplier(s) into "${targetSupplier.name}"`,
      ...result,
      targetSupplier: updatedTargetSupplier,
    });
  } catch (error) {
    console.error('Error merging suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to merge suppliers' },
      { status: 500 }
    );
  }
}
