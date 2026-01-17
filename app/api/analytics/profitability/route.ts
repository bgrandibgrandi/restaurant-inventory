import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

// Get profitability analytics for menu engineering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all recipes with their costs and Square mappings
    const recipes = await prisma.recipe.findMany({
      where: {
        accountId: session.user.accountId,
        isSubRecipe: false, // Only menu items
      },
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
        squareItemMappings: {
          include: {
            catalogItem: {
              select: {
                id: true,
                name: true,
                variations: true,
              },
            },
            variation: {
              select: {
                id: true,
                name: true,
                priceMoney: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Process recipes to calculate profitability metrics
    const processedRecipes = recipes.map((recipe) => {
      const totalCost = calculateRecipeCost(recipe);
      const costPerPortion = totalCost / recipe.yieldQuantity;

      // Extract sale price from Square
      let salePrice: number | null = null;
      if (recipe.squareItemMappings && recipe.squareItemMappings.length > 0) {
        const mapping = recipe.squareItemMappings[0];
        if (mapping.variation?.priceMoney) {
          salePrice = mapping.variation.priceMoney / 100;
        } else if (mapping.catalogItem?.variations?.[0]?.priceMoney) {
          salePrice = mapping.catalogItem.variations[0].priceMoney / 100;
        }
      }

      const profit = salePrice !== null ? salePrice - costPerPortion : null;
      const margin = salePrice !== null && salePrice > 0 ? (profit! / salePrice) * 100 : null;
      const foodCostPercentage = salePrice !== null && salePrice > 0 ? (costPerPortion / salePrice) * 100 : null;

      return {
        id: recipe.id,
        name: recipe.name,
        imageUrl: recipe.imageUrl,
        cost: costPerPortion,
        salePrice,
        profit,
        margin,
        foodCostPercentage,
        hasSquareMapping: recipe.squareItemMappings.length > 0,
        tags: recipe.tags.map((t) => ({
          id: t.tag.id,
          name: t.tag.name,
          color: t.tag.color,
        })),
      };
    });

    // Calculate summary statistics
    const linkedRecipes = processedRecipes.filter((r) => r.hasSquareMapping);
    const totalRecipes = processedRecipes.length;
    const linkedCount = linkedRecipes.length;

    // Average metrics (only for linked recipes)
    const avgMargin =
      linkedRecipes.length > 0
        ? linkedRecipes.reduce((sum, r) => sum + (r.margin || 0), 0) / linkedRecipes.length
        : 0;

    const avgFoodCost =
      linkedRecipes.length > 0
        ? linkedRecipes.reduce((sum, r) => sum + (r.foodCostPercentage || 0), 0) / linkedRecipes.length
        : 0;

    const avgProfit =
      linkedRecipes.length > 0
        ? linkedRecipes.reduce((sum, r) => sum + (r.profit || 0), 0) / linkedRecipes.length
        : 0;

    // Categorize by margin
    const highMargin = processedRecipes.filter((r) => r.margin !== null && r.margin >= 70);
    const goodMargin = processedRecipes.filter(
      (r) => r.margin !== null && r.margin >= 50 && r.margin < 70
    );
    const lowMargin = processedRecipes.filter(
      (r) => r.margin !== null && r.margin >= 30 && r.margin < 50
    );
    const criticalMargin = processedRecipes.filter(
      (r) => r.margin !== null && r.margin < 30
    );

    // Top and bottom performers
    const sortedByMargin = [...linkedRecipes].sort(
      (a, b) => (b.margin || 0) - (a.margin || 0)
    );
    const topPerformers = sortedByMargin.slice(0, 5);
    const bottomPerformers = sortedByMargin.slice(-5).reverse();

    // Food cost distribution
    const under25 = linkedRecipes.filter(
      (r) => r.foodCostPercentage !== null && r.foodCostPercentage < 25
    ).length;
    const between25And30 = linkedRecipes.filter(
      (r) => r.foodCostPercentage !== null && r.foodCostPercentage >= 25 && r.foodCostPercentage < 30
    ).length;
    const between30And35 = linkedRecipes.filter(
      (r) => r.foodCostPercentage !== null && r.foodCostPercentage >= 30 && r.foodCostPercentage < 35
    ).length;
    const over35 = linkedRecipes.filter(
      (r) => r.foodCostPercentage !== null && r.foodCostPercentage >= 35
    ).length;

    return NextResponse.json({
      summary: {
        totalRecipes,
        linkedToSquare: linkedCount,
        avgMargin,
        avgFoodCost,
        avgProfit,
      },
      marginDistribution: {
        high: highMargin.length,
        good: goodMargin.length,
        low: lowMargin.length,
        critical: criticalMargin.length,
      },
      foodCostDistribution: {
        under25,
        between25And30,
        between30And35,
        over35,
      },
      topPerformers,
      bottomPerformers,
      recipes: processedRecipes,
    });
  } catch (error) {
    console.error('Error fetching profitability data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profitability data' },
      { status: 500 }
    );
  }
}
