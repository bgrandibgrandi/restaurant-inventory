import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAffectedByMerge, mergeItems } from '@/lib/services/deduplication';

// GET - Get items affected by a potential merge
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemToRemoveId = searchParams.get('itemToRemove');
    const itemToKeepId = searchParams.get('itemToKeep');

    if (!itemToRemoveId || !itemToKeepId) {
      return NextResponse.json(
        { error: 'Both itemToRemove and itemToKeep are required' },
        { status: 400 }
      );
    }

    const affected = await getAffectedByMerge(
      itemToRemoveId,
      itemToKeepId,
      session.user.accountId
    );

    return NextResponse.json(affected);
  } catch (error) {
    console.error('Error checking merge impact:', error);
    return NextResponse.json(
      { error: 'Failed to check merge impact' },
      { status: 500 }
    );
  }
}

// POST - Merge two items
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemToRemoveId, itemToKeepId, confirmed } = body;

    if (!itemToRemoveId || !itemToKeepId) {
      return NextResponse.json(
        { error: 'Both itemToRemoveId and itemToKeepId are required' },
        { status: 400 }
      );
    }

    if (itemToRemoveId === itemToKeepId) {
      return NextResponse.json(
        { error: 'Cannot merge an item with itself' },
        { status: 400 }
      );
    }

    // First, check what will be affected
    const affected = await getAffectedByMerge(
      itemToRemoveId,
      itemToKeepId,
      session.user.accountId
    );

    // If there are affected recipes and user hasn't confirmed, return the affected items
    if (affected.recipes.length > 0 && !confirmed) {
      return NextResponse.json({
        requiresConfirmation: true,
        affected,
        message: `Esta fusión afectará ${affected.recipes.length} receta(s). ¿Confirmar?`,
      });
    }

    // Perform the merge
    const result = await mergeItems(
      itemToRemoveId,
      itemToKeepId,
      session.user.accountId,
      session.user.id
    );

    return NextResponse.json({
      ...result,
      message: `Items fusionados. ${result.migratedRecipes} receta(s) actualizada(s).`,
    });
  } catch (error) {
    console.error('Error merging items:', error);
    return NextResponse.json(
      { error: 'Failed to merge items' },
      { status: 500 }
    );
  }
}
