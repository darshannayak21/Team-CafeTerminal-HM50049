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
  CRITICAL: 'bg-[#F3EEE5] text-[#B66F55] border-[#B66F55] font-semibold',
  HIGH: 'bg-[#F3EEE5] text-[#8A624E] border-[#8A624E] font-semibold',
  MODERATE: 'bg-[#FAF8F3] text-[#557A95] border-[#557A95]',
  LOW: 'bg-[#FAF8F3] text-[#18324A] border-[#8FAFC2]',

  // Access status
  ACCESSIBLE: 'bg-[#FAF8F3] text-[#18324A] border-[#8FAFC2]',
  AT_RISK: 'bg-[#F3EEE5] text-[#8A624E] border-[#8A624E]',
  ISOLATED: 'bg-[#F3EEE5] text-[#B66F55] border-[#B66F55] font-semibold',

  // Response Urgency (Milestone 4)
  IMMEDIATE: 'bg-[#F3EEE5] text-[#B66F55] border-[#B66F55] font-bold tracking-wider',
  ELEVATED: 'bg-[#F3EEE5] text-[#8A624E] border-[#8A624E] font-medium tracking-wider',
  ROUTINE: 'bg-[#FAF8F3] text-[#557A95] border-[#557A95] tracking-wider',

  // Historical / Replay state
  REPLAY: 'bg-[#F3EEE5] text-[#654536] border-[#654536] font-mono tracking-wider font-semibold',

  // System & Context badges
  PROTOTYPE: 'bg-[#F3EEE5] text-[#654536] border-[#8A624E] border-dashed font-mono tracking-wider',
  DEFAULT: 'bg-[#FAF8F3] text-[#273038] border-[#D9D0C4]',
  MUTED: 'bg-[#F3EEE5] text-[#68747B] border-[#D9D0C4]',
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
        'inline-flex items-center gap-1 border uppercase tracking-wide transition-none select-none font-mono',
        sizeClasses,
        variantStyles[variant] || variantStyles.DEFAULT,
        className
      )}
    >
      {children}
    </span>
  );
};
