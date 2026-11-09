import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Toaster } from '@/components/ui/sonner';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-background text-foreground relative overflow-hidden select-none">
      {/* Subtle Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Header */}
      <header className="h-16 px-8 flex items-center justify-between relative z-10">
        <Link href="/login" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform tracking-wider">
            TY
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">
            Tykket
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Centered Auth Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground relative z-10 border-t border-border/40">
        <p>Tykket &copy; 2026 &bull; High-Performance Issue Tracking Suite</p>
      </footer>

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
