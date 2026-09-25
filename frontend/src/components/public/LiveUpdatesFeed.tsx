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
  title = 'LIVE UPDATES',
  maxItems = 5,
}) => {
  const displayItems = updates.slice(0, maxItems);

  const getSeverityBadge = (severity: SimulatedUpdate['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#B66F55] text-[#FAF8F3]';
      case 'HIGH':
        return 'bg-[#8A624E] text-[#FAF8F3]';
      case 'MODERATE':
        return 'bg-[#557A95] text-[#FAF8F3]';
      default:
        return 'bg-[#8FAFC2] text-[#18324A]';
    }
  };

  return (
    <div className="bg-[#FAF8F3] border-t border-[#D9D0C4] text-[#273038] select-none">
      <div className="px-4 py-2 bg-[#F3EEE5] border-b border-[#D9D0C4] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#B66F55] animate-ping" />
          <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#18324A]">
            {title}
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FAF8F3] border border-[#D9D0C4] text-[#654536] uppercase font-semibold">
          SIMULATED EVENT FEED
        </span>
      </div>

      <div className="divide-y divide-[#D9D0C4] max-h-36 overflow-y-auto">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="px-4 py-2 hover:bg-[#F3EEE5]/40 transition-colors flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-[11px] font-bold text-[#18324A] shrink-0">
                {item.time}
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 shrink-0 ${getSeverityBadge(
                  item.severity
                )}`}
              >
                {item.severity}
              </span>
              <span className="font-sans text-[#273038] truncate text-xs">
                {item.eventDescription}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[11px] font-mono text-[#68747B]">
                {item.location}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
