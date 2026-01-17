import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get all Square catalog items for the account
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const unmappedOnly = searchParams.get('unmappedOnly') === 'true';

    const whereClause: any = {
      accountId: session.user.accountId,
      isActive: true,
    };

    // Filter by store's Square connection if provided
    if (storeId) {
      const connection = await prisma.squareConnection.findUnique({
        where: { storeId },
      });
      if (connection) {
        whereClause.squareConnectionId = connection.id;
      }
    }

    const catalogItems = await prisma.squareCatalogItem.findMany({
      where: whereClause,
      include: {
        squareConnection: {
          include: {
            store: {
              select: { id: true, name: true },
            },
          },
        },
        variations: true,
        mappings: {
          include: {
            recipe: {
              select: { id: true, name: true },
            },
            variation: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Filter to unmapped items if requested
    let result = catalogItems;
    if (unmappedOnly) {
      result = catalogItems.filter((item) => {
        // Item is unmapped if it has no mappings at all
        if (item.mappings.length === 0) return true;
        // Or if it has variations without mappings
        const mappedVariationIds = item.mappings
          .filter((m) => m.variationId)
          .map((m) => m.variationId);
        const unmappedVariations = item.variations.filter(
          (v) => !mappedVariationIds.includes(v.id)
        );
        return unmappedVariations.length > 0;
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching Square catalog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}
