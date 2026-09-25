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
    <div className="flex flex-col h-full bg-[#FAF8F3] border-r border-[#D9D0C4]">
      {/* Header */}
      <div className="p-3.5 bg-[#F3EEE5] border-b border-[#D9D0C4] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#18324A]" />
            <h2 className="font-serif font-bold text-sm tracking-tight uppercase text-[#18324A]">
              Priority Areas
            </h2>
          </div>
          <p className="text-[11px] font-sans text-[#68747B] mt-0.5">
            Operational triage queue ordered by hazard risk score
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 border border-[#D9D0C4] bg-[#FAF8F3] text-[#654536] uppercase font-semibold">
          LIVE TRIAGE
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#D9D0C4]">
        {districts.map((d) => {
          const isSelected = d.id === selectedDistrictId;

          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelectDistrict(d.id)}
              className={`w-full text-left p-3.5 transition-colors cursor-pointer flex flex-col gap-2 ${
                isSelected
                  ? 'bg-[#F3EEE5] border-l-4 border-l-[#B66F55]'
                  : 'hover:bg-[#F3EEE5]/40 border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#68747B]">
                    0{d.rank}
                  </span>
                  <span className="font-serif font-bold text-sm tracking-normal text-[#18324A] uppercase">
                    {d.name}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${getSeverityBadge(
                    d.riskLevel
                  )}`}
                >
                  {d.riskLevel}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-[#68747B]">
                  <span>Hazard Score:</span>
                  <strong className="text-[#18324A] text-xs font-bold">
                    {d.hazardScore.toFixed(2)}
                  </strong>
                </div>
                <div className="text-[11px] text-[#8A624E]">
                  {d.affectedPopulation.toLocaleString()} affected
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono text-[#68747B] pt-1 border-t border-[#D9D0C4]/60">
                <span>{d.atRiskRoadsCount} At-risk roads</span>
                <span>•</span>
                <span className={d.disruptedRoadsCount > 0 ? 'text-[#B66F55] font-semibold' : ''}>
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
