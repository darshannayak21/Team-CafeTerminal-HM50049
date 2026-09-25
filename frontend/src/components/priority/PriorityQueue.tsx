import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { ResponsePriorityItem } from '@/types/priority';

interface PriorityQueueProps {
  items: ResponsePriorityItem[];
  selectedRiskAreaId: string | null;
  onSelectRiskArea: (id: string | null) => void;
  activeTaluka?: string;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  items,
  selectedRiskAreaId,
  onSelectRiskArea,
  activeTaluka = 'All Talukas',
}) => {
  // Filter items if activeTaluka is scoped
  const filteredItems = items.filter((item) => {
    if (activeTaluka === 'All Talukas') return true;
    return item.taluka.toLowerCase() === activeTaluka.toLowerCase();
  });

  return (
    <div className="space-y-3 font-sans text-xs text-[#273038]">
      {/* Priority Queue Tactical Header */}
      <div className="border border-[#D9D0C4] bg-[#F3EEE5] p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-[#18324A]">
            Response Dispatch Queue
          </span>
          <span className="font-mono text-[10px] text-[#654536] uppercase font-semibold">
            {filteredItems.length} Target{filteredItems.length !== 1 ? 's' : ''} Ranked
          </span>
        </div>
        <p className="text-[11px] text-[#68747B] leading-snug">
          Synthesized decision rankings integrating hazard severity, demographic exposure, and transit isolation. Selecting an item synchronizes the map, impact chain, and road-risk layers.
        </p>
      </div>

      {filteredItems.length === 0 ? (
        <div className="border border-[#D9D0C4] bg-[#FAF8F3] p-4 text-center text-xs text-[#68747B] italic">
          No prioritized targets match the active scope ({activeTaluka}).
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            const isSelected = selectedRiskAreaId === item.riskAreaId;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRiskArea(isSelected ? null : item.riskAreaId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRiskArea(isSelected ? null : item.riskAreaId);
                  }
                }}
                className={`border text-left p-3 transition-none cursor-pointer space-y-2 select-none ${
                  isSelected
                    ? 'border-[#18324A] bg-[#FAF8F3] shadow-xs ring-1 ring-[#18324A]'
                    : 'border-[#D9D0C4] bg-[#FAF8F3] hover:bg-[#F3EEE5]/40'
                }`}
              >
                {/* Header row: Rank, Settlement, Urgency, Risk */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        item.urgency === 'IMMEDIATE'
                          ? 'bg-[#B66F55] text-[#FAF8F3]'
                          : item.urgency === 'ELEVATED'
                          ? 'bg-[#8A624E] text-[#FAF8F3]'
                          : 'bg-[#557A95] text-[#FAF8F3]'
                      }`}
                    >
                      #{item.rank}
                    </span>
                    <div>
                      <div className="font-serif font-bold text-[13px] text-[#18324A] leading-tight">
                        {item.settlementName}
                      </div>
                      <div className="text-[11px] text-[#68747B] font-mono">
                        {item.taluka} Taluka · {item.riskAreaName}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={item.urgency} size="sm">
                      {item.urgency}
                    </Badge>
                    <span className="font-mono text-[10px] text-[#68747B]">
                      Score: <strong className="text-[#18324A]">{item.priorityScore.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                {/* Demographic & Road Context Strip */}
                <div className="grid grid-cols-2 gap-2 border-t border-[#D9D0C4]/60 pt-2 text-[11px] font-mono">
                  <div>
                    <span className="text-[10px] uppercase text-[#68747B] block">Exposed Pop.</span>
                    <strong className="text-[#18324A]">
                      {item.population.toLocaleString()}
                    </strong>{' '}
                    <span className="text-[#68747B]">({item.affectedHouseholds.toLocaleString()} HH)</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-[#68747B] block">Transit Status</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] uppercase px-1 py-0.2 border font-bold ${
                          item.roadStatus === 'CONFIRMED BLOCKED'
                            ? 'text-[#B66F55] border-[#B66F55]'
                            : item.roadStatus === 'AT RISK'
                            ? 'text-[#8A624E] border-[#8A624E]'
                            : item.roadStatus === 'NO_DATA'
                            ? 'text-[#68747B] border-[#D9D0C4]'
                            : 'text-[#557A95] border-[#557A95]'
                        }`}
                      >
                        {item.roadStatus === 'NO_DATA' ? 'NO ROAD DATA' : item.roadStatus}
                      </span>
                      {item.primaryRoadName && (
                        <span className="text-[10px] text-[#273038] truncate max-w-[110px]" title={item.primaryRoadName}>
                          {item.primaryRoadName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Rationale & Action */}
                <div className="border-t border-[#D9D0C4]/60 pt-1.5 space-y-1 text-xs">
                  <p className="text-[11px] font-sans text-[#654536] italic leading-snug">
                    <strong className="not-italic text-[#18324A] font-semibold">Rationale: </strong>
                    {item.primaryRationale}
                  </p>
                  <p className="text-[11px] font-sans text-[#273038] leading-snug">
                    <strong className="text-[#18324A] font-semibold">Recommended Action: </strong>
                    {item.recommendedAction}
                  </p>
                </div>

                {/* Active Indicator & Sync prompt */}
                <div className="flex items-center justify-between border-t border-[#D9D0C4]/40 pt-1.5 text-[10px] font-mono text-[#68747B]">
                  <span>
                    {isSelected ? (
                      <strong className="text-[#18324A]">Active Focus on Map &amp; Impact Chain</strong>
                    ) : (
                      'Click to focus sector &amp; view chain'
                    )}
                  </span>
                  <span className="text-[#8A624E]">
                    {isSelected ? 'Selected ✓' : 'Inspect →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
