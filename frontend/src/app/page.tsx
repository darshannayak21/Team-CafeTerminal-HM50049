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
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-canvas">
      <MainHeader currentArea="Pune District" isResponseView={false} />

      <main className="flex-1 relative w-full h-full">
        {/* Full Bleed Map Background */}
        <div className="absolute inset-0 z-0">
          <MainMapContainer activeRoute={activeRoute} showElevation={showElevation} focusLocation={focusLocation} />
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
            <h3 className="text-[17px] font-semibold tracking-[-0.374px] text-ink mb-1 flex items-center justify-between">
              <span>Reported Incidents</span>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-[#ff3b30]/10 text-[#ff3b30] rounded-full uppercase tracking-wider">Live</span>
            </h3>
            
            <div className="mt-3 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setFocusLocation([18.45999, 73.82313])}
                className="text-left w-full hover:bg-black/5 transition-colors p-2 -mx-2 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#ff3b30]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#ff3b30] font-bold text-lg leading-none">!</span>
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-ink leading-tight mb-1">Navale Bridge Collapse</h4>
                    <p className="text-[13px] text-ink-muted-80 leading-[1.3] mb-1">
                      Major structural failure reported on Navale Bridge. Road blocked in both directions. Avoid area.
                    </p>
                    <p className="text-[11px] text-ink-muted-48 uppercase tracking-wide font-medium">Just now · Punekar News</p>
                  </div>
                </div>
              </button>
            </div>
            
            <div className="mt-4 pt-3 border-t border-hairline">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="w-full bg-canvas border border-hairline text-primary text-[14px] font-medium rounded-pill px-[22px] py-[10px] hover:scale-95 transition-transform"
              >
                + Report an Incident
              </button>
            </div>
          </div>


        </div>


      </main>

      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}

