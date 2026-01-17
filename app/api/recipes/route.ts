import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get all recipes with ingredients and cost calculation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeSubRecipes = searchParams.get('includeSubRecipes') !== 'false';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const categoryId = searchParams.get('categoryId');

    const recipes = await prisma.recipe.findMany({
      where: {
        accountId: session.user.accountId,
        ...(activeOnly && { isActive: true }),
        ...(categoryId && { categoryId }),
        ...(!includeSubRecipes && { isSubRecipe: false }),
      },
      include: {
        category: true,
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
        _count: {
          select: { squareItemMappings: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate cost for each recipe
    const recipesWithCost = recipes.map((recipe) => ({
      ...recipe,
      calculatedCost: calculateRecipeCost(recipe),
      costPerPortion: calculateRecipeCost(recipe) / recipe.yieldQuantity,
      squareMappingsCount: recipe._count.squareItemMappings,
    }));

    return NextResponse.json(recipesWithCost);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

// Create a new recipe
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      imageUrl,
      yieldQuantity,
      yieldUnit,
      categoryId,
      isSubRecipe,
      instructions,
      prepTime,
      cookTime,
      ingredients,
      steps,
      equipment,
      squareItemId,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Recipe name is required' },
        { status: 400 }
      );
    }

    // Create recipe with ingredients and steps in a transaction
    const recipe = await prisma.recipe.create({
      data: {
        name,
        description: description || null,
        imageUrl: imageUrl || null,
        yieldQuantity: yieldQuantity || 1,
        yieldUnit: yieldUnit || 'portions',
        categoryId: categoryId || null,
        isSubRecipe: isSubRecipe || false,
        instructions: instructions || null,
        prepTime: prepTime || null,
        cookTime: cookTime || null,
        equipment: equipment ? JSON.stringify(equipment) : null,
        squareItemId: squareItemId || null,
        accountId: session.user.accountId,
        ingredients: {
          create: (ingredients || []).map((ing: any) => ({
            itemId: ing.itemId || null,
            subRecipeId: ing.subRecipeId || null,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes || null,
            wasteFactor: ing.wasteFactor || 0,
          })),
        },
        steps: {
          create: (steps || []).map((step: any, index: number) => ({
            stepNumber: index + 1,
            title: step.title || null,
            instruction: step.instruction,
            imageUrl: step.imageUrl || null,
            duration: step.duration || null,
            notes: step.notes || null,
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
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}

// Helper function to calculate recipe cost using latest purchase prices
function calculateRecipeCost(recipe: any): number {
  let totalCost = 0;

  for (const ingredient of recipe.ingredients || []) {
    if (ingredient.item) {
      // Get latest purchase price
      const latestMovement = ingredient.item.stockMovements?.[0];
      const unitCost = latestMovement?.costPrice || ingredient.item.costPrice || 0;

      // Apply waste factor: if 10% waste, need 10% more = multiply by 1.1
      const adjustedQuantity = ingredient.quantity * (1 + (ingredient.wasteFactor || 0));
      totalCost += unitCost * adjustedQuantity;
    } else if (ingredient.subRecipe) {
      // Recursively calculate sub-recipe cost
      const subRecipeCost = calculateRecipeCost(ingredient.subRecipe);
      const costPerYield = subRecipeCost / (ingredient.subRecipe.yieldQuantity || 1);
      const adjustedQuantity = ingredient.quantity * (1 + (ingredient.wasteFactor || 0));
      totalCost += costPerYield * adjustedQuantity;
    }
  }

  return totalCost;
}
