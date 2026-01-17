import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Convert a recipe to an inventory item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the recipe with all its data
    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        category: true,
        ingredients: true,
        usedIn: true,
        squareItemMappings: true,
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Check if recipe is used as sub-recipe
    if (recipe.usedIn.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot convert recipe that is used as a sub-recipe in other recipes',
          usedIn: recipe.usedIn.length,
        },
        { status: 400 }
      );
    }

    // Check if recipe has Square mappings
    if (recipe.squareItemMappings.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot convert recipe that is mapped to Square items. Remove mappings first.',
          mappings: recipe.squareItemMappings.length,
        },
        { status: 400 }
      );
    }

    // Check if an item with the same name already exists
    const existingItem = await prisma.item.findFirst({
      where: {
        name: recipe.name,
        accountId: session.user.accountId,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'An item with this name already exists' },
        { status: 400 }
      );
    }

    // Convert in a transaction
    const newItem = await prisma.$transaction(async (tx) => {
      // Create the new item
      const item = await tx.item.create({
        data: {
          name: recipe.name,
          description: recipe.description,
          categoryId: recipe.categoryId,
          accountId: session.user.accountId,
          unit: recipe.yieldUnit || 'pieces',
          costPrice: null, // Can be set later
        },
      });

      // Delete the recipe (this will cascade delete ingredients)
      await tx.recipe.delete({
        where: { id },
      });

      return item;
    });

    return NextResponse.json({
      success: true,
      item: newItem,
      message: `Recipe "${recipe.name}" has been converted to an inventory item`,
    });
  } catch (error) {
    console.error('Error converting recipe to item:', error);
    return NextResponse.json(
      { error: 'Failed to convert recipe to item' },
      { status: 500 }
    );
  }
}
