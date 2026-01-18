import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Copy a recipe to another store
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipeId, targetStoreId } = body;

    if (!recipeId || !targetStoreId) {
      return NextResponse.json(
        { error: 'Recipe ID and target store ID are required' },
        { status: 400 }
      );
    }

    // Verify target store belongs to the account
    const targetStore = await prisma.store.findFirst({
      where: {
        id: targetStoreId,
        accountId: session.user.accountId,
      },
    });

    if (!targetStore) {
      return NextResponse.json(
        { error: 'Target store not found' },
        { status: 404 }
      );
    }

    // Get the source recipe with all its data
    const sourceRecipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        accountId: session.user.accountId,
      },
      include: {
        ingredients: true,
        steps: true,
        tags: true,
      },
    });

    if (!sourceRecipe) {
      return NextResponse.json(
        { error: 'Source recipe not found' },
        { status: 404 }
      );
    }

    // Check if recipe already exists in target store (by name)
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        accountId: session.user.accountId,
        storeId: targetStoreId,
        name: sourceRecipe.name,
      },
    });

    if (existingRecipe) {
      return NextResponse.json(
        { error: 'A recipe with this name already exists in the target store' },
        { status: 409 }
      );
    }

    // Create the copy in the target store
    const copiedRecipe = await prisma.recipe.create({
      data: {
        name: sourceRecipe.name,
        description: sourceRecipe.description,
        imageUrl: sourceRecipe.imageUrl,
        yieldQuantity: sourceRecipe.yieldQuantity,
        yieldUnit: sourceRecipe.yieldUnit,
        categoryId: sourceRecipe.categoryId,
        isSubRecipe: sourceRecipe.isSubRecipe,
        isActive: sourceRecipe.isActive,
        instructions: sourceRecipe.instructions,
        prepTime: sourceRecipe.prepTime,
        cookTime: sourceRecipe.cookTime,
        equipment: sourceRecipe.equipment,
        accountId: session.user.accountId,
        storeId: targetStoreId,
        sourceRecipeId: sourceRecipe.id, // Track the source
        ingredients: {
          create: sourceRecipe.ingredients.map((ing) => ({
            itemId: ing.itemId,
            subRecipeId: ing.subRecipeId,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            wasteFactor: ing.wasteFactor,
          })),
        },
        steps: {
          create: sourceRecipe.steps.map((step) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            instruction: step.instruction,
            imageUrl: step.imageUrl,
            duration: step.duration,
            notes: step.notes,
          })),
        },
        tags: {
          create: sourceRecipe.tags.map((t) => ({
            tagId: t.tagId,
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
        tags: {
          include: { tag: true },
        },
        store: true,
      },
    });

    return NextResponse.json({
      ...copiedRecipe,
      tags: copiedRecipe.tags.map((t) => t.tag),
      copiedFrom: sourceRecipe.name,
      sourceStoreId: sourceRecipe.storeId,
    }, { status: 201 });
  } catch (error) {
    console.error('Error copying recipe:', error);
    return NextResponse.json(
      { error: 'Failed to copy recipe' },
      { status: 500 }
    );
  }
}
