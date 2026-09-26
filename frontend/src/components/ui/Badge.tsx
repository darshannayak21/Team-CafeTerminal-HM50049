import React from 'react';
import { RiskLevel } from '@/types/hazard';
import { AccessStatus } from '@/types/operational';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | RiskLevel
  | AccessStatus
  | 'IMMEDIATE'
  | 'ELEVATED'
  | 'ROUTINE'
  | 'REPLAY'
  | 'PROTOTYPE'
  | 'DEFAULT'
  | 'MUTED';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  // Risk levels
  CRITICAL: 'bg-[#ff3b30] text-white font-medium',
  HIGH: 'bg-[#ff9500] text-white font-medium',
  MODERATE: 'bg-[#ffcc00] text-ink font-medium',
  LOW: 'bg-surface-pearl border-hairline text-ink',

  // Access status
  ACCESSIBLE: 'bg-surface-pearl border-hairline text-ink',
  AT_RISK: 'bg-[#ff9500] text-white font-medium',
  ISOLATED: 'bg-[#ff3b30] text-white font-medium',

  // Response Urgency (Milestone 4)
  IMMEDIATE: 'bg-[#ff3b30] text-white font-semibold',
  ELEVATED: 'bg-[#ff9500] text-white font-medium',
  ROUTINE: 'bg-surface-pearl border-hairline text-ink-muted-80',

  // Historical / Replay state
  REPLAY: 'bg-canvas-parchment text-ink-muted-80 border border-hairline',

  // System & Context badges
  PROTOTYPE: 'bg-canvas-parchment text-ink-muted-48 border border-hairline border-dashed',
  DEFAULT: 'bg-surface-pearl text-ink border-hairline',
  MUTED: 'bg-canvas text-ink-muted-48 border-hairline',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'DEFAULT',
  size = 'sm',
  className,
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border uppercase tracking-wide rounded-sm select-none',
        sizeClasses,
        variantStyles[variant] || variantStyles.DEFAULT,
        className
      )}
    >
      {children}
    </span>
  );
};
