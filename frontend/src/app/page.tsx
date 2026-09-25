'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { DistrictContextBar } from '@/components/layout/DistrictContextBar';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { MapWorkspacePlaceholder } from '@/components/dashboard/MapWorkspacePlaceholder';
import { OperationalPanel } from '@/components/dashboard/OperationalPanel';

export default function DashboardPage() {
  const [selectedTaluka, setSelectedTaluka] = useState<string>('All Talukas');

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#FAF8F3]">
      {/* Top Header: Operational jurisdiction, incident designation, status badge */}
      <Header />

      {/* District Context Bar: Geographic coordinates, bounding extent, taluka selector */}
      <DistrictContextBar
        selectedTaluka={selectedTaluka}
        onSelectTaluka={setSelectedTaluka}
      />

      {/* Main Responsive Dashboard Workspace: Central Map + Operational Detail Panel */}
      <DashboardGrid
        mapArea={<MapWorkspacePlaceholder activeTaluka={selectedTaluka} />}
        operationalPanel={<OperationalPanel activeTaluka={selectedTaluka} />}
      />
    </div>
  );
}
