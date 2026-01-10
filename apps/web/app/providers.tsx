'use client';

import { Suspense, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider, ConfirmDialogProvider } from '@cdm/ui';
import { AppLibraryProvider, UserProvider, type CurrentUser } from '../contexts';

interface ProvidersProps {
  children: React.ReactNode;
  initialUser?: CurrentUser | null;
}

export function Providers({ children, initialUser }: ProvidersProps) {
  // Story 9.1: Create QueryClient instance for TanStack Query
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmDialogProvider>
          <Suspense fallback={null}>
            <UserProvider initialUser={initialUser}>
              <AppLibraryProvider>
                {children}
              </AppLibraryProvider>
            </UserProvider>
          </Suspense>
        </ConfirmDialogProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
