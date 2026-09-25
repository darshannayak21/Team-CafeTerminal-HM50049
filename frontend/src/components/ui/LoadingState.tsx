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
      className={`border border-[#D9D0C4] bg-[#F3EEE5]/80 p-5 flex flex-col items-center justify-center text-center space-y-3 select-none ${className}`}
    >
      {/* Editorial Reticle Pulsing Animation */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#18324A] border-t-transparent animate-spin" />
        <div className="absolute w-2 h-2 bg-[#B66F55]" />
      </div>

      <div className="space-y-1">
        <div className="font-serif font-bold text-xs uppercase tracking-wider text-[#18324A]">
          {message}
        </div>
        <p className="font-sans text-[11px] text-[#654536] max-w-xs leading-snug">
          {detail}
        </p>
      </div>

      <div className="font-mono text-[10px] text-[#68747B] border-t border-[#D9D0C4] pt-2">
        Prototype local synchronization · no backend delay
      </div>
    </div>
  );
};
