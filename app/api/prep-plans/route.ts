import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get all prep plans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      accountId: session.user.accountId,
    };

    if (storeId) where.storeId = storeId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.planDate = {};
      if (startDate) where.planDate.gte = new Date(startDate);
      if (endDate) where.planDate.lte = new Date(endDate);
    }

    const prepPlans = await prisma.prepPlan.findMany({
      where,
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
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { planDate: 'desc' },
    });

    // Calculate completion percentage for each plan
    const plansWithStats = prepPlans.map((plan) => {
      const totalItems = plan.items.length;
      const completedItems = plan.items.filter((item) => item.completedAt !== null).length;
      const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

      return {
        ...plan,
        totalItems,
        completedItems,
        completionPercentage,
      };
    });

    return NextResponse.json(plansWithStats);
  } catch (error) {
    console.error('Error fetching prep plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prep plans' },
      { status: 500 }
    );
  }
}

// Create a new prep plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, planDate, storeId, notes, items } = body;

    if (!name || !planDate || !storeId) {
      return NextResponse.json(
        { error: 'Name, date, and store are required' },
        { status: 400 }
      );
    }

    // Verify store belongs to account
    const store = await prisma.store.findFirst({
      where: { id: storeId, accountId: session.user.accountId },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const prepPlan = await prisma.prepPlan.create({
      data: {
        name,
        planDate: new Date(planDate),
        storeId,
        notes: notes || null,
        accountId: session.user.accountId,
        items: {
          create: (items || []).map((item: any) => ({
            recipeId: item.recipeId,
            targetQuantity: item.targetQuantity,
            notes: item.notes || null,
          })),
        },
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
        },
      },
    });

    return NextResponse.json(prepPlan, { status: 201 });
  } catch (error) {
    console.error('Error creating prep plan:', error);
    return NextResponse.json(
      { error: 'Failed to create prep plan' },
      { status: 500 }
    );
  }
}
