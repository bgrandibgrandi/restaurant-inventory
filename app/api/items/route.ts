import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Get all items (master catalog)
export async function GET() {
  try {
    const items = await prisma.item.findMany({
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// Create new item in master catalog
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, unit, categoryId, accountId } = body;

    if (!name || !unit) {
      return NextResponse.json(
        { error: 'Name and unit are required' },
        { status: 400 }
      );
    }

    const item = await prisma.item.create({
      data: {
        name,
        description: description || null,
        unit,
        categoryId: categoryId || null,
        accountId: accountId || 'default-account',
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
