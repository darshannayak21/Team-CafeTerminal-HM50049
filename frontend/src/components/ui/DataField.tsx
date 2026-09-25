import React from 'react';
import { cn } from '@/lib/utils';

interface DataFieldProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  detail?: string;
  className?: string;
  valueClassName?: string;
}

export const DataField: React.FC<DataFieldProps> = ({
  label,
  value,
  unit,
  detail,
  className,
  valueClassName
}) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-[10px] uppercase font-mono tracking-wider text-[#68747B]">
        {label}
      </span>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={cn('text-sm font-mono font-bold text-[#273038]', valueClassName)}>
          {value}
        </span>
        {unit && (
          <span className="text-[11px] font-mono text-[#68747B]">
            {unit}
          </span>
        )}
      </div>
      {detail && (
        <span className="text-[10px] text-[#8A624E] font-mono mt-0.5">
          {detail}
        </span>
      )}
    </div>
  );
};
