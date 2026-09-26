import React from 'react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onSelectDefault?: () => void;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Risk Sector Selected',
  description = 'Select a hazard polygon on the interactive Pune map or choose a prioritized target from the Response Queue to inspect localized evidence, affected settlements, and road risk.',
  onSelectDefault,
  actionLabel = 'Select Priority #1 Sector',
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div
      role="region"
      aria-label="No risk sector selected"
      className="border border-hairline bg-surface-pearl rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-4 select-none shadow-sm"
    >
      {/* Apple style placeholder icon */}
      <div className="w-14 h-14 rounded-full border border-hairline bg-canvas flex items-center justify-center mb-2">
        <div className="w-3.5 h-3.5 rounded-full bg-ink-muted-48" />
      </div>

      <div className="max-w-sm space-y-2">
        <h3 className="text-[17px] font-semibold text-ink tracking-[-0.374px]">
          {title}
        </h3>
        <p className="text-[14px] font-normal text-ink-muted-80 leading-[1.43] tracking-[-0.224px]">
          {description}
        </p>
      </div>

      {/* Suggested next operational actions */}
      <div className="w-full max-w-sm pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        {onSelectDefault && (
          <Button variant="primary" size="md" onClick={onSelectDefault}>
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
