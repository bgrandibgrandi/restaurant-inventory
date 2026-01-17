import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch Square catalog items as recipe name suggestions
// Returns items that don't have recipes yet, for easy recipe creation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get all Square catalog items for this account
    const squareItems = await prisma.squareCatalogItem.findMany({
      where: {
        accountId: session.user.accountId,
        isActive: true,
        ...(query && {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        }),
      },
      include: {
        variations: {
          select: {
            id: true,
            squareId: true,
            name: true,
            priceMoney: true,
          },
        },
        mappings: {
          select: {
            id: true,
            recipeId: true,
            variationId: true,
          },
        },
        squareConnection: {
          select: {
            store: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
    });

    // Process items to show which have recipes and which don't
    const suggestions = squareItems.map((item) => {
      const hasRecipe = item.mappings.length > 0;
      const mappedVariationIds = item.mappings
        .filter((m) => m.variationId)
        .map((m) => m.variationId);

      return {
        id: item.id,
        squareId: item.squareId,
        name: item.name,
        description: item.description,
        categoryName: item.categoryName,
        storeName: item.squareConnection?.store?.name || null,
        hasRecipe,
        linkedRecipeId: item.mappings[0]?.recipeId || null,
        variations: item.variations.map((v) => ({
          id: v.id,
          squareId: v.squareId,
          name: v.name,
          price: v.priceMoney ? v.priceMoney / 100 : null, // Convert cents to currency
          hasRecipe: mappedVariationIds.includes(v.id),
        })),
      };
    });

    // Sort: items without recipes first, then alphabetically
    suggestions.sort((a, b) => {
      if (a.hasRecipe !== b.hasRecipe) {
        return a.hasRecipe ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      suggestions,
      total: suggestions.length,
    });
  } catch (error) {
    console.error('Error fetching recipe suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
