import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const category = await prisma.category.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        parent: true,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify category belongs to user's account
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, parentId } = body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name || undefined,
        parentId: parentId !== undefined ? parentId : undefined,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify category belongs to user's account
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if category has items
    const itemCount = await prisma.item.count({
      where: { categoryId: id },
    });

    if (itemCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${itemCount} items. Please reassign or delete items first.` },
        { status: 400 }
      );
    }

    // Check if category has subcategories
    const subcategoryCount = await prisma.category.count({
      where: { parentId: id },
    });

    if (subcategoryCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${subcategoryCount} subcategories. Please delete subcategories first.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
