import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateInventoryValue } from '@/lib/stock-calculator';
import { prisma } from '@/lib/db';

// Get total inventory value
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId') || undefined;

    const { totalValue, totalItems, byStore } = await calculateInventoryValue(
      session.user.accountId,
      storeId
    );

    // Get store names
    const storeIds = Object.keys(byStore);
    const stores = await prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true },
    });
    const storeMap = new Map(stores.map((s) => [s.id, s.name]));

    const byStoreWithNames = Object.entries(byStore).map(([id, value]) => ({
      storeId: id,
      storeName: storeMap.get(id) || 'Unknown',
      value,
    }));

    // Get account currency
    const account = await prisma.account.findUnique({
      where: { id: session.user.accountId },
      select: { baseCurrency: true },
    });

    return NextResponse.json({
      totalValue,
      totalItems,
      currency: account?.baseCurrency || 'EUR',
      byStore: byStoreWithNames.sort((a, b) => b.value - a.value),
    });
  } catch (error) {
    console.error('Error calculating inventory value:', error);
    return NextResponse.json(
      { error: 'Failed to calculate inventory value' },
      { status: 500 }
    );
  }
}
