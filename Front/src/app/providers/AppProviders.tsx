import type { PropsWithChildren } from 'react';

import { AuthProvider } from '@/app/providers/AuthProvider';

type AppProvidersProps = PropsWithChildren;

export function AppProviders({ children }: AppProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
