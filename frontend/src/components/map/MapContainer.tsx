'use client';

import React from 'react';
import dynamic from 'next/dynamic';

interface MapContainerProps {
  activeTaluka: string;
  selectedRiskAreaId: string | null;
  onSelectRiskArea: (id: string | null) => void;
}

// Graceful cartographic loading placeholder matching the editorial palette
const MapLoadingPlaceholder: React.FC = () => {
  return (
    <div className="relative w-full h-full flex-1 flex flex-col bg-[#FAF8F3] bg-carto-grid items-center justify-center p-6 min-h-[460px] select-none">
      <div className="border border-[#D9D0C4] bg-[#FAF8F3] p-5 max-w-sm w-full text-center">
        <div className="w-3 h-3 bg-[#18324A] mx-auto mb-3 animate-pulse" />
        <h3 className="font-serif font-bold text-sm text-[#18324A] mb-1">
          Loading Geospatial Workspace
        </h3>
        <p className="text-xs font-sans text-[#68747B] mb-3">
          Initializing Leaflet mapping layer and Pune District hazard polygon overlays...
        </p>
        <div className="text-[10px] font-mono text-[#8A624E] border-t border-[#D9D0C4] pt-2">
          EPSG:4326 · Client Map Component
        </div>
      </div>
    </div>
  );
};

// Dynamic client-only import to completely eliminate server-side hydration mismatches
const DynamicRiskMap = dynamic(
  () => import('./RiskMap').then((mod) => mod.RiskMap),
  {
    ssr: false,
    loading: () => <MapLoadingPlaceholder />
  }
);

export const MapContainer: React.FC<MapContainerProps> = (props) => {
  return <DynamicRiskMap {...props} />;
};
