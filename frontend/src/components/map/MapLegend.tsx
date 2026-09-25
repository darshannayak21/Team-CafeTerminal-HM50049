import React from 'react';

export const MapLegend: React.FC = () => {
  return (
    <div 
      aria-label="Map Hazard Legend"
      className="border border-[#D9D0C4] bg-[#FAF8F3]/95 text-[#273038] p-3 shadow-none text-xs font-sans select-none backdrop-blur-none"
    >
      <div className="flex items-center justify-between border-b border-[#D9D0C4] pb-1.5 mb-2 gap-4">
        <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#18324A]">
          Hazard Risk Zones
        </span>
        <span className="text-[10px] font-mono text-[#68747B] uppercase">
          Prototype
        </span>
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span 
            className="w-3.5 h-3.5 border border-[#B66F55] shrink-0" 
            style={{ backgroundColor: 'rgba(182, 111, 85, 0.45)' }} 
            aria-hidden="true"
          />
          <span className="font-sans text-[#273038]">Critical (Score &gt; 0.85)</span>
        </div>

        <div className="flex items-center gap-2">
          <span 
            className="w-3.5 h-3.5 border border-[#8A624E] shrink-0" 
            style={{ backgroundColor: 'rgba(138, 98, 78, 0.40)' }} 
            aria-hidden="true"
          />
          <span className="font-sans text-[#273038]">High (0.70 – 0.85)</span>
        </div>

        <div className="flex items-center gap-2">
          <span 
            className="w-3.5 h-3.5 border border-[#557A95] shrink-0" 
            style={{ backgroundColor: 'rgba(85, 122, 149, 0.35)' }} 
            aria-hidden="true"
          />
          <span className="font-sans text-[#273038]">Moderate (0.50 – 0.69)</span>
        </div>

        <div className="flex items-center gap-2">
          <span 
            className="w-3.5 h-3.5 border border-[#18324A] shrink-0" 
            style={{ backgroundColor: 'rgba(143, 175, 194, 0.30)' }} 
            aria-hidden="true"
          />
          <span className="font-sans text-[#273038]">Low (&lt; 0.50)</span>
        </div>
      </div>

      <div className="border-t border-[#D9D0C4] mt-2.5 pt-1.5 text-[10px] text-[#68747B] flex items-center justify-between font-sans">
        <span>Click polygon to inspect telemetry</span>
        <span className="font-mono text-[#8A624E]">WGS84</span>
      </div>
    </div>
  );
};
