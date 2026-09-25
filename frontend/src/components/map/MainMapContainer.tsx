'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { RouteOption, IncidentMarkerData } from '@/types/prototype';

interface MainMapContainerProps {
  activeRoute: RouteOption | null;
  selectedTalukaId?: string | null;
  onSelectTaluka?: (id: string) => void;
  onSelectIncident?: (incident: IncidentMarkerData) => void;
}

const DynamicMainMap = dynamic(
  () => import('./MainHeroMap').then((mod) => mod.MainHeroMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex-1 flex flex-col bg-[#FAF8F3] bg-carto-grid items-center justify-center p-6 min-h-[480px]">
        <div className="border border-[#D9D0C4] bg-[#FAF8F3] p-5 max-w-sm w-full text-center">
          <div className="w-3 h-3 bg-[#18324A] mx-auto mb-3 animate-pulse" />
          <h3 className="font-serif font-bold text-sm text-[#18324A] mb-1">
            Loading Disaster Cartography
          </h3>
          <p className="text-xs font-sans text-[#68747B]">
            Initializing Pune District spatial layers and route network...
          </p>
        </div>
      </div>
    ),
  }
);

export const MainMapContainer: React.FC<MainMapContainerProps> = (props) => {
  return <DynamicMainMap {...props} />;
};
