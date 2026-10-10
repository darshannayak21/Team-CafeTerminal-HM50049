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
    <div className="flex flex-col w-full z-50">
      {/* Global Nav (True Black) */}
      <header className="h-[44px] bg-surface-black text-on-dark px-4 flex items-center justify-between text-[12px] font-normal tracking-[-0.12px]">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-white/90 hover:text-white transition-colors">
            SAHAYAK
          </Link>
          <span className="hidden sm:inline-block text-white/70">
            Disaster Response Intelligence
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-on-dark animate-pulse" />
            <span className="text-white/80">Simulation Mode</span>
          </div>
        </div>
      </header>

      {/* Sub Nav (Frosted Glass) */}
      <div className="h-[52px] frosted-glass sticky top-0 border-b border-hairline px-4 md:px-8 flex items-center justify-between z-40">
        <div className="text-[21px] font-semibold tracking-[0.231px] text-ink">
          {currentArea}
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-[12px] text-ink-muted-80 tracking-tight">
            WGS-84 / EPSG:4326
          </div>
          {isResponseView ? (
            <Link
              href="/"
              className="bg-canvas border border-hairline text-ink text-[14px] font-normal rounded-sm px-[15px] py-[8px] hover:scale-95 transition-transform"
            >
              Public View
            </Link>
          ) : (
            <Link
              href="/dispatch"
              className="bg-primary text-on-primary text-[14px] font-normal rounded-pill px-[22px] py-[10px] hover:scale-95 transition-transform shadow-sm"
            >
              Command Center
            </Link>
          )}
          <Link
            href="/login"
            className="text-red-500 font-semibold text-[14px] px-[18px] py-[8px] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2 border border-transparent hover:border-red-500/30 shadow-sm"
          >
            Logout
          </Link>
        </div>
      </div>
    </div>
  );
};
