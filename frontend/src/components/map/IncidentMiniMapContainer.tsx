'use client';

import React from 'react';
import dynamic from 'next/dynamic';

interface IncidentMiniMapProps {
  coordinates: [number, number] | null;
  title: string;
  severity: string;
  category?: string;
  locationName?: string;
}

const DynamicIncidentMiniMap = dynamic(
  () => import('./IncidentMiniMap').then((mod) => mod.IncidentMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[220px] rounded-[14px] bg-[#f5f5f7] border border-[#e5e5ea] flex flex-col items-center justify-center p-6">
        <div className="w-4 h-4 rounded-full border-2 border-[#0066cc] border-t-transparent animate-spin mb-2" />
        <span className="text-[12px] font-medium text-[#86868b]">Loading Tactical Coordinates...</span>
      </div>
    ),
  }
);

export const IncidentMiniMapContainer: React.FC<IncidentMiniMapProps> = (props) => {
  return <DynamicIncidentMiniMap {...props} />;
};
