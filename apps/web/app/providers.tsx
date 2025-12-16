'use client';

import { ToastProvider } from '@cdm/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
