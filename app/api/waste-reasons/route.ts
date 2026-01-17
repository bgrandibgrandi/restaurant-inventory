import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_WASTE_REASONS = [
  { name: 'Expired', description: 'Product passed expiration date' },
  { name: 'Damaged', description: 'Product damaged in storage or handling' },
  { name: 'Spillage', description: 'Accidental spill or breakage' },
  { name: 'Preparation Loss', description: 'Normal loss during food preparation (trimmings, peels, etc.)' },
  { name: 'Staff Meal', description: 'Used for staff meals' },
  { name: 'Customer Complaint', description: 'Returned or remade due to customer complaint' },
  { name: 'Quality Issue', description: 'Did not meet quality standards' },
  { name: 'Other', description: 'Other reason (specify in notes)' },
];

// GET - List all waste reasons for the account
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reasons = await prisma.wasteReason.findMany({
      where: {
        accountId: session.user.accountId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    // If no reasons exist, create defaults
    if (reasons.length === 0) {
      const createdReasons = [];
      for (const reason of DEFAULT_WASTE_REASONS) {
        const created = await prisma.wasteReason.create({
          data: {
            name: reason.name,
            description: reason.description,
            accountId: session.user.accountId,
          },
        });
        createdReasons.push(created);
      }
      return NextResponse.json(createdReasons);
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

// POST - Create a new waste reason
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await prisma.wasteReason.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
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
        description,
        accountId: session.user.accountId,
      },
    });

    return NextResponse.json(reason);
  } catch (error) {
    console.error('Error creating waste reason:', error);
    return NextResponse.json(
      { error: 'Failed to create waste reason' },
      { status: 500 }
    );
  }
}
