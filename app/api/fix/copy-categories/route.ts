import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// This endpoint copies categories from one account to another
// It's a one-time fix - delete after use

export async function POST() {
  try {
    const SOURCE_ACCOUNT_ID = 'cmkhj4lap0000103el767eitm'; // My Restaurant (has categories)
    const TARGET_ACCOUNT_ID = 'cmki4ai7n00009dhwzfs3dqsz'; // Bruno Grandi (needs categories)

    // Check if target already has categories
    const existingCount = await prisma.category.count({
      where: { accountId: TARGET_ACCOUNT_ID }
    });

    if (existingCount > 0) {
      return NextResponse.json({
        success: false,
        message: `Target account already has ${existingCount} categories. Skipping.`
      });
    }

    // Get all source categories ordered by level (parents first)
    const sourceCategories = await prisma.category.findMany({
      where: { accountId: SOURCE_ACCOUNT_ID },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }]
    });

    if (sourceCategories.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No categories found in source account'
      });
    }

    // Map old IDs to new IDs for parent references
    const idMap: Record<string, string> = {};

    let created = 0;
    for (const cat of sourceCategories) {
      const newParentId = cat.parentId ? idMap[cat.parentId] : null;

      const newCat = await prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          level: cat.level,
          sortOrder: cat.sortOrder,
          isSystem: cat.isSystem,
          isActive: cat.isActive,
          parentId: newParentId,
          accountId: TARGET_ACCOUNT_ID,
        }
      });

      idMap[cat.id] = newCat.id;
      created++;
    }

    return NextResponse.json({
      success: true,
      message: `Copied ${created} categories from "My Restaurant" to "Bruno Grandi"`,
      sourceCount: sourceCategories.length,
      createdCount: created
    });

  } catch (error) {
    console.error('Copy categories error:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to copy categories from My Restaurant to Bruno Grandi account'
  });
}
