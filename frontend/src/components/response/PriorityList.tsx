'use client';

import React from 'react';
import { TalukaDistrict } from '@/types/prototype';

interface PriorityListProps {
  districts: TalukaDistrict[];
  selectedDistrictId: string;
  onSelectDistrict: (id: string) => void;
}

export const PriorityList: React.FC<PriorityListProps> = ({
  districts,
  selectedDistrictId,
  onSelectDistrict,
}) => {
  const getSeverityBadge = (level: TalukaDistrict['riskLevel']) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-[#ff3b30] text-white';
      case 'HIGH':
        return 'bg-[#ff9500] text-white';
      case 'MODERATE':
        return 'bg-[#ffcc00] text-ink';
      default:
        return 'bg-canvas-parchment border border-hairline text-ink-muted-80';
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-pearl border-r border-hairline">
      {/* Header */}
      <div className="p-5 bg-surface-pearl border-b border-hairline">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-[17px] font-semibold tracking-[-0.374px] text-ink">
            Priority Areas
          </h2>
          <span className="text-[10px] font-normal tracking-[-0.08px] px-2 py-1 border border-hairline bg-canvas text-ink-muted-80 uppercase rounded-sm">
            Live Triage
          </span>
        </div>
        <p className="text-[13px] text-ink-muted-48 tracking-[-0.08px] leading-[1.3]">
          Operational triage queue ordered by hazard risk score
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-divider-soft scrollbar-none">
        {districts.map((d) => {
          const isSelected = d.id === selectedDistrictId;

          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelectDistrict(d.id)}
              className={`w-full text-left p-5 transition-colors cursor-pointer flex flex-col gap-3 ${
                isSelected
                  ? 'bg-canvas border-l-2 border-l-primary'
                  : 'hover:bg-canvas/50 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-ink-muted-48">
                    0{d.rank}
                  </span>
                  <span className="text-[17px] font-semibold tracking-[-0.374px] text-ink">
                    {d.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wide rounded-sm ${getSeverityBadge(
                    d.riskLevel
                  )}`}
                >
                  {d.riskLevel}
                </span>
              </div>

              <div className="flex items-center justify-between text-[13px] font-normal tracking-[-0.08px]">
                <div className="flex items-center gap-1.5 text-ink-muted-80">
                  <span>Hazard Score:</span>
                  <strong className="text-ink font-semibold">
                    {d.hazardScore.toFixed(2)}
                  </strong>
                </div>
                <div className="text-ink-muted-80">
                  {d.affectedPopulation.toLocaleString()} affected
                </div>
              </div>

              <div className="flex items-center gap-3 text-[12px] font-normal tracking-[-0.12px] text-ink-muted-48 pt-2 border-t border-hairline">
                <span>{d.atRiskRoadsCount} At-risk roads</span>
                <span>•</span>
                <span className={d.disruptedRoadsCount > 0 ? 'text-[#ff3b30] font-medium' : ''}>
                  {d.disruptedRoadsCount} Disrupted
                </span>
                <span>•</span>
                <span>Rain: {d.rainfall24h}mm / 24h</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

