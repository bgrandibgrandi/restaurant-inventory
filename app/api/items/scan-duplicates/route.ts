import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scanAllDuplicates } from '@/lib/services/deduplication';
import { prisma } from '@/lib/db';

// POST - Trigger a full duplicate scan for the account
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await scanAllDuplicates(session.user.accountId);

    // Create notification if duplicates were found
    if (result.duplicatesFound > 0) {
      await prisma.notification.create({
        data: {
          type: 'DUPLICATE_SCAN',
          title: 'Escaneo de duplicados completado',
          message: `Se encontraron ${result.duplicatesFound} posible(s) duplicado(s) entre ${result.scanned} items.`,
          linkUrl: '/items?filter=review',
          accountId: session.user.accountId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      message:
        result.duplicatesFound > 0
          ? `Encontrados ${result.duplicatesFound} posibles duplicados`
          : 'No se encontraron duplicados',
    });
  } catch (error) {
    console.error('Error scanning duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to scan duplicates' },
      { status: 500 }
    );
  }
}

// GET - Get scan status / summary
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [pendingCount, totalItems, itemsNeedingReview] = await Promise.all([
      prisma.duplicateCandidate.count({
        where: {
          accountId: session.user.accountId,
          status: 'pending',
        },
      }),
      prisma.item.count({
        where: { accountId: session.user.accountId },
      }),
      prisma.item.count({
        where: {
          accountId: session.user.accountId,
          needsReview: true,
        },
      }),
    ]);

    return NextResponse.json({
      pendingDuplicates: pendingCount,
      totalItems,
      itemsNeedingReview,
    });
  } catch (error) {
    console.error('Error getting scan status:', error);
    return NextResponse.json(
      { error: 'Failed to get scan status' },
      { status: 500 }
    );
  }
}
