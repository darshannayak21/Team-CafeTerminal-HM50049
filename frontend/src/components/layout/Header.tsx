'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  isHistoricalReplay?: boolean;
  onToggleHistoricalReplay?: () => void;
  isLoading?: boolean;
  onSimulateLoading?: () => void;
  isErrorSimulated?: boolean;
  onToggleError?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isHistoricalReplay = false,
  onToggleHistoricalReplay,
  isLoading = false,
  onSimulateLoading,
  isErrorSimulated = false,
  onToggleError,
}) => {
  return (
    <header className="border-b border-[#D9D0C4] bg-[#18324A] text-[#FAF8F3]">
      {/* Historical / Replay Scenario Banner (Visible when historical mode is toggled) */}
      {isHistoricalReplay && (
        <div
          role="status"
          aria-label="Historical Event Replay Indicator"
          className="bg-[#8A624E] border-b border-[#654536] px-4 py-1.5 text-xs font-mono text-[#FAF8F3] flex flex-wrap items-center justify-between gap-2 select-none"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F3EEE5] animate-pulse" aria-hidden="true" />
            <strong className="uppercase tracking-wider">
              Historical Event Replay Mode · Scenario: August 2025 Western Ghats Peak Inundation
            </strong>
          </div>
          <span className="text-[11px] text-[#F3EEE5]/90">
            Frozen archive data · Not a live stream
          </span>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Operational Title & Hierarchy */}
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 shrink-0 self-start mt-1.5 ${
              isHistoricalReplay ? 'bg-[#8A624E]' : 'bg-[#B66F55]'
            }`}
            aria-hidden="true"
          />
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg md:text-xl font-serif font-bold text-[#FAF8F3] tracking-normal leading-tight">
              Flood Hazard &amp; Response Intelligence Dashboard
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#8FAFC2] font-sans">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#8FAFC2]/90 font-medium">
                Console HM-50049
              </span>
              <span className="text-[#557A95]">/</span>
              <span>
                Operational State:{' '}
                <strong className="text-[#FAF8F3] font-medium font-mono text-[12px]">
                  {isHistoricalReplay ? 'Historical Event Replay' : 'Active Incident Briefing'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Operational Controls & Mode Switches */}
        <div className="flex flex-wrap items-center gap-2.5 ml-auto">
          {/* Historical Replay Mode Toggle */}
          {onToggleHistoricalReplay && (
            <button
              onClick={onToggleHistoricalReplay}
              className={`px-2.5 py-1 text-xs font-mono border transition-none cursor-pointer uppercase ${
                isHistoricalReplay
                  ? 'border-[#FAF8F3] bg-[#8A624E] text-[#FAF8F3] font-bold'
                  : 'border-[#557A95] bg-[#273038] text-[#8FAFC2] hover:bg-[#18324A] hover:text-[#FAF8F3]'
              }`}
              title="Toggle between Current Prototype Briefing and Archived 2025 Replay"
            >
              {isHistoricalReplay ? '◀ Return to Current Briefing' : '↺ Historical Replay (2025)'}
            </button>
          )}

          {/* Prototype State Simulation Controls (Restrained test toggles for reviewers) */}
          <div className="hidden sm:flex items-center gap-1.5 border border-[#557A95]/60 bg-[#273038]/60 px-2 py-0.5 text-[11px] font-mono text-[#8FAFC2]">
            <span className="text-[#8FAFC2]/80 uppercase text-[10px]">States:</span>
            {onSimulateLoading && (
              <button
                onClick={onSimulateLoading}
                className="hover:text-[#FAF8F3] underline decoration-[#557A95] cursor-pointer"
                title="Simulate a 1.5s local loading state"
              >
                {isLoading ? 'Loading...' : 'Loading'}
              </button>
            )}
            <span className="text-[#557A95]">|</span>
            {onToggleError && (
              <button
                onClick={onToggleError}
                className={`cursor-pointer ${isErrorSimulated ? 'text-[#B66F55] font-bold underline' : 'hover:text-[#FAF8F3] underline decoration-[#557A95]'}`}
                title="Toggle an operational error state"
              >
                {isErrorSimulated ? 'Clear Error' : 'Error'}
              </button>
            )}
          </div>

          <Badge variant={isHistoricalReplay ? 'REPLAY' : 'PROTOTYPE'} size="sm">
            {isHistoricalReplay ? 'Historical Replay' : 'Prototype Mode'}
          </Badge>

          <div className="hidden md:flex items-center border border-[#557A95] bg-[#273038] px-2.5 py-1 text-xs font-mono text-[#8FAFC2]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8FAFC2] mr-2" aria-hidden="true" />
            {isHistoricalReplay ? '2025-08-04 · Archived' : '2026-09-25 · IST'}
          </div>
        </div>
      </div>
    </header>
  );
};
