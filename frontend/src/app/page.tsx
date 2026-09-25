'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { DistrictContextBar } from '@/components/layout/DistrictContextBar';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { MapContainer } from '@/components/map/MapContainer';
import { OperationalPanel } from '@/components/dashboard/OperationalPanel';
import { PROTOTYPE_RISK_AREAS } from '@/data/fixtureData';

export default function DashboardPage() {
  const [selectedTaluka, setSelectedTaluka] = useState<string>('All Talukas');
  const [selectedRiskAreaId, setSelectedRiskAreaId] = useState<string | null>(null);

  // When changing taluka scope, clear selected risk area if it belongs to a different taluka
  const handleSelectTaluka = (taluka: string) => {
    setSelectedTaluka(taluka);
    if (selectedRiskAreaId && taluka !== 'All Talukas') {
      const selected = PROTOTYPE_RISK_AREAS.find((a) => a.id === selectedRiskAreaId);
      if (selected && selected.taluka.toLowerCase() !== taluka.toLowerCase()) {
        setSelectedRiskAreaId(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#FAF8F3]">
      {/* Top Header: Operational jurisdiction, incident designation, status badge */}
      <Header />

      {/* District Context Bar: Geographic coordinates, bounding extent, taluka selector */}
      <DistrictContextBar
        selectedTaluka={selectedTaluka}
        onSelectTaluka={handleSelectTaluka}
      />

      {/* Main Responsive Dashboard Workspace: Interactive Map (Visual Center) + Operational Detail Panel */}
      <DashboardGrid
        mapArea={
          <MapContainer
            activeTaluka={selectedTaluka}
            selectedRiskAreaId={selectedRiskAreaId}
            onSelectRiskArea={setSelectedRiskAreaId}
          />
        }
        operationalPanel={
          <OperationalPanel
            activeTaluka={selectedTaluka}
            selectedRiskAreaId={selectedRiskAreaId}
            onSelectRiskArea={setSelectedRiskAreaId}
          />
        }
      />
    </div>
  );
}
