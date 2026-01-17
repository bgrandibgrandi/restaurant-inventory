import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get all Square connections for the account
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await prisma.squareConnection.findMany({
      where: { accountId: session.user.accountId },
      include: {
        store: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            catalogItems: true,
            orderSyncs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return connections without sensitive tokens
    const safeConnections = connections.map((conn) => ({
      id: conn.id,
      storeId: conn.storeId,
      store: conn.store,
      name: conn.name,
      merchantId: conn.merchantId,
      squareLocationId: conn.squareLocationId,
      lastCatalogSync: conn.lastCatalogSync,
      lastOrderSync: conn.lastOrderSync,
      syncEnabled: conn.syncEnabled,
      catalogItemsCount: conn._count.catalogItems,
      orderSyncsCount: conn._count.orderSyncs,
      createdAt: conn.createdAt,
    }));

    return NextResponse.json(safeConnections);
  } catch (error) {
    console.error('Error fetching Square connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

// Disconnect a Square connection
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('id');

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Verify connection belongs to account
    const connection = await prisma.squareConnection.findFirst({
      where: {
        id: connectionId,
        accountId: session.user.accountId,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Revoke the token with Square (best practice)
    // Determine if using sandbox based on application ID
    const squareAppId = process.env.SQUARE_APPLICATION_ID || '';
    const isSandbox = squareAppId.startsWith('sandbox-');
    const baseUrl = isSandbox
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';

    try {
      await fetch(`${baseUrl}/oauth2/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
        body: JSON.stringify({
          client_id: process.env.SQUARE_APPLICATION_ID,
          access_token: connection.accessToken,
        }),
      });
    } catch (revokeError) {
      console.warn('Failed to revoke Square token:', revokeError);
      // Continue with deletion even if revoke fails
    }

    // Delete the connection (cascades to catalog items and order syncs)
    await prisma.squareConnection.delete({
      where: { id: connectionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Square:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
