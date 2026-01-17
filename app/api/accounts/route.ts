import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Get current user's account
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: session.user.accountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

// Create a new account (for onboarding - only when user has no account)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // If user already has an account, return it
    if (session?.user?.accountId) {
      const existingAccount = await prisma.account.findUnique({
        where: { id: session.user.accountId },
      });
      if (existingAccount) {
        return NextResponse.json(existingAccount);
      }
    }

    const body = await request.json();
    const { name, baseCurrency } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Account name is required' },
        { status: 400 }
      );
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
