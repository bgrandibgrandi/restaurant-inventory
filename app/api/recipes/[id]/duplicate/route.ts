import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Duplicate a recipe
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

    // Get the original recipe with all details
    const original = await prisma.recipe.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        ingredients: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Generate a unique name
    let newName = `${original.name} (Copy)`;
    let counter = 1;

    // Check for existing copies to avoid duplicates
    const existingCopies = await prisma.recipe.findMany({
      where: {
        accountId: session.user.accountId,
        name: {
          startsWith: original.name,
        },
      },
      select: { name: true },
    });

    const existingNames = existingCopies.map((r) => r.name);
    while (existingNames.includes(newName)) {
      counter++;
      newName = `${original.name} (Copy ${counter})`;
    }

    // Create the duplicate
    const duplicate = await prisma.recipe.create({
      data: {
        name: newName,
        description: original.description,
        imageUrl: original.imageUrl,
        yieldQuantity: original.yieldQuantity,
        yieldUnit: original.yieldUnit,
        isSubRecipe: original.isSubRecipe,
        isActive: false, // Start as inactive so user can review
        instructions: original.instructions,
        prepTime: original.prepTime,
        cookTime: original.cookTime,
        categoryId: original.categoryId,
        accountId: session.user.accountId,
        ingredients: {
          create: original.ingredients.map((ing) => ({
            itemId: ing.itemId,
            subRecipeId: ing.subRecipeId,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            wasteFactor: ing.wasteFactor,
          })),
        },
      },
      include: {
        category: true,
        ingredients: {
          include: {
            item: true,
            subRecipe: true,
          },
        },
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error('Error duplicating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate recipe' },
      { status: 500 }
    );
  }
}
