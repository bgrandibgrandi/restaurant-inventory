import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get all stock counts for the account
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');

    const counts = await prisma.stockCount.findMany({
      where: {
        accountId: session.user.accountId,
        ...(storeId ? { storeId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        store: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { entries: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error fetching counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch counts' },
      { status: 500 }
    );
  }
}

// Start a new stock count session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storeId, name } = body;

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

    const stockCount = await prisma.stockCount.create({
      data: {
        name: name || `Count - ${new Date().toLocaleDateString()}`,
        storeId,
        userId: session.user.id,
        accountId: session.user.accountId,
        status: 'in_progress',
      },
      include: {
        store: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(stockCount, { status: 201 });
  } catch (error) {
    console.error('Error creating count:', error);
    return NextResponse.json(
      { error: 'Failed to create count' },
      { status: 500 }
    );
  }
}
