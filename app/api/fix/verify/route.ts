import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const TARGET_ACCOUNT_ID = 'cmki4ai7n00009dhwzfs3dqsz'; // Bruno Grandi

  const count = await prisma.category.count({
    where: { accountId: TARGET_ACCOUNT_ID }
  });

  const rootCategories = await prisma.category.findMany({
    where: {
      accountId: TARGET_ACCOUNT_ID,
      parentId: null
    },
    select: { name: true, icon: true }
  });

  return NextResponse.json({
    accountId: TARGET_ACCOUNT_ID,
    totalCategories: count,
    rootCategories
  });
}
