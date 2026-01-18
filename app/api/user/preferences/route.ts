import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/user/preferences - Get user preferences
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        preferredLanguage: true,
        selectedStoreId: true,
        selectedStore: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/preferences - Update user preferences
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { preferredLanguage, selectedStoreId } = body;

    // Validate language
    if (preferredLanguage && !['en', 'es'].includes(preferredLanguage)) {
      return NextResponse.json(
        { error: 'Invalid language. Must be "en" or "es"' },
        { status: 400 }
      );
    }

    // If changing store, verify the store belongs to user's account
    if (selectedStoreId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { accountId: true },
      });

      const store = await prisma.store.findFirst({
        where: {
          id: selectedStoreId,
          accountId: user?.accountId,
        },
      });

      if (!store) {
        return NextResponse.json(
          { error: 'Store not found or does not belong to your account' },
          { status: 404 }
        );
      }
    }

    // Build update data
    const updateData: { preferredLanguage?: string; selectedStoreId?: string } = {};
    if (preferredLanguage) {
      updateData.preferredLanguage = preferredLanguage;
    }
    if (selectedStoreId) {
      updateData.selectedStoreId = selectedStoreId;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        preferredLanguage: true,
        selectedStoreId: true,
        selectedStore: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}
