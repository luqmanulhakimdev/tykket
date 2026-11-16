import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  priority?: boolean;
}

export function TykketLogo({
  size = 32,
  className,
  showText = false,
  priority = false,
}: LogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <Image
        src="/logo.png"
        alt="Tykket"
        width={size}
        height={size}
        priority={priority}
        className="rounded-lg shrink-0 object-contain drop-shadow-xs"
      />
      {showText && (
        <span className="font-bold text-base tracking-tight text-foreground">
          Tykket
        </span>
      )}
    </div>
  );
}

