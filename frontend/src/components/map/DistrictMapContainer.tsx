'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { TalukaDistrict, IncidentMarkerData } from '@/types/prototype';

interface DistrictMapContainerProps {
  district: TalukaDistrict;
  incidents: IncidentMarkerData[];
  selectedIncident: IncidentMarkerData | null;
  onSelectIncident: (incident: IncidentMarkerData | null) => void;
}

const DynamicDistrictMap = dynamic(
  () => import('./DistrictMap').then((mod) => mod.DistrictMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex-1 flex flex-col bg-[#FAF8F3] bg-carto-grid items-center justify-center p-6 min-h-[380px]">
        <div className="border border-[#D9D0C4] bg-[#FAF8F3] p-4 text-center">
          <div className="w-3 h-3 bg-[#B66F55] mx-auto mb-2 animate-pulse" />
          <div className="font-serif font-bold text-xs text-[#18324A]">
            Focusing Tactical Sector Map...
          </div>
        </div>
      </div>
    ),
  }
);

export const DistrictMapContainer: React.FC<DistrictMapContainerProps> = (props) => {
  return <DynamicDistrictMap {...props} />;
};
