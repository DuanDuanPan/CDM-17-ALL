'use client';

import { ToastProvider, ConfirmDialogProvider } from '@cdm/ui';
import { AppLibraryProvider } from '../contexts';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <AppLibraryProvider>
          {children}
        </AppLibraryProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
