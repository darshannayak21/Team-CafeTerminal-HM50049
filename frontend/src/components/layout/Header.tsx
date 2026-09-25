import React from 'react';
import { Badge } from '@/components/ui/Badge';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-[#D9D0C4] bg-[#18324A] text-[#FAF8F3] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Main Operational Title & Clear Information Hierarchy */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#B66F55] shrink-0 self-start mt-1.5" aria-hidden="true" />
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-serif font-bold text-[#FAF8F3] tracking-normal leading-tight">
              Flood Hazard & Response Intelligence Dashboard
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#8FAFC2] font-sans">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#8FAFC2]/90 font-medium">
                Console HM-50049
              </span>
              <span className="text-[#557A95]">/</span>
              <span>
                Operational State: <strong className="text-[#FAF8F3] font-medium font-mono text-[12px]">Milestone 1 — Foundation</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Operational Status & Prototype Notice */}
        <div className="flex items-center gap-3 ml-auto">
          <Badge variant="PROTOTYPE" size="sm">
            Prototype Mode
          </Badge>

          <div className="hidden md:flex items-center border border-[#557A95] bg-[#273038] px-2.5 py-1 text-xs font-mono text-[#8FAFC2]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8FAFC2] mr-2" aria-hidden="true" />
            2026-09-25 · IST
          </div>
        </div>
      </div>
    </header>
  );
};
