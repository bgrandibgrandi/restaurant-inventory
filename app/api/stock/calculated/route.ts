import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateStockByStore } from '@/lib/stock-calculator';

// Get calculated stock levels based on movements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId') || undefined;
    const categoryId = searchParams.get('categoryId');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';

    let stockLevels = await calculateStockByStore(session.user.accountId, storeId);

    // Filter by category if specified
    if (categoryId) {
      stockLevels = stockLevels.filter((s) => s.categoryId === categoryId);
    }

    // Filter to low stock only if specified
    if (lowStockOnly) {
      stockLevels = stockLevels.filter((s) => s.isLowStock);
    }

    return NextResponse.json(stockLevels);
  } catch (error) {
    console.error('Error calculating stock levels:', error);
    return NextResponse.json(
      { error: 'Failed to calculate stock levels' },
      { status: 500 }
    );
  }
}
