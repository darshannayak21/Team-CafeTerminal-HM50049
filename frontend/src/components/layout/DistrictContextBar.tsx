'use client';

import React from 'react';
import { PUNE_DISTRICT_CONTEXT } from '@/data/fixtureData';

interface DistrictContextBarProps {
  selectedTaluka: string;
  onSelectTaluka: (taluka: string) => void;
}

export const DistrictContextBar: React.FC<DistrictContextBarProps> = ({
  selectedTaluka,
  onSelectTaluka
}) => {
  return (
    <section 
      aria-label="Geographic District Context"
      className="border-b border-[#D9D0C4] bg-[#F3EEE5] px-4 py-2 text-[#273038]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        {/* District & Coordinate Bounds */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[#68747B]">
              Jurisdiction:
            </span>
            <span className="font-semibold text-[#18324A]">
              {PUNE_DISTRICT_CONTEXT.districtName}, {PUNE_DISTRICT_CONTEXT.state}
            </span>
          </div>

          <div className="hidden sm:inline-block text-[#D9D0C4]">•</div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[#68747B]">
              Center:
            </span>
            <span className="font-mono text-[#273038]">
              {PUNE_DISTRICT_CONTEXT.center.lat.toFixed(4)}°N, {PUNE_DISTRICT_CONTEXT.center.lon.toFixed(4)}°E
            </span>
          </div>

          <div className="hidden md:inline-block text-[#D9D0C4]">•</div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[#68747B]">
              Extent:
            </span>
            <span className="font-mono text-[#654536]">
              [{PUNE_DISTRICT_CONTEXT.bounds.south}°N–{PUNE_DISTRICT_CONTEXT.bounds.north}°N, {PUNE_DISTRICT_CONTEXT.bounds.west}°E–{PUNE_DISTRICT_CONTEXT.bounds.east}°E]
            </span>
          </div>
        </div>

        {/* Taluka Selector & Hazard Classification */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto ml-auto">
          <label htmlFor="taluka-filter" className="text-[11px] uppercase tracking-wider text-[#68747B] shrink-0">
            Taluka Scope:
          </label>
          <select
            id="taluka-filter"
            value={selectedTaluka}
            onChange={(e) => onSelectTaluka(e.target.value)}
            className="border border-[#D9D0C4] bg-[#FAF8F3] text-[#273038] px-2 py-1 text-xs font-mono focus:border-[#557A95] focus:outline-none"
          >
            {PUNE_DISTRICT_CONTEXT.talukas.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
};
