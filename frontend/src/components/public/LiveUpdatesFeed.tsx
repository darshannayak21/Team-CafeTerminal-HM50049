'use client';

import React from 'react';
import { SimulatedUpdate } from '@/types/prototype';
import { PROTOTYPE_LIVE_UPDATES } from '@/data/prototype';

interface LiveUpdatesFeedProps {
  updates?: SimulatedUpdate[];
  title?: string;
  maxItems?: number;
}

export const LiveUpdatesFeed: React.FC<LiveUpdatesFeedProps> = ({
  updates = PROTOTYPE_LIVE_UPDATES,
  title = 'Live Updates',
  maxItems = 5,
}) => {
  const displayItems = updates.slice(0, maxItems);

  const getSeverityColor = (severity: SimulatedUpdate['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-[#ff3b30]';
      case 'HIGH':
        return 'text-[#ff9500]';
      case 'MODERATE':
        return 'text-[#ffcc00]';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className="frosted-glass rounded-lg border border-hairline shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-hairline flex items-center justify-between bg-canvas/40">
        <h3 className="text-[17px] font-semibold tracking-[-0.374px] text-ink">
          {title}
        </h3>
        <span className="text-[10px] font-normal tracking-[-0.08px] px-2 py-1 bg-surface-pearl border border-hairline text-ink-muted-80 rounded-sm uppercase">
          Simulated
        </span>
      </div>

      <div className="divide-y divide-divider-soft max-h-48 overflow-y-auto scrollbar-none">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="px-6 py-4 hover:bg-canvas/40 transition-colors flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[12px] font-semibold tracking-[-0.12px] ${getSeverityColor(item.severity)}`}>
                  {item.severity}
                </span>
                <span className="text-[12px] text-ink-muted-48">•</span>
                <span className="text-[12px] text-ink-muted-80">{item.time}</span>
              </div>
              <span className="text-[12px] text-ink-muted-48">{item.location}</span>
            </div>
            <div className="text-[14px] text-ink leading-[1.43] tracking-[-0.224px] mt-1">
              {item.eventDescription}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
