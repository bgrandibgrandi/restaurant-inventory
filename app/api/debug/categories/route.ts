import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Get user's accountId
    const userAccountId = session?.user?.accountId;

    // Get all accounts
    const accounts = await prisma.account.findMany({
      select: { id: true, name: true }
    });

    // Get categories count by accountId
    const categoriesByAccount = await prisma.category.groupBy({
      by: ['accountId'],
      _count: { id: true }
    });

    // Get categories for user's account
    const userCategories = userAccountId ? await prisma.category.findMany({
      where: {
        accountId: userAccountId,
        isActive: true,
        parentId: null
      },
      select: { id: true, name: true, icon: true }
    }) : [];

    // Get a sample of all root categories regardless of account
    const allRootCategories = await prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true
      },
      select: { id: true, name: true, icon: true, accountId: true },
      take: 20
    });

    return NextResponse.json({
      session: {
        user: session?.user,
        accountId: userAccountId
      },
      accounts,
      categoriesByAccount,
      userCategoriesCount: userCategories.length,
      userCategories: userCategories.slice(0, 5),
      allRootCategoriesCount: allRootCategories.length,
      allRootCategories: allRootCategories.slice(0, 5)
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
