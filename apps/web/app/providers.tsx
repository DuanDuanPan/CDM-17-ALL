'use client';

import { Suspense } from 'react';
import { ToastProvider, ConfirmDialogProvider } from '@cdm/ui';
import { AppLibraryProvider, UserProvider, type CurrentUser } from '../contexts';

interface ProvidersProps {
  children: React.ReactNode;
  initialUser?: CurrentUser | null;
}

export function Providers({ children, initialUser }: ProvidersProps) {
  return (
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
  );
}
