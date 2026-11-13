import React, { Suspense } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { IssueModal } from '@/components/issues/issue-modal';
import { GlobalCommandPalette } from '@/components/shared/command-palette';
import { GlobalShortcuts } from '@/components/shared/global-shortcuts';
import { ShortcutsDialog } from '@/components/shared/shortcuts-dialog';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-background" />}>
      <AuthGuard>
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground antialiased selection:bg-primary/20">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
            <Header />
            <main className="flex-1 overflow-hidden relative flex flex-col">
              <Suspense fallback={<div className="flex-1 bg-background" />}>
                {children}
              </Suspense>
            </main>
          </div>
        </div>
        <GlobalShortcuts />
        <ShortcutsDialog />
        <GlobalCommandPalette />
        <IssueModal />
        <Toaster position="bottom-right" richColors closeButton />
      </AuthGuard>
    </Suspense>
  );
}
