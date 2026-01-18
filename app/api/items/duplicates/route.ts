import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { dismissDuplicate } from '@/lib/services/deduplication';

// GET - List all pending duplicate candidates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const duplicates = await prisma.duplicateCandidate.findMany({
      where: {
        accountId: session.user.accountId,
        status,
      },
      include: {
        item: {
          include: {
            category: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
          },
        },
        matchedItem: {
          include: {
            category: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(duplicates);
  } catch (error) {
    console.error('Error fetching duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch duplicates' },
      { status: 500 }
    );
  }
}

// PUT - Dismiss a duplicate candidate (mark as not duplicate)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { duplicateId, action } = body;

    if (!duplicateId) {
      return NextResponse.json({ error: 'Duplicate ID is required' }, { status: 400 });
    }

    if (action === 'dismiss') {
      await dismissDuplicate(duplicateId, session.user.accountId, session.user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating duplicate:', error);
    return NextResponse.json(
      { error: 'Failed to update duplicate' },
      { status: 500 }
    );
  }
}
