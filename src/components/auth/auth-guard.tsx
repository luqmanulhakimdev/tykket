'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

const subscribe = () => () => {};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, isLoading } = useAuth();

  // Safely check if rendered on the client without cascading render
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (isClient && !isLoading) {
      const stored = localStorage.getItem('tykket_auth_token');
      if (!token && !stored) {
        router.replace('/login');
      }
    }
  }, [isClient, token, isLoading, router]);

  // Loading state during SSR or auth verification
  if (!isClient || isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-3 select-none">
        <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-md tracking-wider animate-pulse">
          TY
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Loader2 size={14} className="animate-spin text-primary" />
          <span>Authenticating workspace session...</span>
        </div>
      </div>
    );
  }

  const hasToken =
    token || (typeof window !== 'undefined' && localStorage.getItem('tykket_auth_token'));

  if (!hasToken) {
    return null;
  }

  return <>{children}</>;
}
