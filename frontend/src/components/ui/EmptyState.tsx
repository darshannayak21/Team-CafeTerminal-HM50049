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
      className="border border-[#D9D0C4] bg-[#FAF8F3] p-5 text-center flex flex-col items-center justify-center space-y-3.5 select-none"
    >
      {/* Editorial Cartographic Crosshair Icon */}
      <div className="w-12 h-12 border border-[#D9D0C4] bg-[#F3EEE5] flex items-center justify-center relative">
        <div className="w-2.5 h-2.5 bg-[#8A624E]" />
        <span className="absolute top-1 left-1.5 text-[9px] font-mono text-[#68747B]">+</span>
        <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-[#68747B]">+</span>
      </div>

      <div className="max-w-xs space-y-1">
        <h3 className="font-serif font-bold text-sm text-[#18324A] uppercase tracking-wide">
          {title}
        </h3>
        <p className="font-sans text-xs text-[#68747B] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Suggested next operational actions */}
      <div className="w-full border-t border-[#D9D0C4]/70 pt-3 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#654536] font-semibold">
          Recommended Next Action
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          {onSelectDefault && (
            <Button variant="primary" size="sm" onClick={onSelectDefault}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="text-[10px] font-mono text-[#68747B]">
        Single source of truth: Map ↔ Queue ↔ Chain
      </div>
    </div>
  );
};
