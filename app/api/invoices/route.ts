import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get all invoices for the account
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const storeId = searchParams.get('storeId');

    const invoices = await prisma.invoice.findMany({
      where: {
        accountId: session.user.accountId,
        ...(status ? { status } : {}),
        ...(storeId ? { storeId } : {}),
      },
      include: {
        store: true,
        supplier: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// Create a new invoice (upload)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const storeId = formData.get('storeId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store is required' },
        { status: 400 }
      );
    }

    // Verify store belongs to account
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        accountId: session.user.accountId,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Convert file to base64 for storage/processing
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type;

    // Create invoice record
    const invoice = await prisma.invoice.create({
      data: {
        fileName: file.name,
        fileUrl: `data:${mimeType};base64,${base64}`,
        storeId,
        userId: session.user.id,
        accountId: session.user.accountId,
        status: 'pending',
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
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
