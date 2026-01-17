import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Sync catalog from Square
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Get connection with token
    const connection = await prisma.squareConnection.findFirst({
      where: {
        id: connectionId,
        accountId: session.user.accountId,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Determine if using sandbox based on application ID
    const squareAppId = process.env.SQUARE_APPLICATION_ID || '';
    const isSandbox = squareAppId.startsWith('sandbox-');
    const baseUrl = isSandbox
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';

    // Fetch catalog from Square
    const catalogItems: any[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL(`${baseUrl}/v2/catalog/list`);
      url.searchParams.set('types', 'ITEM');
      if (cursor) url.searchParams.set('cursor', cursor);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Square-Version': '2024-01-18',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Square catalog error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch catalog from Square' },
          { status: 500 }
        );
      }

      const data = await response.json();
      if (data.objects) {
        catalogItems.push(...data.objects);
      }
      cursor = data.cursor;
    } while (cursor);

    // Upsert catalog items
    let created = 0;
    let updated = 0;

    for (const item of catalogItems) {
      if (item.type !== 'ITEM' || !item.item_data) continue;

      const existing = await prisma.squareCatalogItem.findUnique({
        where: {
          squareId_squareConnectionId: {
            squareId: item.id,
            squareConnectionId: connection.id,
          },
        },
      });

      const catalogData = {
        squareId: item.id,
        squareConnectionId: connection.id,
        accountId: session.user.accountId,
        name: item.item_data.name,
        description: item.item_data.description || null,
        categoryName: null, // Would need to fetch category separately
        isActive: !item.is_deleted,
        lastSyncedAt: new Date(),
      };

      if (existing) {
        await prisma.squareCatalogItem.update({
          where: { id: existing.id },
          data: catalogData,
        });
        updated++;
      } else {
        await prisma.squareCatalogItem.create({
          data: catalogData,
        });
        created++;
      }

      // Handle variations
      const variations = item.item_data.variations || [];
      for (const variation of variations) {
        if (!variation.item_variation_data) continue;

        const catalogItem = await prisma.squareCatalogItem.findUnique({
          where: {
            squareId_squareConnectionId: {
              squareId: item.id,
              squareConnectionId: connection.id,
            },
          },
        });

        if (!catalogItem) continue;

        await prisma.squareItemVariation.upsert({
          where: {
            squareId_catalogItemId: {
              squareId: variation.id,
              catalogItemId: catalogItem.id,
            },
          },
          create: {
            squareId: variation.id,
            catalogItemId: catalogItem.id,
            name: variation.item_variation_data.name || 'Regular',
            priceMoney: variation.item_variation_data.price_money?.amount
              ? variation.item_variation_data.price_money.amount / 100
              : null,
            sku: variation.item_variation_data.sku || null,
          },
          update: {
            name: variation.item_variation_data.name || 'Regular',
            priceMoney: variation.item_variation_data.price_money?.amount
              ? variation.item_variation_data.price_money.amount / 100
              : null,
            sku: variation.item_variation_data.sku || null,
          },
        });
      }
    }

    // Update last sync time
    await prisma.squareConnection.update({
      where: { id: connection.id },
      data: { lastCatalogSync: new Date() },
    });

    return NextResponse.json({
      success: true,
      totalItems: catalogItems.length,
      created,
      updated,
    });
  } catch (error) {
    console.error('Error syncing Square catalog:', error);
    return NextResponse.json(
      { error: 'Failed to sync catalog' },
      { status: 500 }
    );
  }
}
