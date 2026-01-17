import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Sync orders from Square and create stock movements
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, startDate, endDate } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID required' },
        { status: 400 }
      );
    }

    // Get connection with store info
    const connection = await prisma.squareConnection.findFirst({
      where: {
        id: connectionId,
        accountId: session.user.accountId,
      },
      include: {
        store: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Build date range for orders query
    const now = new Date();
    const defaultStartDate = new Date(now);
    defaultStartDate.setDate(defaultStartDate.getDate() - 1); // Last 24 hours by default

    const queryStartDate = startDate
      ? new Date(startDate)
      : defaultStartDate;
    const queryEndDate = endDate ? new Date(endDate) : now;

    // Fetch orders from Square
    const orders: any[] = [];
    let cursor: string | undefined;

    do {
      const requestBody: any = {
        location_ids: connection.squareLocationId
          ? [connection.squareLocationId]
          : undefined,
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: queryStartDate.toISOString(),
                end_at: queryEndDate.toISOString(),
              },
            },
            state_filter: {
              states: ['COMPLETED'],
            },
          },
          sort: {
            sort_field: 'CREATED_AT',
            sort_order: 'DESC',
          },
        },
        limit: 100,
      };

      if (cursor) {
        requestBody.cursor = cursor;
      }

      const response = await fetch(
        'https://connect.squareup.com/v2/orders/search',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            'Square-Version': '2024-01-18',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Square orders error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch orders from Square' },
          { status: 500 }
        );
      }

      const data = await response.json();
      if (data.orders) {
        orders.push(...data.orders);
      }
      cursor = data.cursor;
    } while (cursor);

    // Process orders and create stock movements
    let processedOrders = 0;
    let skippedOrders = 0;
    let createdMovements = 0;
    const errors: string[] = [];

    // Get all mappings for this connection's catalog items
    const catalogItems = await prisma.squareCatalogItem.findMany({
      where: {
        squareConnectionId: connection.id,
      },
      include: {
        mappings: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    item: true,
                    subRecipe: {
                      include: {
                        ingredients: {
                          include: {
                            item: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            variation: true,
          },
        },
        variations: true,
      },
    });

    // Build lookup maps for quick access
    const catalogItemBySquareId = new Map(
      catalogItems.map((item) => [item.squareId, item])
    );
    const variationBySquareId = new Map<string, { catalogItem: any; variation: any }>();
    catalogItems.forEach((item) => {
      item.variations.forEach((variation) => {
        variationBySquareId.set(variation.squareId, {
          catalogItem: item,
          variation,
        });
      });
    });

    for (const order of orders) {
      // Check if already processed
      const existingSync = await prisma.squareOrderSync.findUnique({
        where: {
          squareOrderId_squareConnectionId: {
            squareOrderId: order.id,
            squareConnectionId: connection.id,
          },
        },
      });

      if (existingSync) {
        skippedOrders++;
        continue;
      }

      const lineItems = order.line_items || [];
      const orderMovements: Array<{
        itemId: string;
        quantity: number;
        costPrice: number | null;
      }> = [];

      for (const lineItem of lineItems) {
        const quantity = parseInt(lineItem.quantity || '1', 10);
        const catalogObjectId = lineItem.catalog_object_id;
        const variationCatalogObjectId = lineItem.catalog_object_id;

        if (!catalogObjectId) continue;

        // Try to find mapping for this item/variation
        let mapping = null;

        // Check if it's a variation
        const variationInfo = variationBySquareId.get(variationCatalogObjectId);
        if (variationInfo) {
          // Find mapping for this specific variation
          mapping = variationInfo.catalogItem.mappings.find(
            (m: any) => m.variationId === variationInfo.variation.id
          );
          // Or fall back to item-level mapping
          if (!mapping) {
            mapping = variationInfo.catalogItem.mappings.find(
              (m: any) => !m.variationId
            );
          }
        } else {
          // Check if it's a catalog item
          const catalogItem = catalogItemBySquareId.get(catalogObjectId);
          if (catalogItem) {
            mapping = catalogItem.mappings.find((m: any) => !m.variationId);
          }
        }

        if (!mapping) {
          // No mapping found, skip this item
          continue;
        }

        // Get ingredients from the mapped recipe
        const recipe = mapping.recipe;
        const multiplier = mapping.multiplier || 1;

        // Flatten ingredients (including sub-recipes)
        const flattenedIngredients = flattenRecipeIngredients(
          recipe.ingredients,
          recipe.yieldQuantity
        );

        for (const ing of flattenedIngredients) {
          if (!ing.itemId) continue;

          const ingredientQuantity =
            ing.quantity * quantity * multiplier * (1 + (ing.wasteFactor || 0));

          // Aggregate movements by item
          const existing = orderMovements.find((m) => m.itemId === ing.itemId);
          if (existing) {
            existing.quantity += ingredientQuantity;
          } else {
            orderMovements.push({
              itemId: ing.itemId,
              quantity: ingredientQuantity,
              costPrice: ing.item?.costPrice || null,
            });
          }
        }
      }

      // Create stock movements for this order
      if (orderMovements.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const movement of orderMovements) {
            await tx.stockMovement.create({
              data: {
                itemId: movement.itemId,
                storeId: connection.storeId,
                quantity: -movement.quantity, // Negative for outgoing
                type: 'SALE',
                notes: `Square Order ${order.id}`,
                referenceId: order.id,
                referenceType: 'square_order',
                costPrice: movement.costPrice,
                createdBy: session.user.id,
                accountId: session.user.accountId,
              },
            });
            createdMovements++;
          }

          // Record order sync
          await tx.squareOrderSync.create({
            data: {
              squareOrderId: order.id,
              squareConnectionId: connection.id,
              accountId: session.user.accountId,
              storeId: connection.storeId,
              orderDate: new Date(order.created_at),
              totalMoney: order.total_money?.amount
                ? order.total_money.amount / 100
                : null,
              itemCount: lineItems.length,
              status: 'processed',
              processedAt: new Date(),
            },
          });
        });

        processedOrders++;
      } else {
        // No mapped items in this order, still record it to avoid reprocessing
        await prisma.squareOrderSync.create({
          data: {
            squareOrderId: order.id,
            squareConnectionId: connection.id,
            accountId: session.user.accountId,
            storeId: connection.storeId,
            orderDate: new Date(order.created_at),
            totalMoney: order.total_money?.amount
              ? order.total_money.amount / 100
              : null,
            itemCount: lineItems.length,
            status: 'synced',
          },
        });
        skippedOrders++;
      }
    }

    // Update last order sync time
    await prisma.squareConnection.update({
      where: { id: connection.id },
      data: { lastOrderSync: new Date() },
    });

    return NextResponse.json({
      success: true,
      totalOrders: orders.length,
      processedOrders,
      skippedOrders,
      createdMovements,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error syncing Square orders:', error);
    return NextResponse.json(
      { error: 'Failed to sync orders' },
      { status: 500 }
    );
  }
}

// Helper function to flatten recipe ingredients, expanding sub-recipes
function flattenRecipeIngredients(
  ingredients: any[],
  recipeYield: number
): Array<{
  itemId: string | null;
  quantity: number;
  wasteFactor: number;
  item: any;
}> {
  const result: Array<{
    itemId: string | null;
    quantity: number;
    wasteFactor: number;
    item: any;
  }> = [];

  for (const ing of ingredients) {
    if (ing.item) {
      // Direct item ingredient
      result.push({
        itemId: ing.itemId,
        quantity: ing.quantity / recipeYield, // Normalize to per-portion
        wasteFactor: ing.wasteFactor || 0,
        item: ing.item,
      });
    } else if (ing.subRecipe) {
      // Sub-recipe - recursively flatten
      const subIngredients = flattenRecipeIngredients(
        ing.subRecipe.ingredients,
        ing.subRecipe.yieldQuantity
      );

      // Scale by the quantity of sub-recipe used
      for (const subIng of subIngredients) {
        const scaledQuantity =
          (subIng.quantity * ing.quantity) / recipeYield;

        // Check if already exists and aggregate
        const existing = result.find((r) => r.itemId === subIng.itemId);
        if (existing) {
          existing.quantity += scaledQuantity;
        } else {
          result.push({
            ...subIng,
            quantity: scaledQuantity,
          });
        }
      }
    }
  }

  return result;
}

// GET - List synced orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const whereClause: any = {
      accountId: session.user.accountId,
    };

    if (connectionId) {
      whereClause.squareConnectionId = connectionId;
    }

    const orders = await prisma.squareOrderSync.findMany({
      where: whereClause,
      orderBy: { orderDate: 'desc' },
      take: limit,
      include: {
        squareConnection: {
          include: {
            store: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching order syncs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
