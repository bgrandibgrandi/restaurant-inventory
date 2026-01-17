import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Handle Square OAuth callback
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Square OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=Missing+authorization+code', request.url)
      );
    }

    // Decode state
    let stateData: { storeId: string; accountId: string; nonce: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=Invalid+state+parameter', request.url)
      );
    }

    const { storeId, accountId } = stateData;

    // Determine if using sandbox based on application ID
    const squareAppId = process.env.SQUARE_APPLICATION_ID || '';
    const isSandbox = squareAppId.startsWith('sandbox-');
    const baseUrl = isSandbox
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';

    // Exchange code for access token
    const tokenResponse = await fetch(`${baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        client_id: process.env.SQUARE_APPLICATION_ID,
        client_secret: process.env.SQUARE_APPLICATION_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/square/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Square token exchange error:', errorData);
      const errorMessage = errorData.message || errorData.error || 'Failed to exchange authorization code';
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const {
      access_token,
      refresh_token,
      expires_at,
      merchant_id,
    } = tokenData;

    // Get merchant info to get location(s)
    const merchantResponse = await fetch(`${baseUrl}/v2/merchants/me`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Square-Version': '2024-01-18',
      },
    });

    let merchantName = null;
    if (merchantResponse.ok) {
      const merchantData = await merchantResponse.json();
      merchantName = merchantData.merchant?.business_name;
    }

    // Get locations
    const locationsResponse = await fetch(`${baseUrl}/v2/locations`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Square-Version': '2024-01-18',
      },
    });

    let squareLocationId = null;
    if (locationsResponse.ok) {
      const locationsData = await locationsResponse.json();
      // Use first active location by default
      const activeLocation = locationsData.locations?.find((l: any) => l.status === 'ACTIVE');
      squareLocationId = activeLocation?.id;
    }

    // Store the connection
    // Note: In production, you should encrypt the access_token and refresh_token
    await prisma.squareConnection.create({
      data: {
        storeId,
        accountId,
        name: merchantName,
        merchantId: merchant_id,
        accessToken: access_token, // TODO: Encrypt this
        refreshToken: refresh_token, // TODO: Encrypt this
        tokenExpiresAt: expires_at ? new Date(expires_at) : null,
        squareLocationId,
        syncEnabled: true,
      },
    });

    return NextResponse.redirect(
      new URL('/settings/integrations?success=Square+connected+successfully', request.url)
    );
  } catch (error) {
    console.error('Error in Square callback:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=An+unexpected+error+occurred', request.url)
    );
  }
}
