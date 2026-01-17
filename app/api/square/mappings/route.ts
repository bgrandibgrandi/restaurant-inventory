import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get all Square item mappings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mappings = await prisma.squareItemMapping.findMany({
      where: { accountId: session.user.accountId },
      include: {
        catalogItem: {
          include: {
            squareConnection: {
              include: {
                store: { select: { id: true, name: true } },
              },
            },
          },
        },
        variation: true,
        recipe: {
          select: { id: true, name: true, isSubRecipe: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error fetching Square mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}

// Create a new Square item mapping
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { catalogItemId, variationId, recipeId, multiplier = 1 } = body;

    if (!catalogItemId || !recipeId) {
      return NextResponse.json(
        { error: 'Catalog item ID and Recipe ID are required' },
        { status: 400 }
      );
    }

    // Verify catalog item belongs to account
    const catalogItem = await prisma.squareCatalogItem.findFirst({
      where: {
        id: catalogItemId,
        accountId: session.user.accountId,
      },
    });

    if (!catalogItem) {
      return NextResponse.json(
        { error: 'Catalog item not found' },
        { status: 404 }
      );
    }

    // Verify recipe belongs to account
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        accountId: session.user.accountId,
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // If variation is specified, verify it belongs to the catalog item
    if (variationId) {
      const variation = await prisma.squareItemVariation.findFirst({
        where: {
          id: variationId,
          catalogItemId: catalogItemId,
        },
      });

      if (!variation) {
        return NextResponse.json(
          { error: 'Variation not found' },
          { status: 404 }
        );
      }
    }

    // Check for existing mapping
    const existingMapping = await prisma.squareItemMapping.findUnique({
      where: {
        catalogItemId_variationId_accountId: {
          catalogItemId,
          variationId: variationId || null,
          accountId: session.user.accountId,
        },
      },
    });

    if (existingMapping) {
      return NextResponse.json(
        { error: 'A mapping already exists for this item/variation' },
        { status: 400 }
      );
    }

    // Create the mapping
    const mapping = await prisma.squareItemMapping.create({
      data: {
        catalogItemId,
        variationId: variationId || null,
        recipeId,
        multiplier,
        accountId: session.user.accountId,
      },
      include: {
        catalogItem: true,
        variation: true,
        recipe: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Error creating Square mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create mapping' },
      { status: 500 }
    );
  }
}

// Delete a Square item mapping
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('id');

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

    // Verify mapping belongs to account
    const mapping = await prisma.squareItemMapping.findFirst({
      where: {
        id: mappingId,
        accountId: session.user.accountId,
      },
    });

    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    await prisma.squareItemMapping.delete({
      where: { id: mappingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Square mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}
