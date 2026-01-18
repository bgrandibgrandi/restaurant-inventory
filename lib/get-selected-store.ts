import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './db';

export interface SelectedStore {
  id: string;
  name: string;
  color: string | null;
}

export interface UserWithStore {
  id: string;
  accountId: string;
  selectedStoreId: string | null;
  selectedStore: SelectedStore | null;
}

/**
 * Get the current user's selected store from the session
 * Returns null if no store is selected
 */
export async function getSelectedStore(): Promise<SelectedStore | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
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

  return user?.selectedStore || null;
}

/**
 * Get the current user with their selected store info
 * Useful for API routes that need both user and store context
 */
export async function getUserWithStore(): Promise<UserWithStore | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      accountId: true,
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

  return user;
}

/**
 * Require a selected store - throws if none selected
 * Use this in API routes that require store context
 */
export async function requireSelectedStore(): Promise<SelectedStore> {
  const store = await getSelectedStore();

  if (!store) {
    throw new Error('No store selected');
  }

  return store;
}
