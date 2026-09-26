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
      <div className="w-full h-full flex-1 flex flex-col bg-canvas items-center justify-center p-6 min-h-[380px]">
        <div className="border border-hairline bg-surface-pearl p-6 rounded-lg text-center shadow-sm">
          <div className="w-4 h-4 bg-primary rounded-full mx-auto mb-3 animate-pulse" />
          <div className="font-semibold text-[14px] text-ink tracking-[-0.16px]">
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
