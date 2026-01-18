import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateStockForItem } from '@/lib/stock-calculator';

// POST - Approve a count and create adjustment movements for discrepancies
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { adjustmentNotes } = body;

    // Get the count with all entries
    const stockCount = await prisma.stockCount.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        entries: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!stockCount) {
      return NextResponse.json({ error: 'Count not found' }, { status: 404 });
    }

    if (stockCount.status !== 'completed') {
      return NextResponse.json(
        { error: 'Count must be completed before approval' },
        { status: 400 }
      );
    }

    if (stockCount.status === 'approved') {
      return NextResponse.json(
        { error: 'Count has already been approved' },
        { status: 400 }
      );
    }

    const adjustments: any[] = [];
    let totalExpectedValue = 0;
    let totalActualValue = 0;
    let totalDiscrepancyValue = 0;

    // Process each entry and calculate discrepancies
    for (const entry of stockCount.entries) {
      // Get expected stock from movements
      const expectedQuantity = await calculateStockForItem(
        session.user.accountId,
        entry.itemId,
        stockCount.storeId
      );

      const actualQuantity = entry.quantity;
      const discrepancy = actualQuantity - expectedQuantity;
      const costPrice = entry.unitCost || entry.item.costPrice || 0;

      // Update entry with expected and discrepancy values
      await prisma.stockEntry.update({
        where: { id: entry.id },
        data: {
          expectedQuantity,
          discrepancy,
        },
      });

      // Track values
      totalExpectedValue += expectedQuantity * costPrice;
      totalActualValue += actualQuantity * costPrice;
      totalDiscrepancyValue += discrepancy * costPrice;

      // Create adjustment movement if there's a discrepancy
      if (Math.abs(discrepancy) > 0.001) {
        const movement = await prisma.stockMovement.create({
          data: {
            itemId: entry.itemId,
            storeId: stockCount.storeId,
            quantity: discrepancy, // Positive if actual > expected, negative if less
            type: 'ADJUSTMENT',
            reason: discrepancy > 0 ? 'Count adjustment (surplus)' : 'Count adjustment (shortage)',
            notes: adjustmentNotes || `From count: ${stockCount.name || stockCount.id}`,
            referenceId: stockCount.id,
            referenceType: 'count',
            costPrice,
            createdBy: session.user.id,
            accountId: session.user.accountId,
          },
          include: {
            item: { select: { id: true, name: true, unit: true } },
          },
        });

        adjustments.push({
          ...movement,
          expectedQuantity,
          actualQuantity,
          discrepancy,
        });
      }
    }

    // Update the stock count with approval info and discrepancy values
    const approvedCount = await prisma.stockCount.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: session.user.id,
        adjustmentNotes,
        expectedValue: totalExpectedValue,
        discrepancyValue: totalDiscrepancyValue,
      },
      include: {
        store: true,
        user: { select: { id: true, name: true, email: true } },
        entries: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Create a notification if there were significant discrepancies
    if (adjustments.length > 0) {
      const discrepancyCount = adjustments.length;
      const shortages = adjustments.filter(a => a.discrepancy < 0).length;
      const surpluses = adjustments.filter(a => a.discrepancy > 0).length;

      await prisma.notification.create({
        data: {
          type: 'DISCREPANCY',
          title: 'Stock Count Approved',
          message: `Count "${stockCount.name || 'Stock Count'}" approved with ${discrepancyCount} adjustment(s): ${shortages} shortage(s), ${surpluses} surplus(es). Total discrepancy: ${totalDiscrepancyValue.toFixed(2)} EUR`,
          storeId: stockCount.storeId,
          linkUrl: `/count/${stockCount.id}`,
          accountId: session.user.accountId,
        },
      });
    }

    return NextResponse.json({
      stockCount: approvedCount,
      adjustments,
      summary: {
        totalEntries: stockCount.entries.length,
        adjustmentsCreated: adjustments.length,
        totalExpectedValue,
        totalActualValue,
        totalDiscrepancyValue,
      },
    });
  } catch (error) {
    console.error('Error approving count:', error);
    return NextResponse.json(
      { error: 'Failed to approve count' },
      { status: 500 }
    );
  }
}
