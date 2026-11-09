'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Demo accounts seeded in Go backend (tykket-go/cmd/seed/main.go)
export const DEMO_ACCOUNTS = [
  {
    id: 'owner',
    name: 'Alex Mercer',
    email: 'owner@tykket.dev',
    role: 'Project Owner',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
  },
  {
    id: 'admin',
    name: 'Sarah Connor',
    email: 'admin@tykket.dev',
    role: 'Project Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&auto=format&fit=crop&q=80',
  },
  {
    id: 'member',
    name: 'David Kim',
    email: 'member@tykket.dev',
    role: 'Lead Engineer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
  },
  {
    id: 'viewer',
    name: 'Emma Watson',
    email: 'viewer@tykket.dev',
    role: 'Stakeholder / Viewer',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&auto=format&fit=crop&q=80',
  },
];

export default function LoginPage() {
  const { login, loginDemo, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loggingInDemoId, setLoggingInDemoId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    await login(email.trim(), password);
    setSubmitting(false);
  };

  const handleDemoLogin = async (demo: typeof DEMO_ACCOUNTS[number]) => {
    setLoggingInDemoId(demo.id);
    setEmail(demo.email);
    setPassword('password123');
    await loginDemo(demo.email, 'password123');
    setLoggingInDemoId(null);
  };

  return (
    <Card className="border-border/80 shadow-2xl bg-card/90 backdrop-blur-md">
      <CardHeader className="space-y-1 text-center pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          Sign In to Tykket
        </CardTitle>
        <CardDescription className="text-xs">
          Developer-first issue tracking connected to live Go backend (:8081)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick 1-Click Demo Profiles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-primary">
              <Zap size={13} className="fill-primary" />
              1-Click Demo Accounts (Live Backend)
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">Click to sign in</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                disabled={loggingInDemoId !== null || submitting || isLoading}
                onClick={() => handleDemoLogin(account)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border border-border/80 hover:border-primary hover:bg-muted/60 transition-all text-left group cursor-pointer disabled:opacity-60',
                  loggingInDemoId === account.id && 'ring-2 ring-primary border-primary bg-primary/5'
                )}
              >
                <div className="relative shrink-0">
                  <Avatar size="sm" className="h-7 w-7 ring-1 ring-border">
                    <AvatarImage src={account.avatarUrl} alt={account.name} />
                    <AvatarFallback className="text-[10px] font-semibold">{account.name[0]}</AvatarFallback>
                  </Avatar>
                  {loggingInDemoId === account.id && (
                    <span className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                      <Loader2 size={12} className="animate-spin text-primary" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-tight truncate group-hover:text-primary transition-colors">
                    {account.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {account.role}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-card px-2 text-muted-foreground font-semibold">
              Or with email credentials
            </span>
          </div>
        </div>

        {/* Traditional Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Work Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                Password
              </label>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="h-9 text-xs font-mono"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-9 text-xs font-semibold mt-2 cursor-pointer"
            disabled={submitting || isLoading || loggingInDemoId !== null || !email || !password}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Sign In
                <ArrowRight size={14} />
              </span>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-2 text-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1 text-[11px]">
          <span>Don&apos;t have an account?</span>
          <Link
            href="/register"
            className="text-primary font-semibold hover:underline cursor-pointer"
          >
            Create account
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/80 bg-muted/30 py-1.5 px-3 rounded-md w-full border border-border/40">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>Connected to Go Backend REST API at http://localhost:8081</span>
        </div>
      </CardFooter>
    </Card>
  );
}
