import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get a single prep plan with all items
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

    const prepPlan = await prisma.prepPlan.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        store: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                yieldQuantity: true,
                yieldUnit: true,
                isSubRecipe: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!prepPlan) {
      return NextResponse.json(
        { error: 'Prep plan not found' },
        { status: 404 }
      );
    }

    // Calculate completion stats
    const totalItems = prepPlan.items.length;
    const completedItems = prepPlan.items.filter((item) => item.completedAt !== null).length;
    const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return NextResponse.json({
      ...prepPlan,
      totalItems,
      completedItems,
      completionPercentage,
    });
  } catch (error) {
    console.error('Error fetching prep plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prep plan' },
      { status: 500 }
    );
  }
}

// Update a prep plan
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

    // Check if plan exists and belongs to account
    const existingPlan = await prisma.prepPlan.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Prep plan not found' },
        { status: 404 }
      );
    }

    // Handle updating item completion
    if (body.action === 'complete_item') {
      const { itemId, actualQuantity } = body;

      const updatedItem = await prisma.prepPlanItem.update({
        where: { id: itemId },
        data: {
          completedAt: new Date(),
          actualQuantity: actualQuantity !== undefined ? parseFloat(actualQuantity) : null,
        },
        include: {
          recipe: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              yieldQuantity: true,
              yieldUnit: true,
            },
          },
        },
      });

      return NextResponse.json(updatedItem);
    }

    // Handle uncompleting an item
    if (body.action === 'uncomplete_item') {
      const { itemId } = body;

      const updatedItem = await prisma.prepPlanItem.update({
        where: { id: itemId },
        data: {
          completedAt: null,
          actualQuantity: null,
        },
        include: {
          recipe: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              yieldQuantity: true,
              yieldUnit: true,
            },
          },
        },
      });

      return NextResponse.json(updatedItem);
    }

    // Handle adding items to plan
    if (body.action === 'add_items') {
      const { items } = body;

      const createdItems = await prisma.prepPlanItem.createMany({
        data: items.map((item: any) => ({
          prepPlanId: id,
          recipeId: item.recipeId,
          targetQuantity: item.targetQuantity,
          notes: item.notes || null,
        })),
      });

      return NextResponse.json({ created: createdItems.count });
    }

    // Handle removing an item
    if (body.action === 'remove_item') {
      const { itemId } = body;

      await prisma.prepPlanItem.delete({
        where: { id: itemId },
      });

      return NextResponse.json({ success: true });
    }

    // Handle status change
    if (body.action === 'update_status') {
      const { status } = body;

      const updatedPlan = await prisma.prepPlan.update({
        where: { id },
        data: { status },
        include: {
          store: {
            select: { id: true, name: true },
          },
        },
      });

      return NextResponse.json(updatedPlan);
    }

    // General update (name, date, notes)
    const { name, planDate, notes } = body;

    const updatedPlan = await prisma.prepPlan.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(planDate && { planDate: new Date(planDate) }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        store: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                yieldQuantity: true,
                yieldUnit: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('Error updating prep plan:', error);
    return NextResponse.json(
      { error: 'Failed to update prep plan' },
      { status: 500 }
    );
  }
}

// Delete a prep plan
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

    // Check if plan exists and belongs to account
    const existingPlan = await prisma.prepPlan.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Prep plan not found' },
        { status: 404 }
      );
    }

    // Delete plan (cascade will remove items)
    await prisma.prepPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prep plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete prep plan' },
      { status: 500 }
    );
  }
}
