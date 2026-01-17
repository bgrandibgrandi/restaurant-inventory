import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Update a recipe tag
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
    const body = await request.json();
    const { name, color } = body;

    // Check if tag exists and belongs to account
    const existingTag = await prisma.recipeTag.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // Check if new name conflicts with existing tag
    if (name && name.trim() !== existingTag.name) {
      const conflictingTag = await prisma.recipeTag.findFirst({
        where: {
          name: name.trim(),
          accountId: session.user.accountId,
          NOT: { id },
        },
      });

      if (conflictingTag) {
        return NextResponse.json(
          { error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
    }

    const tag = await prisma.recipeTag.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error updating recipe tag:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe tag' },
      { status: 500 }
    );
  }
}

// Delete a recipe tag
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

    // Check if tag exists and belongs to account
    const existingTag = await prisma.recipeTag.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // Delete tag (cascade will remove assignments)
    await prisma.recipeTag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe tag' },
      { status: 500 }
    );
  }
}
