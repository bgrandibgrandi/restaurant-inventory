import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const level = searchParams.get('level');
    const flat = searchParams.get('flat') === 'true';
    const tree = searchParams.get('tree') === 'true';

    const accountId = session.user.accountId;

    // Build where clause
    const where: Record<string, unknown> = {
      accountId,
      isActive: true,
    };

    // Filter by parent (use 'root' for root categories)
    if (parentId === 'root') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }

    // Filter by level
    if (level !== null && level !== undefined && level !== '') {
      where.level = parseInt(level, 10);
    }

    // Return tree structure with nested children
    if (tree) {
      const rootCategories = await prisma.category.findMany({
        where: {
          accountId,
          isActive: true,
          parentId: null,
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
        include: {
          children: {
            where: { isActive: true },
            orderBy: [
              { sortOrder: 'asc' },
              { name: 'asc' },
            ],
            include: {
              children: {
                where: { isActive: true },
                orderBy: [
                  { sortOrder: 'asc' },
                  { name: 'asc' },
                ],
              },
            },
          },
        },
      });
      return NextResponse.json(rootCategories);
    }

    // Return flat list or list with parent
    if (flat) {
      const categories = await prisma.category.findMany({
        where,
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          icon: true,
          level: true,
          parentId: true,
          sortOrder: true,
        },
      });
      return NextResponse.json(categories);
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { parent: true },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        parentId: parentId || null,
        accountId: session.user.accountId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
