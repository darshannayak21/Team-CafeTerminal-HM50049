import React, { useState } from 'react';

export const MapLegend: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <div
      aria-label="Map Hazard Legend"
      className="border border-[#D9D0C4] bg-[#FAF8F3]/95 text-[#273038] shadow-none text-xs font-sans select-none"
    >
      {/* Legend Header & Collapse Toggle */}
      <div className="flex items-center justify-between p-2.5 bg-[#F3EEE5]/80 border-b border-[#D9D0C4] gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#B66F55]" aria-hidden="true" />
          <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#18324A]">
            Carto Legend
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#68747B] uppercase">Prototype</span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-[11px] font-mono font-bold text-[#654536] hover:text-[#18324A] px-1 py-0.5 border border-[#D9D0C4] bg-[#FAF8F3] cursor-pointer"
            aria-label={isCollapsed ? 'Expand map legend' : 'Collapse map legend'}
            title={isCollapsed ? 'Expand legend' : 'Collapse legend'}
          >
            {isCollapsed ? '+' : '–'}
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      {!isCollapsed && (
        <div className="p-3 space-y-2.5">
          {/* ── Hazard Zones ─────────────────────────────────────── */}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#68747B] block mb-1">
              Hazard Risk Zones
            </span>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 border border-[#B66F55] shrink-0"
                  style={{ backgroundColor: 'rgba(182, 111, 85, 0.45)' }}
                  aria-hidden="true"
                />
                <span className="font-sans text-[#273038]">Critical (&gt; 0.85)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 border border-[#8A624E] shrink-0"
                  style={{ backgroundColor: 'rgba(138, 98, 78, 0.40)' }}
                  aria-hidden="true"
                />
                <span className="font-sans text-[#273038]">High (0.70 – 0.85)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 border border-[#557A95] shrink-0"
                  style={{ backgroundColor: 'rgba(85, 122, 149, 0.35)' }}
                  aria-hidden="true"
                />
                <span className="font-sans text-[#273038]">Moderate (0.50 – 0.69)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 border border-[#18324A] shrink-0"
                  style={{ backgroundColor: 'rgba(143, 175, 194, 0.30)' }}
                  aria-hidden="true"
                />
                <span className="font-sans text-[#273038]">Low (&lt; 0.50)</span>
              </div>
            </div>
          </div>

          {/* ── Settlement Markers ───────────────────────────────── */}
          <div className="border-t border-[#D9D0C4]/70 pt-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#68747B] block mb-1">
              Settlements
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span
                className="w-3 h-3 border-2 border-[#18324A] shrink-0"
                style={{ backgroundColor: '#FAF8F3', borderRadius: '50%' }}
                aria-hidden="true"
              />
              <span className="font-sans text-[#273038]">Active sector location</span>
            </div>
          </div>

          {/* ── Road Status ──────────────────────────────────────── */}
          <div className="border-t border-[#D9D0C4]/70 pt-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#68747B] block mb-1">
              Roadway Status
            </span>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-1.5 shrink-0"
                  style={{ backgroundColor: '#B66F55' }}
                  aria-hidden="true"
                />
                <span className="font-sans text-[#273038]">Confirmed Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-1.5 shrink-0"
                  style={{ backgroundColor: '#8A624E' }}
                  aria-hidden="true"
                />
                <span className="font-sans text-[#273038]">At Risk (Inferred)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-1.5 shrink-0"
                  style={{ backgroundColor: '#557A95' }}
                  aria-hidden="true"
                />
                <span className="font-sans text-[#273038]">Monitoring (Passable)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#D9D0C4] pt-1.5 text-[10px] text-[#68747B] flex items-center justify-between font-sans">
            <span>Click polygon to inspect</span>
            <span className="font-mono text-[#8A624E]">WGS84</span>
          </div>
        </div>
      )}
    </div>
  );
};
