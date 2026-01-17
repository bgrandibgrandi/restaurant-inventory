import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStockAlerts } from '@/lib/stock-calculator';

// Get stock alerts (low stock, over stock)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId') || undefined;
    const alertType = searchParams.get('alertType'); // LOW_STOCK, OVER_STOCK

    let alerts = await getStockAlerts(session.user.accountId, storeId);

    // Filter by alert type if specified
    if (alertType) {
      alerts = alerts.filter((a) => a.alertType === alertType);
    }

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
        lowStock: alerts.filter((a) => a.alertType === 'LOW_STOCK').length,
        overStock: alerts.filter((a) => a.alertType === 'OVER_STOCK').length,
      },
    });
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock alerts' },
      { status: 500 }
    );
  }
}
