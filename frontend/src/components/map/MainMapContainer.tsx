'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { RouteOption, IncidentMarkerData } from '@/types/prototype';

interface MainMapContainerProps {
  activeRoute: RouteOption | null;
  selectedTalukaId?: string | null;
  onSelectTaluka?: (id: string) => void;
  onSelectIncident?: (incident: IncidentMarkerData) => void;
  showElevation?: boolean;
}

const DynamicMainMap = dynamic(
  () => import('./MainHeroMap').then((mod) => mod.MainHeroMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex-1 flex flex-col bg-canvas-parchment items-center justify-center p-6 min-h-[480px]">
        <div className="frosted-glass rounded-xl border border-hairline p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-4 h-4 bg-primary mx-auto mb-4 animate-pulse rounded-full" />
          <h3 className="text-[17px] font-semibold tracking-[-0.374px] text-ink mb-1.5">
            Loading Map
          </h3>
          <p className="text-[14px] text-ink-muted-80 tracking-[-0.224px]">
            Initializing spatial layers and route network...
          </p>
        </div>
      </div>
    ),
  }
);

export const MainMapContainer: React.FC<MainMapContainerProps> = (props) => {
  return <DynamicMainMap {...props} />;
};
