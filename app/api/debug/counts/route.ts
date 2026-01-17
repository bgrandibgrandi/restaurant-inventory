import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Debug endpoint to check counts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = session.user.accountId;

    const [catalogItems, items, recipes] = await Promise.all([
      prisma.squareCatalogItem.count({ where: { accountId } }),
      prisma.item.count({ where: { accountId } }),
      prisma.recipe.count({ where: { accountId } }),
    ]);

    // Get first 5 catalog items to see their IDs
    const sampleCatalogItems = await prisma.squareCatalogItem.findMany({
      where: { accountId },
      take: 5,
      select: { id: true, squareId: true, name: true },
    });

    return NextResponse.json({
      catalogItems,
      items,
      recipes,
      sampleCatalogItems,
      accountId,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
