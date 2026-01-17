import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get all suppliers for the account
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        accountId: session.user.accountId,
      },
      include: {
        _count: {
          select: {
            invoices: true,
            items: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// Create a new supplier
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, address, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    // Check for existing supplier with same name (case-insensitive)
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        accountId: session.user.accountId,
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existingSupplier) {
      return NextResponse.json(
        { error: 'A supplier with this name already exists', existingSupplier },
        { status: 409 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        accountId: session.user.accountId,
      },
      include: {
        _count: {
          select: {
            invoices: true,
            items: true,
          },
        },
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
