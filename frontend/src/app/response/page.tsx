'use client';

import React, { useState } from 'react';
import { MainHeader } from '@/components/layout/MainHeader';
import { PriorityList } from '@/components/response/PriorityList';
import { DistrictIntelligence } from '@/components/response/DistrictIntelligence';
import { PROTOTYPE_DISTRICTS } from '@/data/prototype';

export default function ResponsePage() {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('mulshi');

  const selectedDistrict =
    PROTOTYPE_DISTRICTS.find((d) => d.id === selectedDistrictId) ??
    PROTOTYPE_DISTRICTS[0];

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-canvas">
      <MainHeader currentArea="Pune District Command" isResponseView={true} />

      {/* ── RESPONSIVE SPLIT WORKSPACE: 35% LEFT / 65% RIGHT ────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Priority Areas List (35% on desktop) */}
        <aside className="w-full lg:w-[35%] shrink-0 h-[320px] lg:h-full overflow-hidden flex flex-col border-r border-hairline bg-surface-pearl">
          <PriorityList
            districts={PROTOTYPE_DISTRICTS}
            selectedDistrictId={selectedDistrictId}
            onSelectDistrict={setSelectedDistrictId}
          />
        </aside>

        {/* Right Column: Selected District Intelligence (65% on desktop) */}
        <main className="w-full lg:w-[65%] flex-1 h-full overflow-hidden flex flex-col bg-canvas-parchment">
          <DistrictIntelligence district={selectedDistrict} />
        </main>
      </div>
    </div>
  );
}

