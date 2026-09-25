'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RiskArea, RiskLevel } from '@/types/hazard';
import { PROTOTYPE_RISK_AREAS, PUNE_DISTRICT_CONTEXT } from '@/data/fixtureData';
import { MapLegend } from '@/components/map/MapLegend';

interface RiskMapProps {
  activeTaluka: string;
  selectedRiskAreaId: string | null;
  onSelectRiskArea: (id: string | null) => void;
}

// Styling palette mapping strictly following our cartographic design tokens
const RISK_STYLES: Record<
  RiskLevel,
  { stroke: string; fill: string; fillOpacity: number }
> = {
  CRITICAL: {
    stroke: '#B66F55', // Terracotta
    fill: '#B66F55',
    fillOpacity: 0.35
  },
  HIGH: {
    stroke: '#8A624E', // Warm Brown
    fill: '#8A624E',
    fillOpacity: 0.30
  },
  MODERATE: {
    stroke: '#557A95', // Muted Blue
    fill: '#557A95',
    fillOpacity: 0.25
  },
  LOW: {
    stroke: '#18324A', // Deep Navy
    fill: '#8FAFC2', // Soft Blue
    fillOpacity: 0.20
  }
};

export const RiskMap: React.FC<RiskMapProps> = ({
  activeTaluka,
  selectedRiskAreaId,
  onSelectRiskArea
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const { center, bounds } = PUNE_DISTRICT_CONTEXT;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lon],
      zoom: 10,
      minZoom: 8,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: true
    });

    // Custom attribution positioning and cartographic tile layer
    // CartoDB Voyager provides warm paper/cream tint matching the editorial visual palette
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
      }
    ).addTo(map);

    // Zoom control at top-right for clean responder dashboard hierarchy
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Scale control at bottom-left
    L.control
      .scale({
        position: 'bottomleft',
        metric: true,
        imperial: false
      })
      .addTo(map);

    // Bounding max bounds to prevent disorienting panning far away from Pune region
    const southWest = L.latLng(bounds.south - 0.5, bounds.west - 0.5);
    const northEast = L.latLng(bounds.north + 0.5, bounds.east + 0.5);
    map.setMaxBounds(L.latLngBounds(southWest, northEast));

    const polygonGroup = L.layerGroup().addTo(map);
    const markerGroup = L.layerGroup().addTo(map);

    polygonLayerGroupRef.current = polygonGroup;
    markerLayerGroupRef.current = markerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update polygons and markers whenever selected area or active taluka changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polygonGroup = polygonLayerGroupRef.current;
    const markerGroup = markerLayerGroupRef.current;

    if (!map || !polygonGroup || !markerGroup) return;

    polygonGroup.clearLayers();
    markerGroup.clearLayers();

    // Filter or highlight based on active taluka
    const visibleAreas = PROTOTYPE_RISK_AREAS.filter((area) => {
      if (activeTaluka === 'All Talukas') return true;
      return area.taluka.toLowerCase() === activeTaluka.toLowerCase();
    });

    // If an active taluka has no specific polygon, fallback to showing all but muted
    const areasToRender = visibleAreas.length > 0 ? visibleAreas : PROTOTYPE_RISK_AREAS;

    areasToRender.forEach((area: RiskArea) => {
      const isSelected = selectedRiskAreaId === area.id;
      const baseStyle = RISK_STYLES[area.riskLevel] || RISK_STYLES.LOW;

      // Polygon styling with distinct selected emphasis
      const polygonOptions: L.PolylineOptions = isSelected
        ? {
            color: '#18324A', // Deep Navy accent border
            weight: 3.5,
            fillColor: baseStyle.fill,
            fillOpacity: 0.65,
            dashArray: '6, 6'
          }
        : {
            color: baseStyle.stroke,
            weight: 2,
            fillColor: baseStyle.fill,
            fillOpacity: baseStyle.fillOpacity
          };

      const polygon = L.polygon(area.polygon, polygonOptions);

      // Tooltip styling with clear field-report metadata
      polygon.bindTooltip(
        `
        <div style="font-family: inherit; font-size: 11px; line-height: 1.4; color: #273038;">
          <div style="font-weight: 700; color: #18324A; font-size: 12px; margin-bottom: 2px;">
            ${area.name}
          </div>
          <div>Sector: <strong>${area.taluka} Taluka</strong></div>
          <div>Risk Tier: <span style="font-weight: 700; color: ${baseStyle.stroke};">${area.riskLevel}</span> (Score: ${area.hazardScore.toFixed(2)})</div>
          <div style="font-size: 10px; color: #68747B; margin-top: 3px;">Click to inspect localized telemetry</div>
        </div>
        `,
        {
          sticky: true,
          direction: 'top',
          className: 'carto-tooltip'
        }
      );

      // Mouse events
      polygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (selectedRiskAreaId === area.id) {
          onSelectRiskArea(null); // Deselect on second click
        } else {
          onSelectRiskArea(area.id);
        }
      });

      polygon.on('mouseover', function () {
        if (!isSelected) {
          polygon.setStyle({
            weight: 3,
            fillOpacity: baseStyle.fillOpacity + 0.15
          });
        }
      });

      polygon.on('mouseout', function () {
        if (!isSelected) {
          polygon.setStyle(polygonOptions);
        }
      });

      polygonGroup.addLayer(polygon);

      // If selected, add an editorial centroid reticle marker
      if (isSelected) {
        const reticleIcon = L.divIcon({
          className: 'carto-reticle-icon',
          html: `
            <div style="
              width: 14px; 
              height: 14px; 
              border: 2px solid #18324A; 
              border-radius: 50%; 
              background-color: #FAF8F3; 
              box-shadow: 0 0 0 2px #F3EEE5;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="width: 4px; height: 4px; background-color: #B66F55; border-radius: 50%;"></div>
            </div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const reticle = L.marker(area.centroid, { icon: reticleIcon });
        markerGroup.addLayer(reticle);
      }
    });

    // Pan smoothly if selected area changes
    if (selectedRiskAreaId) {
      const selected = PROTOTYPE_RISK_AREAS.find((a) => a.id === selectedRiskAreaId);
      if (selected) {
        map.panTo(selected.centroid, { animate: true, duration: 0.8 });
      }
    }
  }, [activeTaluka, selectedRiskAreaId, onSelectRiskArea]);

  return (
    <div className="relative w-full h-full flex-1 flex flex-col bg-[#FAF8F3] select-none">
      {/* Top Map Context Strip */}
      <div className="z-[400] px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#D9D0C4] bg-[#F3EEE5]/95">
        <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
          <span className="text-xs uppercase tracking-wider text-[#68747B] font-bold">
            Layers:
          </span>
          <div className="flex items-center gap-1.5 border border-[#D9D0C4] bg-[#FAF8F3] px-2.5 py-1 text-xs text-[#18324A] font-medium">
            <span className="w-2 h-2 bg-[#557A95] inline-block" />
            Base: Cartographic Topo
          </div>
          <div className="flex items-center gap-1.5 border border-[#B66F55] bg-[#FAF8F3] px-2.5 py-1 text-xs text-[#654536] font-semibold">
            <span className="w-2 h-2 bg-[#B66F55] inline-block" />
            Hazard Polygons (5 Sectors Active)
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-sans">
          {selectedRiskAreaId ? (
            <div className="flex items-center gap-2">
              <span className="text-[#68747B]">
                Selected Sector:{' '}
                <strong className="text-[#18324A] font-semibold">
                  {PROTOTYPE_RISK_AREAS.find((a) => a.id === selectedRiskAreaId)?.name}
                </strong>
              </span>
              <button
                onClick={() => onSelectRiskArea(null)}
                className="px-2 py-0.5 border border-[#D9D0C4] bg-[#FAF8F3] text-[11px] font-mono text-[#654536] hover:bg-[#F3EEE5] uppercase cursor-pointer"
                aria-label="Clear active risk sector selection"
              >
                Clear Selection ×
              </button>
            </div>
          ) : (
            <span className="text-[#68747B]">
              Focus Sector:{' '}
              <strong className="text-[#18324A] font-semibold">{activeTaluka}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Primary Leaflet Map Container */}
      <div 
        ref={mapContainerRef} 
        className="flex-1 w-full h-full min-h-[460px] z-0 focus:outline-none"
        aria-label="Interactive Pune District Flood Risk Map"
      />

      {/* Cartographic Floating Legend (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-[400] max-w-xs pointer-events-auto">
        <MapLegend />
      </div>

      {/* Cartographic Centroid Readout (Bottom-Left) */}
      <div className="absolute bottom-3 left-28 z-[400] hidden sm:flex items-center gap-2 border border-[#D9D0C4] bg-[#FAF8F3]/90 px-2.5 py-1 text-[11px] font-mono text-[#68747B] pointer-events-none">
        <span>Center: 18.5204°N, 73.8567°E</span>
        <span className="text-[#D9D0C4]">|</span>
        <span>Pune District Grid</span>
      </div>
    </div>
  );
};
