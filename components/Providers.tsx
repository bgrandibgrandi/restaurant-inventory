'use client';

import { SessionProvider } from 'next-auth/react';
import { AppProviders } from './AppProviders';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppProviders>{children}</AppProviders>
    </SessionProvider>
  );
}
