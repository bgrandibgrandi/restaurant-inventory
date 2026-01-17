import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

// Generate OAuth authorization URL for Square
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Verify store belongs to account
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        accountId: session.user.accountId,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Check if already connected
    const existingConnection = await prisma.squareConnection.findUnique({
      where: { storeId },
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Store already has a Square connection. Disconnect first to reconnect.' },
        { status: 400 }
      );
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in a temporary way (we'll use the state itself to encode store info)
    // Format: storeId:accountId:randomState
    const statePayload = Buffer.from(
      JSON.stringify({
        storeId,
        accountId: session.user.accountId,
        nonce: state,
      })
    ).toString('base64url');

    // Build Square OAuth URL
    const squareAppId = process.env.SQUARE_APPLICATION_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/square/callback`;

    if (!squareAppId) {
      return NextResponse.json(
        { error: 'Square Application ID not configured' },
        { status: 500 }
      );
    }

    const scopes = [
      'MERCHANT_PROFILE_READ',
      'ITEMS_READ',
      'ITEMS_WRITE',
      'ORDERS_READ',
      'INVENTORY_READ',
    ].join('+');

    const authUrl = `https://connect.squareup.com/oauth2/authorize?client_id=${squareAppId}&response_type=code&scope=${scopes}&state=${statePayload}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating Square auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
