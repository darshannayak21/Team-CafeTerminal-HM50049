import React from 'react';
import { PUNE_DISTRICT_CONTEXT } from '@/data/fixtureData';
import { Badge } from '@/components/ui/Badge';

interface MapWorkspacePlaceholderProps {
  activeTaluka: string;
}

export const MapWorkspacePlaceholder: React.FC<MapWorkspacePlaceholderProps> = ({
  activeTaluka
}) => {
  const { bounds, center } = PUNE_DISTRICT_CONTEXT;

  return (
    <div className="relative w-full h-full flex-1 flex flex-col bg-[#FAF8F3] bg-carto-grid select-none min-h-[500px]">
      {/* Top Map Action / Layer Strip */}
      <div className="z-10 px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#D9D0C4] bg-[#F3EEE5]/90">
        <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
          <span className="text-xs uppercase tracking-wider text-[#68747B] font-bold">
            Layers:
          </span>
          <div className="flex items-center gap-1.5 border border-[#D9D0C4] bg-[#FAF8F3] px-2.5 py-1 text-xs text-[#18324A] font-medium">
            <span className="w-2 h-2 bg-[#557A95] inline-block" />
            Base: Cartographic Graticule
          </div>
          <div className="flex items-center gap-1.5 border border-[#D9D0C4] bg-[#FAF8F3] px-2.5 py-1 text-xs text-[#68747B] opacity-75">
            <span className="w-2 h-2 border border-[#8A624E] inline-block" />
            Hazard Grid (Milestone 2)
          </div>
          <div className="flex items-center gap-1.5 border border-[#D9D0C4] bg-[#FAF8F3] px-2.5 py-1 text-xs text-[#68747B] opacity-75">
            <span className="w-2 h-2 border border-[#654536] inline-block" />
            Road Risks (Milestone 4)
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-sans">
          <span className="text-[#68747B]">
            Focus: <strong className="text-[#18324A] font-semibold">{activeTaluka}</strong>
          </span>
          <Badge variant="PROTOTYPE" size="sm">
            Leaflet Target
          </Badge>
        </div>
      </div>

      {/* Cartographic Coordinate Graticule Markers (Four Corners) */}
      <div className="absolute top-12 left-3 font-mono text-[11px] text-[#68747B] pointer-events-none">
        ┌ {bounds.north}°N, {bounds.west}°E (NW)
      </div>
      <div className="absolute top-12 right-3 font-mono text-[11px] text-[#68747B] text-right pointer-events-none">
        {bounds.north}°N, {bounds.east}°E (NE) ┐
      </div>
      <div className="absolute bottom-10 left-3 font-mono text-[11px] text-[#68747B] pointer-events-none">
        └ {bounds.south}°N, {bounds.west}°E (SW)
      </div>
      <div className="absolute bottom-10 right-3 font-mono text-[11px] text-[#68747B] text-right pointer-events-none">
        {bounds.south}°N, {bounds.east}°E (SE) ┘
      </div>

      {/* Center Reticle and Milestone 1 Foundation Stage Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-xl w-full border border-[#D9D0C4] bg-[#FAF8F3] shadow-none p-4 sm:p-5 text-[#273038]">
          <div className="flex items-center justify-between border-b border-[#D9D0C4] pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#18324A] shrink-0" />
              <h2 className="font-serif font-bold text-base sm:text-lg text-[#18324A] tracking-normal">
                Geospatial Operations Canvas
              </h2>
            </div>
            <span className="text-xs font-mono text-[#654536] uppercase font-semibold">
              Milestone 1 Foundation
            </span>
          </div>

          <p className="text-[16px] sm:text-[17px] font-sans leading-relaxed text-[#273038] mb-3">
            The interactive map workspace is established as the primary visual operations center of the dashboard.
            Surrounding graticule bounds, scale geometry, and coordinate framing are initialized to receive
            Leaflet tile rendering, flood hazard contours, and settlement layers in future milestones.
          </p>

          <div className="border border-[#D9D0C4] bg-[#F3EEE5] p-3 mb-3 text-sm font-mono divide-y divide-[#D9D0C4]/60">
            <div className="flex justify-between items-center py-1">
              <span className="text-xs uppercase tracking-wider text-[#68747B] font-sans">Spatial Projection:</span>
              <span className="font-semibold text-[#18324A]">EPSG:4326 / WGS84 (Standard Cartographic)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs uppercase tracking-wider text-[#68747B] font-sans">Target Centroid:</span>
              <span className="text-[#273038]">{center.lat.toFixed(4)}°N, {center.lon.toFixed(4)}°E (Pune HQ)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs uppercase tracking-wider text-[#68747B] font-sans">Active Sector:</span>
              <span className="text-[#8A624E] font-medium">{activeTaluka} (Pune District)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs uppercase tracking-wider text-[#68747B] font-sans">Geographic Bounds:</span>
              <span className="text-[#273038]">{bounds.south}°N–{bounds.north}°N, {bounds.west}°E–{bounds.east}°E</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs uppercase tracking-wider text-[#68747B] font-sans">Mapping Engine:</span>
              <span className="text-[#654536] font-semibold">Scheduled for Milestone 2 (Leaflet Integration)</span>
            </div>
          </div>

          <div className="text-xs font-sans text-[#68747B] border-t border-[#D9D0C4] pt-2 flex items-center justify-between">
            <span>Cartographic Step: 0.1° (~11.1 km)</span>
            <span className="font-mono text-[11px] text-[#8A624E]">Framework Ready · No Live API</span>
          </div>
        </div>
      </div>

      {/* Bottom Cartographic Scale Bar & Extents Rule */}
      <div className="mt-auto border-t border-[#D9D0C4] bg-[#F3EEE5]/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-[#68747B] font-bold">Scale:</span>
          <div className="flex items-center">
            <div className="h-1.5 w-12 border-l border-b border-t border-[#18324A] bg-[#18324A]" />
            <div className="h-1.5 w-12 border-r border-b border-t border-[#18324A] bg-[#FAF8F3]" />
            <span className="text-xs font-mono ml-2 text-[#273038] font-medium">25 km</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#68747B]">
          <span>Centroid: <strong className="font-mono text-[#273038]">{center.lat}°N, {center.lon}°E</strong></span>
          <span className="hidden sm:inline text-[#D9D0C4]">|</span>
          <span className="hidden sm:inline">Coverage: <strong className="font-mono text-[#273038]">15,643 km²</strong></span>
        </div>
      </div>
    </div>
  );
};
