import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get single recipe with full details
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

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        category: true,
        ingredients: {
          include: {
            item: {
              include: {
                category: true,
                stockMovements: {
                  where: { type: 'PURCHASE' },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
            subRecipe: {
              include: {
                ingredients: {
                  include: {
                    item: {
                      include: {
                        stockMovements: {
                          where: { type: 'PURCHASE' },
                          orderBy: { createdAt: 'desc' },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        usedIn: {
          include: {
            recipe: {
              select: { id: true, name: true },
            },
          },
        },
        squareItemMappings: {
          include: {
            catalogItem: true,
            variation: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Calculate costs
    const calculatedCost = calculateRecipeCost(recipe);

    return NextResponse.json({
      ...recipe,
      calculatedCost,
      costPerPortion: calculatedCost / recipe.yieldQuantity,
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

// Update recipe
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

    // Verify recipe belongs to account
    const existing = await prisma.recipe.findFirst({
      where: { id, accountId: session.user.accountId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const {
      name,
      description,
      imageUrl,
      yieldQuantity,
      yieldUnit,
      categoryId,
      isSubRecipe,
      isActive,
      instructions,
      prepTime,
      cookTime,
      ingredients,
    } = body;

    // Update recipe and replace ingredients in a transaction
    const recipe = await prisma.$transaction(async (tx) => {
      // Delete existing ingredients if new ones provided
      if (ingredients !== undefined) {
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: id },
        });
      }

      // Update recipe
      return tx.recipe.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
          ...(yieldQuantity !== undefined && { yieldQuantity }),
          ...(yieldUnit !== undefined && { yieldUnit }),
          ...(categoryId !== undefined && { categoryId: categoryId || null }),
          ...(isSubRecipe !== undefined && { isSubRecipe }),
          ...(isActive !== undefined && { isActive }),
          ...(instructions !== undefined && { instructions }),
          ...(prepTime !== undefined && { prepTime }),
          ...(cookTime !== undefined && { cookTime }),
          ...(ingredients !== undefined && {
            ingredients: {
              create: ingredients.map((ing: any) => ({
                itemId: ing.itemId || null,
                subRecipeId: ing.subRecipeId || null,
                quantity: ing.quantity,
                unit: ing.unit,
                notes: ing.notes || null,
                wasteFactor: ing.wasteFactor || 0,
              })),
            },
          }),
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
    });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

// Delete recipe
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

    // Verify recipe belongs to account
    const existing = await prisma.recipe.findFirst({
      where: { id, accountId: session.user.accountId },
      include: {
        usedIn: true,
        squareItemMappings: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Check if recipe is used as sub-recipe
    if (existing.usedIn.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete recipe that is used as a sub-recipe in other recipes',
          usedIn: existing.usedIn.length,
        },
        { status: 400 }
      );
    }

    // Check if recipe has Square mappings
    if (existing.squareItemMappings.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete recipe that is mapped to Square items. Remove mappings first.',
          mappings: existing.squareItemMappings.length,
        },
        { status: 400 }
      );
    }

    await prisma.recipe.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}

// Helper function to calculate recipe cost using latest purchase prices
function calculateRecipeCost(recipe: any): number {
  let totalCost = 0;

  for (const ingredient of recipe.ingredients || []) {
    if (ingredient.item) {
      const latestMovement = ingredient.item.stockMovements?.[0];
      const unitCost = latestMovement?.costPrice || ingredient.item.costPrice || 0;
      const adjustedQuantity = ingredient.quantity * (1 + (ingredient.wasteFactor || 0));
      totalCost += unitCost * adjustedQuantity;
    } else if (ingredient.subRecipe) {
      const subRecipeCost = calculateRecipeCost(ingredient.subRecipe);
      const costPerYield = subRecipeCost / (ingredient.subRecipe.yieldQuantity || 1);
      const adjustedQuantity = ingredient.quantity * (1 + (ingredient.wasteFactor || 0));
      totalCost += costPerYield * adjustedQuantity;
    }
  }

  return totalCost;
}
