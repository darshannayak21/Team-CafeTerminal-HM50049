import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'terracotta';
  size?: 'sm' | 'md';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'sm', children, disabled, ...props }, ref) => {
    const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs';

    const variantClasses = {
      primary: 'bg-primary text-white hover:bg-primary-focus border-transparent',
      secondary: 'bg-surface-pearl text-ink border-hairline hover:bg-canvas-parchment',
      outline: 'bg-transparent text-ink border-hairline hover:bg-surface-pearl',
      terracotta: 'bg-[#ff3b30] text-white border-transparent hover:bg-[#ff3b30]/90'
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-pill border select-none transition-colors cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses,
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
