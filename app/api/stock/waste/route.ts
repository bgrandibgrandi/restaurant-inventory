import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Record waste for one or more items (or recipes)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Support both single item format and array format
    let items: any[];
    let storeId: string;

    if (body.items && Array.isArray(body.items)) {
      // Array format: { items: [...], storeId }
      items = body.items;
      storeId = body.storeId;
    } else if (body.itemId) {
      // Single item format: { itemId, quantity, wasteReasonId, notes, storeId, isRecipe }
      items = [{
        itemId: body.itemId,
        quantity: body.quantity,
        reasonId: body.wasteReasonId,
        notes: body.notes,
        isRecipe: body.isRecipe,
      }];
      storeId = body.storeId;
    } else {
      return NextResponse.json(
        { error: 'Items array or itemId is required' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Validate store
    const store = await prisma.store.findFirst({
      where: { id: storeId, accountId: session.user.accountId },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Get waste reason names for the reason field
    const reasonIds = [...new Set(items.map((i: any) => i.reasonId).filter(Boolean))];
    const reasons = await prisma.wasteReason.findMany({
      where: { id: { in: reasonIds }, accountId: session.user.accountId },
    });
    const reasonMap = new Map(reasons.map((r) => [r.id, r.name]));

    // Create movements for each waste item
    const movements = [];

    for (const wasteItem of items) {
      if (wasteItem.isRecipe) {
        // Handle recipe waste - deduct ingredients
        const recipe = await prisma.recipe.findFirst({
          where: { id: wasteItem.itemId, accountId: session.user.accountId },
          include: {
            ingredients: {
              include: {
                item: true,
                subRecipe: {
                  include: {
                    ingredients: {
                      include: { item: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!recipe) {
          return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Calculate ingredient quantities based on recipe yield and waste quantity
        const wasteQty = wasteItem.quantity;
        const yieldQty = recipe.yieldQuantity || 1;
        const multiplier = wasteQty / yieldQty;

        // Deduct each ingredient
        for (const ingredient of recipe.ingredients) {
          if (ingredient.item) {
            // Direct ingredient
            const ingredientQty = ingredient.quantity * multiplier * (1 + (ingredient.wasteFactor || 0));

            const movement = await prisma.stockMovement.create({
              data: {
                itemId: ingredient.itemId!,
                storeId,
                quantity: -Math.abs(ingredientQty),
                type: 'WASTE',
                reason: wasteItem.reasonId ? reasonMap.get(wasteItem.reasonId) : null,
                notes: `Recipe waste: ${recipe.name} (${wasteQty} ${recipe.yieldUnit})${wasteItem.notes ? ` - ${wasteItem.notes}` : ''}`,
                costPrice: ingredient.item.costPrice,
                referenceId: recipe.id,
                referenceType: 'recipe',
                createdBy: session.user.id,
                accountId: session.user.accountId,
              },
              include: {
                item: { select: { id: true, name: true, unit: true } },
              },
            });
            movements.push(movement);
          } else if (ingredient.subRecipe) {
            // Sub-recipe - deduct its ingredients
            const subMultiplier = (ingredient.quantity * multiplier) / (ingredient.subRecipe.yieldQuantity || 1);

            for (const subIngredient of ingredient.subRecipe.ingredients) {
              if (subIngredient.item) {
                const subQty = subIngredient.quantity * subMultiplier * (1 + (subIngredient.wasteFactor || 0));

                const movement = await prisma.stockMovement.create({
                  data: {
                    itemId: subIngredient.itemId!,
                    storeId,
                    quantity: -Math.abs(subQty),
                    type: 'WASTE',
                    reason: wasteItem.reasonId ? reasonMap.get(wasteItem.reasonId) : null,
                    notes: `Recipe waste: ${recipe.name} > ${ingredient.subRecipe.name}${wasteItem.notes ? ` - ${wasteItem.notes}` : ''}`,
                    costPrice: subIngredient.item.costPrice,
                    referenceId: recipe.id,
                    referenceType: 'recipe',
                    createdBy: session.user.id,
                    accountId: session.user.accountId,
                  },
                  include: {
                    item: { select: { id: true, name: true, unit: true } },
                  },
                });
                movements.push(movement);
              }
            }
          }
        }
      } else {
        // Handle regular item waste
        const item = await prisma.item.findFirst({
          where: { id: wasteItem.itemId, accountId: session.user.accountId },
        });

        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        const movement = await prisma.stockMovement.create({
          data: {
            itemId: wasteItem.itemId,
            storeId,
            quantity: -Math.abs(wasteItem.quantity),
            type: 'WASTE',
            reason: wasteItem.reasonId ? reasonMap.get(wasteItem.reasonId) : null,
            notes: wasteItem.notes,
            costPrice: item.costPrice,
            referenceId: wasteItem.reasonId,
            referenceType: 'waste_reason',
            createdBy: session.user.id,
            accountId: session.user.accountId,
          },
          include: {
            item: { select: { id: true, name: true, unit: true } },
          },
        });
        movements.push(movement);
      }
    }

    // Calculate total waste value
    const totalValue = movements.reduce((sum, m) => {
      return sum + Math.abs(m.quantity) * (m.costPrice || 0);
    }, 0);

    return NextResponse.json({
      movements,
      count: movements.length,
      totalValue,
    });
  } catch (error) {
    console.error('Error recording waste:', error);
    return NextResponse.json(
      { error: 'Failed to record waste' },
      { status: 500 }
    );
  }
}

// GET - Get waste summary with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'reason'; // reason, item, date

    const where: any = {
      accountId: session.user.accountId,
      type: 'WASTE',
    };

    if (storeId) where.storeId = storeId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get all waste movements
    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, unit: true, costPrice: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totalQuantity = movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const totalValue = movements.reduce((sum, m) => {
      return sum + Math.abs(m.quantity) * (m.costPrice || 0);
    }, 0);

    // Group by reason
    const byReason: Record<string, { count: number; value: number }> = {};
    movements.forEach((m) => {
      const reason = m.reason || 'Unspecified';
      if (!byReason[reason]) {
        byReason[reason] = { count: 0, value: 0 };
      }
      byReason[reason].count += Math.abs(m.quantity);
      byReason[reason].value += Math.abs(m.quantity) * (m.costPrice || 0);
    });

    // Group by item
    const byItem: Record<string, { name: string; count: number; value: number; unit: string }> = {};
    movements.forEach((m) => {
      if (!byItem[m.itemId]) {
        byItem[m.itemId] = {
          name: m.item.name,
          count: 0,
          value: 0,
          unit: m.item.unit,
        };
      }
      byItem[m.itemId].count += Math.abs(m.quantity);
      byItem[m.itemId].value += Math.abs(m.quantity) * (m.costPrice || 0);
    });

    return NextResponse.json({
      movements,
      summary: {
        totalQuantity,
        totalValue,
        byReason: Object.entries(byReason).map(([reason, data]) => ({
          reason,
          ...data,
        })).sort((a, b) => b.value - a.value),
        byItem: Object.entries(byItem).map(([itemId, data]) => ({
          itemId,
          ...data,
        })).sort((a, b) => b.value - a.value),
      },
    });
  } catch (error) {
    console.error('Error fetching waste summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waste summary' },
      { status: 500 }
    );
  }
}
