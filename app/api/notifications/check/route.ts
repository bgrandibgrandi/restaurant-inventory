import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Check for low stock and create notifications
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = session.user.accountId;
    let notificationsCreated = 0;

    // Get items with min stock levels
    const itemsWithMinStock = await prisma.item.findMany({
      where: {
        accountId,
        minStockLevel: { not: null },
      },
      select: {
        id: true,
        name: true,
        unit: true,
        minStockLevel: true,
      },
    });

    // Get current stock levels from latest stock entries
    for (const item of itemsWithMinStock) {
      const latestEntry = await prisma.stockEntry.findFirst({
        where: { itemId: item.id, accountId },
        orderBy: { createdAt: 'desc' },
      });

      const currentStock = latestEntry?.quantity || 0;

      if (currentStock < (item.minStockLevel || 0)) {
        // Check if we already have an unread notification for this
        const existing = await prisma.notification.findFirst({
          where: {
            accountId,
            type: 'LOW_STOCK',
            itemId: item.id,
            isRead: false,
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              type: 'LOW_STOCK',
              title: 'Low Stock Alert',
              message: `${item.name} is low: ${currentStock} ${item.unit} (min: ${item.minStockLevel} ${item.unit})`,
              itemId: item.id,
              linkUrl: `/items/${item.id}`,
              accountId,
            },
          });
          notificationsCreated++;
        }
      }
    }

    return NextResponse.json({
      checked: itemsWithMinStock.length,
      notificationsCreated,
    });
  } catch (error) {
    console.error('Error checking notifications:', error);
    return NextResponse.json(
      { error: 'Failed to check notifications' },
      { status: 500 }
    );
  }
}
