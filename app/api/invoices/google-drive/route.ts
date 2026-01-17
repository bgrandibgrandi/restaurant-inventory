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

    if (!fileId || !storeId) {
      return NextResponse.json(
        { error: 'File ID and store ID are required' },
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

    let driveResponse: Response;
    let fileBuffer: ArrayBuffer;

    // Try with access token if provided, otherwise try public download
    if (accessToken) {
      // Authenticated download via Drive API
      driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } else {
      // Public download - file must be shared with "Anyone with the link"
      // Try the direct download URL first
      driveResponse = await fetch(
        `https://drive.google.com/uc?export=download&id=${fileId}`,
        {
          redirect: 'follow',
        }
      );

      // If we get an HTML page (virus scan warning for large files), try alternate method
      const contentType = driveResponse.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        // Try the alternate export URL
        driveResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
          {
            redirect: 'follow',
          }
        );
      }
    }

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('Google Drive error:', errorText);

      // Check if it's a permissions error
      if (driveResponse.status === 403 || driveResponse.status === 404) {
        return NextResponse.json(
          { error: 'Cannot access file. Make sure the file is shared with "Anyone with the link".' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to download file from Google Drive' },
        { status: 500 }
      );
    }

    fileBuffer = await driveResponse.arrayBuffer();

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
