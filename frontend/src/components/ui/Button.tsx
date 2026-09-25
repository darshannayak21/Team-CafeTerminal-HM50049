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
      primary: 'bg-[#18324A] text-[#FAF8F3] border-[#18324A] hover:bg-[#273038] active:bg-[#18324A]',
      secondary: 'bg-[#FAF8F3] text-[#273038] border-[#D9D0C4] hover:bg-[#F3EEE5] active:bg-[#FAF8F3]',
      outline: 'bg-transparent text-[#654536] border-[#D9D0C4] hover:bg-[#F3EEE5]',
      terracotta: 'bg-[#B66F55] text-[#FAF8F3] border-[#B66F55] hover:bg-[#8A624E]'
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-mono uppercase tracking-wider border select-none transition-none cursor-pointer',
          'focus-visible:outline-2 focus-visible:outline-[#557A95] focus-visible:outline-offset-1',
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
