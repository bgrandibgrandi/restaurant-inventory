import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Import invoice from Google Drive
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, fileName, mimeType, accessToken, storeId } = body;

    if (!fileId || !accessToken || !storeId) {
      return NextResponse.json(
        { error: 'File ID, access token, and store ID are required' },
        { status: 400 }
      );
    }

    // Validate store
    const store = await prisma.store.findFirst({
      where: { id: storeId, accountId: session.user.accountId },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Download file from Google Drive
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!driveResponse.ok) {
      console.error('Google Drive error:', await driveResponse.text());
      return NextResponse.json(
        { error: 'Failed to download file from Google Drive' },
        { status: 500 }
      );
    }

    const fileBuffer = await driveResponse.arrayBuffer();

    // Determine file extension
    let extension = '.pdf';
    if (mimeType === 'image/jpeg') extension = '.jpg';
    else if (mimeType === 'image/png') extension = '.png';
    else if (mimeType === 'image/webp') extension = '.webp';

    // Convert to base64 for storage
    const base64 = Buffer.from(fileBuffer).toString('base64');
    const fileUrl = `data:${mimeType};base64,${base64}`;

    // Create invoice record (same as regular upload)
    const invoice = await prisma.invoice.create({
      data: {
        fileName: fileName || `google-drive-import${extension}`,
        fileUrl,
        storeId,
        userId: session.user.id,
        accountId: session.user.accountId,
        status: 'pending',
        notes: `Imported from Google Drive`,
      },
      include: {
        store: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error importing from Google Drive:', error);
    return NextResponse.json(
      { error: 'Failed to import invoice' },
      { status: 500 }
    );
  }
}
