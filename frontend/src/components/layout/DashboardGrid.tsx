import React from 'react';

interface DashboardGridProps {
  mapArea: React.ReactNode;
  operationalPanel: React.ReactNode;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  mapArea,
  operationalPanel
}) => {
  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-[#FAF8F3]">
      {/* Primary Map Workspace (Central visual area) */}
      <main 
        id="map-workspace"
        aria-label="Map Workspace and Geospatial Stage"
        className="flex-1 flex flex-col min-w-0 min-h-[460px] lg:min-h-0 relative overflow-hidden"
      >
        {mapArea}
      </main>

      {/* Right Operational Panel */}
      <aside 
        id="operational-panel"
        aria-label="Operational Intelligence Panel"
        className="w-full lg:w-[400px] xl:w-[440px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#D9D0C4] bg-[#FAF8F3] flex flex-col overflow-y-auto"
      >
        {operationalPanel}
      </aside>
    </div>
  );
};
