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
      className="border border-[#B66F55] bg-[#F3EEE5] p-5 text-center flex flex-col items-center justify-center space-y-3.5 select-none"
    >
      {/* Editorial Terracotta Warning Box */}
      <div className="w-10 h-10 border border-[#B66F55] bg-[#FAF8F3] flex items-center justify-center">
        <span className="font-serif font-bold text-base text-[#B66F55]">!</span>
      </div>

      <div className="max-w-xs space-y-1">
        <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#B66F55]">
          {title}
        </h3>
        <p className="font-sans text-xs text-[#273038] leading-relaxed">
          {message}
        </p>
      </div>

      <div className="w-full border-t border-[#D9D0C4] pt-3 flex flex-col sm:flex-row items-center justify-center gap-2">
        {onAction && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" size="sm" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>

      <div className="text-[10px] font-mono text-[#68747B]">
        Prototype error state representation · click action to recover
      </div>
    </div>
  );
};
