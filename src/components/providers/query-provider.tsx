'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/auth-context';
import { IssueModalProvider } from '@/context/issue-modal-context';
import { CommandPaletteProvider } from '@/context/command-palette-context';
import { ShortcutsProvider } from '@/context/shortcuts-dialog-context';
import { ThemeProvider } from '@/components/theme/theme-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <IssueModalProvider>
            <CommandPaletteProvider>
              <ShortcutsProvider>{children}</ShortcutsProvider>
            </CommandPaletteProvider>
          </IssueModalProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
