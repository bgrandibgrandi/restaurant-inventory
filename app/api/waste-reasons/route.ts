import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Default waste reasons to seed for new accounts
const DEFAULT_WASTE_REASONS = [
  { name: 'Expired', description: 'Product passed expiration date' },
  { name: 'Damaged', description: 'Physical damage to product' },
  { name: 'Spillage', description: 'Accidental spill or breakage' },
  { name: 'Preparation Loss', description: 'Normal loss during food preparation' },
  { name: 'Quality Issue', description: 'Product quality not acceptable' },
  { name: 'Other', description: 'Other reason (specify in notes)' },
];

// Get all waste reasons
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let reasons = await prisma.wasteReason.findMany({
      where: {
        accountId: session.user.accountId,
      },
      orderBy: { name: 'asc' },
    });

    // If no reasons exist, create defaults
    if (reasons.length === 0) {
      await prisma.wasteReason.createMany({
        data: DEFAULT_WASTE_REASONS.map((r) => ({
          ...r,
          accountId: session.user.accountId,
        })),
      });

      reasons = await prisma.wasteReason.findMany({
        where: {
          accountId: session.user.accountId,
        },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json(reasons);
  } catch (error) {
    console.error('Error fetching waste reasons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waste reasons' },
      { status: 500 }
    );
  }
}

// Create a new waste reason
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await prisma.wasteReason.findFirst({
      where: {
        name,
        accountId: session.user.accountId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A waste reason with this name already exists' },
        { status: 400 }
      );
    }

    const reason = await prisma.wasteReason.create({
      data: {
        name,
        description: description || null,
        accountId: session.user.accountId,
      },
    });

    return NextResponse.json(reason, { status: 201 });
  } catch (error) {
    console.error('Error creating waste reason:', error);
    return NextResponse.json(
      { error: 'Failed to create waste reason' },
      { status: 500 }
    );
  }
}
