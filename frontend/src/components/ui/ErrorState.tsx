import React from 'react';
import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Operational Warning: Telemetry Unavailable',
  message = 'Failed to synchronize local geospatial coordinates for the active sector. Operational indicators may be incomplete.',
  actionLabel = 'Reset to District Baseline',
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="border border-red-500/20 bg-[#fff5f5] rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-4 select-none shadow-sm"
    >
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
        <span className="text-[20px] font-bold text-red-500">!</span>
      </div>

      <div className="max-w-sm space-y-2">
        <h3 className="text-[17px] font-semibold text-red-600 tracking-[-0.374px]">
          {title}
        </h3>
        <p className="text-[14px] font-normal text-red-600/80 leading-[1.43] tracking-[-0.224px]">
          {message}
        </p>
      </div>

      <div className="w-full max-w-sm pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        {onAction && (
          <Button variant="terracotta" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="secondary" size="md" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
