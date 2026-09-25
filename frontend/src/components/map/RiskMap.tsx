'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RiskArea, RiskLevel } from '@/types/hazard';
import { RoadStatus } from '@/types/road';
import {
  PROTOTYPE_RISK_AREAS,
  PROTOTYPE_SETTLEMENTS,
  PROTOTYPE_ROADS,
  PUNE_DISTRICT_CONTEXT,
} from '@/data/fixtureData';
import { MapLegend } from '@/components/map/MapLegend';

interface RiskMapProps {
  activeTaluka: string;
  selectedRiskAreaId: string | null;
  onSelectRiskArea: (id: string | null) => void;
}

// ── Polygon palette ───────────────────────────────────────────────────────────
const RISK_STYLES: Record<
  RiskLevel,
  { stroke: string; fill: string; fillOpacity: number }
> = {
  CRITICAL: { stroke: '#B66F55', fill: '#B66F55', fillOpacity: 0.35 },
  HIGH:     { stroke: '#8A624E', fill: '#8A624E', fillOpacity: 0.30 },
  MODERATE: { stroke: '#557A95', fill: '#557A95', fillOpacity: 0.25 },
  LOW:      { stroke: '#18324A', fill: '#8FAFC2', fillOpacity: 0.20 },
};

// ── Road colour by status ─────────────────────────────────────────────────────
const ROAD_COLOURS: Record<RoadStatus, string> = {
  'CONFIRMED BLOCKED': '#B66F55',
  'AT RISK':           '#8A624E',
  'MONITORING':        '#557A95',
};

export const RiskMap: React.FC<RiskMapProps> = ({
  activeTaluka,
  selectedRiskAreaId,
  onSelectRiskArea,
}) => {
  const mapContainerRef    = useRef<HTMLDivElement>(null);
  const mapInstanceRef     = useRef<L.Map | null>(null);
  const polygonGroupRef    = useRef<L.LayerGroup | null>(null);
  const reticleGroupRef    = useRef<L.LayerGroup | null>(null);
  const settlementGroupRef = useRef<L.LayerGroup | null>(null);
  const roadGroupRef       = useRef<L.LayerGroup | null>(null);

  // ── Initialise map (once) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const { center, bounds } = PUNE_DISTRICT_CONTEXT;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lon],
      zoom: 10,
      minZoom: 8,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' +
          ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      }
    ).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);

    const sw = L.latLng(bounds.south - 0.5, bounds.west - 0.5);
    const ne = L.latLng(bounds.north + 0.5, bounds.east + 0.5);
    map.setMaxBounds(L.latLngBounds(sw, ne));

    // Layer groups — order matters for z-index: roads first (bottom), then polygons, then markers on top
    const roadGroup       = L.layerGroup().addTo(map);
    const polygonGroup    = L.layerGroup().addTo(map);
    const settlementGroup = L.layerGroup().addTo(map);
    const reticleGroup    = L.layerGroup().addTo(map);

    roadGroupRef.current       = roadGroup;
    polygonGroupRef.current    = polygonGroup;
    settlementGroupRef.current = settlementGroup;
    reticleGroupRef.current    = reticleGroup;
    mapInstanceRef.current     = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Redraw layers whenever selection / taluka changes ─────────────────────
  useEffect(() => {
    const map             = mapInstanceRef.current;
    const polygonGroup    = polygonGroupRef.current;
    const reticleGroup    = reticleGroupRef.current;
    const settlementGroup = settlementGroupRef.current;
    const roadGroup       = roadGroupRef.current;

    if (!map || !polygonGroup || !reticleGroup || !settlementGroup || !roadGroup) return;

    polygonGroup.clearLayers();
    reticleGroup.clearLayers();
    settlementGroup.clearLayers();
    roadGroup.clearLayers();

    // ── Visible risk areas ──────────────────────────────────────────────────
    const visibleAreas = PROTOTYPE_RISK_AREAS.filter((area) => {
      if (activeTaluka === 'All Talukas') return true;
      return area.taluka.toLowerCase() === activeTaluka.toLowerCase();
    });
    const areasToRender = visibleAreas.length > 0 ? visibleAreas : PROTOTYPE_RISK_AREAS;

    // ── Risk-area polygons ──────────────────────────────────────────────────
    areasToRender.forEach((area: RiskArea) => {
      const isSelected = selectedRiskAreaId === area.id;
      const style      = RISK_STYLES[area.riskLevel] ?? RISK_STYLES.LOW;

      const opts: L.PolylineOptions = isSelected
        ? { color: '#18324A', weight: 3.5, fillColor: style.fill, fillOpacity: 0.60, dashArray: '6 6' }
        : { color: style.stroke, weight: 2, fillColor: style.fill, fillOpacity: style.fillOpacity };

      const poly = L.polygon(area.polygon, opts);

      poly.bindTooltip(
        `<div style="font-family:inherit;font-size:11px;line-height:1.4;color:#273038">
           <div style="font-weight:700;color:#18324A;font-size:12px;margin-bottom:2px">${area.name}</div>
           <div>Sector: <strong>${area.taluka} Taluka</strong></div>
           <div>Risk: <span style="font-weight:700;color:${style.stroke}">${area.riskLevel}</span> (${area.hazardScore.toFixed(2)})</div>
           <div style="font-size:10px;color:#68747B;margin-top:3px">Click to inspect impact chain</div>
         </div>`,
        { sticky: true, direction: 'top', className: 'carto-tooltip' }
      );

      poly.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRiskArea(selectedRiskAreaId === area.id ? null : area.id);
      });

      poly.on('mouseover', () => {
        if (!isSelected) poly.setStyle({ weight: 3, fillOpacity: style.fillOpacity + 0.15 });
      });
      poly.on('mouseout', () => {
        if (!isSelected) poly.setStyle(opts);
      });

      polygonGroup.addLayer(poly);

      // Centroid reticle when selected
      if (isSelected) {
        const icon = L.divIcon({
          className: 'carto-reticle-icon',
          html: `<div style="width:14px;height:14px;border:2px solid #18324A;border-radius:50%;background:#FAF8F3;display:flex;align-items:center;justify-content:center">
                   <div style="width:4px;height:4px;background:#B66F55;border-radius:50%"></div>
                 </div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        reticleGroup.addLayer(L.marker(area.centroid, { icon }));
      }
    });

    // ── Settlement markers (visible only when a risk area is selected) ───────
    if (selectedRiskAreaId) {
      const areaSettlements = PROTOTYPE_SETTLEMENTS.filter(
        (s) => s.riskAreaId === selectedRiskAreaId
      );

      areaSettlements.forEach((s) => {
        const sIcon = L.divIcon({
          className: 'carto-settlement-icon',
          html: `<div style="
                   width:12px;height:12px;
                   border:2px solid #18324A;border-radius:50%;
                   background:#FAF8F3;
                   box-shadow:0 0 0 2px #F3EEE5;
                 "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        const marker = L.marker([s.latitude, s.longitude], { icon: sIcon });

        marker.bindTooltip(
          `<div style="font-family:inherit;font-size:11px;line-height:1.4;color:#273038">
             <div style="font-weight:700;color:#18324A;font-size:12px;margin-bottom:2px">${s.name}</div>
             <div>Taluka: <strong>${s.taluka}</strong></div>
             <div>Population: <strong>${s.population.toLocaleString()}</strong></div>
             <div>Households affected: <strong>${s.affectedHouseholds.toLocaleString()}</strong></div>
             <div style="font-size:10px;color:#68747B;margin-top:3px">${s.impactLevel} impact · Prototype fixture</div>
           </div>`,
          { direction: 'top', className: 'carto-tooltip' }
        );

        settlementGroup.addLayer(marker);
      });
    }

    // ── Road risk polylines (visible only when a risk area is selected) ──────
    if (selectedRiskAreaId) {
      const areaRoads = PROTOTYPE_ROADS.filter(
        (r) => r.riskAreaId === selectedRiskAreaId
      );

      areaRoads.forEach((road) => {
        const colour = ROAD_COLOURS[road.status] ?? '#557A95';
        const isDashed = road.status === 'AT RISK' || road.status === 'MONITORING';

        const roadOpts: L.PolylineOptions = {
          color: colour,
          weight: 3,
          opacity: 0.85,
          dashArray: isDashed ? '8 5' : undefined,
        };

        const line = L.polyline(road.coordinates, roadOpts);

        line.bindTooltip(
          `<div style="font-family:inherit;font-size:11px;line-height:1.4;color:#273038">
             <div style="font-weight:700;color:#18324A;font-size:12px;margin-bottom:2px">${road.name}</div>
             <div>Status: <strong style="color:${colour}">${road.status}</strong></div>
             <div style="margin-top:2px;max-width:200px">${road.riskReason}</div>
             <div style="font-size:10px;color:#68747B;margin-top:3px">Prototype fixture — not a live report</div>
           </div>`,
          { sticky: true, direction: 'top', className: 'carto-tooltip' }
        );

        roadGroup.addLayer(line);
      });
    }

    // ── Pan to selected area ─────────────────────────────────────────────────
    if (selectedRiskAreaId) {
      const sel = PROTOTYPE_RISK_AREAS.find((a) => a.id === selectedRiskAreaId);
      if (sel) map.panTo(sel.centroid, { animate: true, duration: 0.8 });
    }
  }, [activeTaluka, selectedRiskAreaId, onSelectRiskArea]);

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full flex-1 flex flex-col bg-[#FAF8F3] select-none">
      {/* Top map context strip */}
      <div className="z-[400] px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#D9D0C4] bg-[#F3EEE5]/95">
        <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
          <span className="text-xs uppercase tracking-wider text-[#68747B] font-bold">Layers:</span>
          <div className="flex items-center gap-1.5 border border-[#D9D0C4] bg-[#FAF8F3] px-2.5 py-1 text-xs text-[#18324A] font-medium">
            <span className="w-2 h-2 bg-[#557A95] inline-block" />
            Base: Cartographic Topo
          </div>
          <div className="flex items-center gap-1.5 border border-[#B66F55] bg-[#FAF8F3] px-2.5 py-1 text-xs text-[#654536] font-semibold">
            <span className="w-2 h-2 bg-[#B66F55] inline-block" />
            Hazard Polygons
          </div>
          {selectedRiskAreaId && (
            <>
              <div className="flex items-center gap-1.5 border border-[#18324A] bg-[#FAF8F3] px-2.5 py-1 text-xs text-[#18324A]">
                <span className="w-2 h-2 border border-[#18324A] rounded-full inline-block" />
                Settlements
              </div>
              <div className="flex items-center gap-1.5 border border-[#8A624E] bg-[#FAF8F3] px-2.5 py-1 text-xs text-[#654536]">
                <span className="w-3 h-0.5 bg-[#8A624E] inline-block" />
                Road Risk
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-sans">
          {selectedRiskAreaId ? (
            <div className="flex items-center gap-2">
              <span className="text-[#68747B]">
                Selected:{' '}
                <strong className="text-[#18324A]">
                  {PROTOTYPE_RISK_AREAS.find((a) => a.id === selectedRiskAreaId)?.name}
                </strong>
              </span>
              <button
                onClick={() => onSelectRiskArea(null)}
                className="px-2 py-0.5 border border-[#D9D0C4] bg-[#FAF8F3] text-[11px] font-mono text-[#654536] hover:bg-[#F3EEE5] uppercase cursor-pointer"
                aria-label="Clear active risk sector selection"
              >
                Clear ×
              </button>
            </div>
          ) : (
            <span className="text-[#68747B]">
              Focus: <strong className="text-[#18324A]">{activeTaluka}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Leaflet map */}
      <div
        ref={mapContainerRef}
        className="flex-1 w-full h-full min-h-[460px] z-0 focus:outline-none"
        aria-label="Interactive Pune District Flood Risk Map"
      />

      {/* Floating legend */}
      <div className="absolute bottom-4 right-4 z-[400] max-w-[220px] pointer-events-auto">
        <MapLegend />
      </div>

      {/* Centroid readout */}
      <div className="absolute bottom-3 left-28 z-[400] hidden sm:flex items-center gap-2 border border-[#D9D0C4] bg-[#FAF8F3]/90 px-2.5 py-1 text-[11px] font-mono text-[#68747B] pointer-events-none">
        <span>18.5204°N, 73.8567°E</span>
        <span className="text-[#D9D0C4]">|</span>
        <span>Pune District Grid</span>
      </div>
    </div>
  );
};
