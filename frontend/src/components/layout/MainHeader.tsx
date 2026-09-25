'use client';

import React from 'react';
import Link from 'next/link';

interface MainHeaderProps {
  currentArea?: string;
  isResponseView?: boolean;
}

export const MainHeader: React.FC<MainHeaderProps> = ({
  currentArea = 'Pune District',
  isResponseView = false,
}) => {
  return (
    <header className="border-b border-[#D9D0C4] bg-[#18324A] text-[#FAF8F3] select-none">
      {/* Top persistent Simulation Mode banner */}
      <div className="bg-[#273038] border-b border-[#18324A] px-4 py-1 text-xs font-mono text-[#FAF8F3] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#B66F55] animate-pulse" aria-hidden="true" />
          <span className="tracking-wider uppercase font-semibold text-[11px] text-[#FAF8F3]">
            SIMULATION MODE · PROTOTYPE DATA DEMONSTRATION
          </span>
        </div>
        <div className="text-[11px] text-[#8FAFC2]">
          HackMatrix 5.0 · Not Live Operational Stream
        </div>
      </div>

      {/* Main navigation row */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Descriptor */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-[#B66F55] shrink-0" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-2">
              <Link href="/" className="font-serif font-bold text-lg md:text-xl tracking-tight text-[#FAF8F3] hover:text-[#F3EEE5]">
                RAINGUARD
              </Link>
              <span className="text-[#557A95] text-xs">|</span>
              <span className="text-xs uppercase tracking-wider text-[#8FAFC2] font-mono">
                Disaster Response Intelligence
              </span>
            </div>
            <div className="text-xs text-[#8FAFC2]/90 font-sans mt-0.5 flex items-center gap-2">
              <span>Operating Area:</span>
              <strong className="text-[#FAF8F3] font-medium">{currentArea}</strong>
            </div>
          </div>
        </div>

        {/* Right: View switcher & indicators */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {isResponseView ? (
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-mono font-medium border border-[#8FAFC2]/50 bg-[#273038] text-[#FAF8F3] hover:bg-[#18324A] hover:border-[#FAF8F3] transition-colors flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Public / Field View</span>
            </Link>
          ) : (
            <Link
              href="/response"
              className="px-3 py-1.5 text-xs font-mono font-medium border border-[#B66F55] bg-[#B66F55]/20 text-[#FAF8F3] hover:bg-[#B66F55] hover:text-[#FAF8F3] transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-[#B66F55]" />
              <span>Response Intelligence Portal</span>
              <span>→</span>
            </Link>
          )}

          <div className="hidden md:flex items-center border border-[#557A95] bg-[#273038] px-2.5 py-1 text-xs font-mono text-[#8FAFC2]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8FAFC2] mr-2" aria-hidden="true" />
            <span>WGS-84 / EPSG:4326</span>
          </div>
        </div>
      </div>
    </header>
  );
};
