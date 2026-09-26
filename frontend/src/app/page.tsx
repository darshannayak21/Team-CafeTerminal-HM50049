'use client';

import React, { useState } from 'react';
import { MainHeader } from '@/components/layout/MainHeader';
import { RoutePlanner } from '@/components/public/RoutePlanner';
import { ReportIncidentModal } from '@/components/public/ReportIncidentModal';
import { LiveUpdatesFeed } from '@/components/public/LiveUpdatesFeed';
import { MainMapContainer } from '@/components/map/MainMapContainer';
import { RouteOption } from '@/types/prototype';

export default function MainPage() {
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [showElevation, setShowElevation] = useState<boolean>(false);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-canvas">
      <MainHeader currentArea="Pune District" isResponseView={false} />

      <main className="flex-1 relative w-full h-full">
        {/* Full Bleed Map Background */}
        <div className="absolute inset-0 z-0">
          <MainMapContainer activeRoute={activeRoute} showElevation={showElevation} />
        </div>

        {/* Floating Utility Panels (Frosted Glass) */}
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-4 w-[360px] pointer-events-none max-h-[calc(100vh-3rem)] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          
          <div className="pointer-events-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <RoutePlanner
              activeRoute={activeRoute}
              onRouteCalculated={setActiveRoute}
            />
          </div>

          <div className="pointer-events-auto frosted-glass rounded-lg border border-hairline p-4 shadow-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-[17px] font-semibold tracking-[-0.374px] text-ink mb-1">
              Report an Incident
            </h3>
            <p className="text-[14px] text-ink-muted-48 leading-[1.43] tracking-[-0.224px] mb-3">
              Share verified ground observations with responding disaster management teams.
            </p>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="w-full bg-canvas border border-hairline text-primary text-[14px] font-normal rounded-pill px-[22px] py-[10px] hover:scale-95 transition-transform"
            >
              Open Ground Reporting
            </button>
          </div>


        </div>

        {/* Live Updates Floating Bottom */}
        <div className="absolute bottom-6 right-6 z-10 w-[400px] pointer-events-auto animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <LiveUpdatesFeed title="Live Ground Updates" maxItems={3} />
        </div>
      </main>

      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}

