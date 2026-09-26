import React from 'react';

interface LoadingStateProps {
  message?: string;
  detail?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Synchronizing Operational Telemetry...',
  detail = 'Resolving spatial polygons and risk sector indicators',
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`bg-surface-pearl rounded-xl border border-hairline p-8 flex flex-col items-center justify-center text-center space-y-4 select-none shadow-sm ${className}`}
    >
      <div className="relative w-12 h-12 flex items-center justify-center mb-2">
        <div className="w-8 h-8 border-[3px] border-ink-muted-48 border-t-transparent rounded-full animate-spin" />
      </div>

      <div className="space-y-2 max-w-sm">
        <div className="text-[17px] font-semibold text-ink tracking-[-0.374px]">
          {message}
        </div>
        <p className="text-[14px] font-normal text-ink-muted-80 leading-[1.43] tracking-[-0.224px]">
          {detail}
        </p>
      </div>
    </div>
  );
};
