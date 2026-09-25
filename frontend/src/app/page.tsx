'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MainHeader } from '@/components/layout/MainHeader';
import { RoutePlanner } from '@/components/public/RoutePlanner';
import { ReportIncidentModal } from '@/components/public/ReportIncidentModal';
import { LiveUpdatesFeed } from '@/components/public/LiveUpdatesFeed';
import { MainMapContainer } from '@/components/map/MainMapContainer';
import { RouteOption } from '@/types/prototype';

export default function MainPage() {
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-full lg:overflow-hidden bg-[#FAF8F3]">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <MainHeader currentArea="Pune District" isResponseView={false} />

      {/* ── MAIN WORKSPACE: LEFT SIDEBAR + HERO MAP ─────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-96 shrink-0 flex flex-col border-r border-[#D9D0C4] bg-[#FAF8F3] overflow-y-auto divide-y divide-[#D9D0C4]">
          {/* Section 1: Route Planner */}
          <div className="p-3.5">
            <RoutePlanner
              activeRoute={activeRoute}
              onRouteCalculated={setActiveRoute}
            />
          </div>

          {/* Section 2: Report Incident */}
          <div className="p-3.5">
            <div className="border border-[#D9D0C4] bg-[#FAF8F3] p-4 text-[#273038]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 bg-[#B66F55]" />
                <h3 className="font-serif font-bold text-sm tracking-tight text-[#18324A] uppercase">
                  ⚠ Report an Incident
                </h3>
              </div>
              <p className="text-xs font-sans text-[#68747B] mb-3">
                Share verified ground observations with responding disaster management teams.
              </p>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="w-full py-2.5 px-3 border border-[#B66F55] bg-[#B66F55]/10 hover:bg-[#B66F55] text-[#B66F55] hover:text-[#FAF8F3] font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Open Ground Reporting
              </button>
            </div>
          </div>

          {/* Section 3: Response Team Operational Entry */}
          <div className="p-3.5">
            <div className="border-2 border-[#18324A] bg-[#18324A] text-[#FAF8F3] p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚑</span>
                  <h3 className="font-serif font-bold text-sm tracking-wide uppercase text-[#FAF8F3]">
                    Response Team
                  </h3>
                </div>
                <span className="text-[9px] font-mono uppercase bg-[#273038] px-1.5 py-0.5 border border-[#557A95] text-[#8FAFC2]">
                  Command
                </span>
              </div>
              <p className="text-xs font-sans text-[#8FAFC2] mb-3">
                Enter operational response intelligence: district triage, telemetry evidence, and field incident verification.
              </p>
              <Link
                href="/response"
                className="block text-center w-full py-2.5 px-3 bg-[#FAF8F3] hover:bg-[#F3EEE5] text-[#18324A] font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                Open Response Intelligence →
              </Link>
            </div>
          </div>
        </aside>

        {/* Hero Map & Live Updates Area */}
        <main className="flex-1 flex flex-col min-w-0 h-[600px] lg:h-full overflow-hidden">
          {/* Large Hero Map */}
          <div className="flex-1 relative overflow-hidden">
            <MainMapContainer
              activeRoute={activeRoute}
            />
          </div>

          {/* Bottom Live Updates Section */}
          <div className="shrink-0">
            <LiveUpdatesFeed
              title="LIVE GROUND &amp; TELEMETRY UPDATES"
              maxItems={3}
            />
          </div>
        </main>
      </div>

      {/* Incident Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
