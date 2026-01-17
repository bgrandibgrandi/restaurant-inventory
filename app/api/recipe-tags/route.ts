import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Preset colors for tags
const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
];

// Get all recipe tags
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tags = await prisma.recipeTag.findMany({
      where: {
        accountId: session.user.accountId,
      },
      include: {
        _count: {
          select: { recipes: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      tags.map((tag) => ({
        ...tag,
        recipeCount: tag._count.recipes,
      }))
    );
  } catch (error) {
    console.error('Error fetching recipe tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe tags' },
      { status: 500 }
    );
  }
}

// Create a new recipe tag
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Check if tag already exists
    const existingTag = await prisma.recipeTag.findFirst({
      where: {
        name: name.trim(),
        accountId: session.user.accountId,
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    // Get a random color if not provided
    const tagColor = color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

    const tag = await prisma.recipeTag.create({
      data: {
        name: name.trim(),
        color: tagColor,
        accountId: session.user.accountId,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe tag:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe tag' },
      { status: 500 }
    );
  }
}
