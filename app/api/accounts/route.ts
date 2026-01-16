import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, baseCurrency } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Account name is required' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existingAccount = await prisma.account.findFirst();

    if (existingAccount) {
      // Return existing account instead of creating a new one
      return NextResponse.json(existingAccount);
    }

    const account = await prisma.account.create({
      data: {
        name,
        baseCurrency: baseCurrency || 'EUR',
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
