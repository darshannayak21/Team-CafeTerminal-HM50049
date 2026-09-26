import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'paper' | 'cream';
  borderAccent?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'paper',
  borderAccent = false
}) => {
  return (
    <div
      className={cn(
        'border border-hairline rounded-xl shadow-sm',
        variant === 'paper' ? 'bg-canvas' : 'bg-surface-pearl',
        borderAccent && 'border-t-2 border-t-primary',
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  badge,
  action,
  className
}) => {
  return (
    <div
      className={cn(
        'px-5 py-4 border-b border-hairline flex items-center justify-between gap-3 bg-canvas/50 rounded-t-xl',
        className
      )}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-[17px] font-semibold text-ink tracking-[-0.374px]">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-[13px] text-ink-muted-80 font-normal tracking-[-0.08px] leading-[1.3]">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center">{action}</div>}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
  noPadding = false
}) => {
  return (
    <div className={cn(!noPadding && 'p-3.5', className)}>
      {children}
    </div>
  );
};
