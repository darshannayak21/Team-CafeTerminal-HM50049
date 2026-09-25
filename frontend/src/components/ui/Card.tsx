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
        'border border-[#D9D0C4] transition-none',
        variant === 'paper' ? 'bg-[#FAF8F3]' : 'bg-[#F3EEE5]',
        borderAccent && 'border-t-2 border-t-[#18324A]',
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
        'px-3.5 py-2.5 border-b border-[#D9D0C4] flex items-center justify-between gap-2 bg-[#F3EEE5]/60',
        className
      )}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h2 className="font-serif font-bold text-sm text-[#18324A] tracking-normal">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-[#68747B] font-sans mt-0.5 leading-tight">
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
