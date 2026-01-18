import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findPotentialMatches } from '@/lib/services/deduplication';

// POST - Check if item data matches existing items
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, barcode, supplierSku, supplierId, categoryId, excludeItemId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const matches = await findPotentialMatches({
      name,
      barcode,
      supplierSku,
      supplierId,
      categoryId,
      accountId: session.user.accountId,
      excludeItemId,
    });

    return NextResponse.json({
      matches,
      hasPotentialDuplicates: matches.length > 0,
      highestConfidence: matches.length > 0 ? matches[0].confidence : 0,
    });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}
