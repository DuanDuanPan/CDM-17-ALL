'use client';

import { ToastProvider, ConfirmDialogProvider } from '@cdm/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        {children}
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
