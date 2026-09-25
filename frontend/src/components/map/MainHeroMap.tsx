'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteOption, IncidentMarkerData, TalukaDistrict } from '@/types/prototype';
import { PROTOTYPE_DISTRICTS, PROTOTYPE_INCIDENTS } from '@/data/prototype';
import { getIncidentMarkerSvg } from './gisIcons';

interface MainHeroMapProps {
  activeRoute: RouteOption | null;
  selectedTalukaId?: string | null;
  onSelectTaluka?: (id: string) => void;
  onSelectIncident?: (incident: IncidentMarkerData) => void;
}

export const MainHeroMap: React.FC<MainHeroMapProps> = ({
  activeRoute,
  onSelectIncident,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center of Pune District
    const map = L.map(mapContainerRef.current, {
      center: [18.5204, 73.8567],
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
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      }
    ).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);

    const polygonLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const incidentLayer = L.layerGroup().addTo(map);

    polygonLayerRef.current = polygonLayer;
    routeLayerRef.current = routeLayer;
    incidentLayerRef.current = incidentLayer;
    mapInstanceRef.current = map;

    // Render district risk zones (Polygons)
    PROTOTYPE_DISTRICTS.forEach((d: TalukaDistrict) => {
      if (!d.polygonCoordinates) return;

      const fillColor =
        d.riskLevel === 'CRITICAL' ? '#B66F55' :
        d.riskLevel === 'HIGH' ? '#8A624E' :
        d.riskLevel === 'MODERATE' ? '#557A95' : '#8FAFC2';

      const poly = L.polygon(d.polygonCoordinates, {
        color: fillColor,
        weight: 2,
        fillColor: fillColor,
        fillOpacity: d.riskLevel === 'CRITICAL' ? 0.35 : d.riskLevel === 'HIGH' ? 0.28 : 0.20,
      }).addTo(polygonLayer);

      poly.bindTooltip(
        `<div style="font-family: var(--font-sans); font-size: 11px;">
           <strong style="color: #18324A;">${d.name} Taluka</strong><br/>
           <span style="font-family: var(--font-mono); font-size: 10px;">${d.riskLevel} · Score ${d.hazardScore.toFixed(2)}</span>
         </div>`,
        { className: 'carto-tooltip', sticky: true }
      );
    });

    // Render sample incident pins
    PROTOTYPE_INCIDENTS.forEach((inc) => {
      const customIcon = L.divIcon({
        className: 'carto-incident-icon',
        html: getIncidentMarkerSvg(inc.type, inc.severity),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker(inc.coordinates, { icon: customIcon }).addTo(incidentLayer);

      const popupHtml = `
        <div style="font-family: var(--font-sans); min-width: 200px; padding: 4px; color: #273038;">
          <div style="font-size: 9px; font-family: var(--font-mono); font-weight: bold; text-transform: uppercase; color: #B66F55; margin-bottom: 2px;">
            ${inc.type.toUpperCase()} INCIDENT · ${inc.timestamp}
          </div>
          <div style="font-family: var(--font-serif); font-size: 13px; font-weight: bold; color: #18324A;">
            ${inc.title}
          </div>
          <div style="font-size: 11px; color: #68747B; margin-bottom: 6px;">
            ${inc.locationName}
          </div>
          <div style="font-size: 11px; line-height: 1.4; border-top: 1px solid #D9D0C4; padding-top: 5px; margin-bottom: 6px;">
            "${inc.description}"
          </div>
          <div style="font-size: 9px; font-family: var(--font-mono); color: #8A624E; background: #F3EEE5; padding: 3px 6px; border: 1px solid #D9D0C4;">
            Source: ${inc.source}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        if (onSelectIncident) onSelectIncident(inc);
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onSelectIncident]);

  // Handle Route Changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();

    if (!activeRoute) return;

    // Render accessible route line
    const routePolyline = L.polyline(activeRoute.waypoints, {
      color: '#18324A',
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: undefined,
    }).addTo(routeLayer);

    // Glowing border underneath
    L.polyline(activeRoute.waypoints, {
      color: '#557A95',
      weight: 9,
      opacity: 0.35,
    }).addTo(routeLayer);

    // Origin marker
    const originIcon = L.divIcon({
      className: 'route-origin-marker',
      html: `
        <div style="width: 22px; height: 22px; background: #18324A; border: 2px solid #FAF8F3; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #FAF8F3; font-size: 10px; font-weight: bold; font-family: var(--font-mono); box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          A
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    L.marker(activeRoute.waypoints[0], { icon: originIcon }).addTo(routeLayer);

    // Destination marker
    const destIcon = L.divIcon({
      className: 'route-dest-marker',
      html: `
        <div style="width: 22px; height: 22px; background: #B66F55; border: 2px solid #FAF8F3; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #FAF8F3; font-size: 10px; font-weight: bold; font-family: var(--font-mono); box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          B
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    L.marker(activeRoute.waypoints[activeRoute.waypoints.length - 1], { icon: destIcon }).addTo(routeLayer);

    // Zoom to route bounds
    map.fitBounds(routePolyline.getBounds(), { padding: [50, 50], maxZoom: 13 });
  }, [activeRoute]);

  return (
    <div className="relative w-full h-full min-h-[480px]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Legend Overlay */}
      <div className="absolute top-4 left-4 z-1000 max-w-xs pointer-events-auto">
        <div className="border border-[#D9D0C4] bg-[#FAF8F3]/95 text-[#273038] text-xs font-sans p-3 shadow-md backdrop-blur-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D9D0C4]">
            <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#18324A]">
              Map Legend
            </span>
            <span className="text-[10px] font-mono text-[#68747B]">PUNE GIS</span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#68747B] font-bold block mb-1">
                Hazard Risk Zones
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#B66F55] opacity-80" />
                  <span>High Risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#557A95] opacity-75" />
                  <span>Moderate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#8FAFC2] opacity-70" />
                  <span>Low Risk</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#D9D0C4]/70 pt-2">
              <span className="text-[10px] font-mono uppercase text-[#68747B] font-bold block mb-1">
                Road Network
              </span>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-1 bg-[#18324A]" />
                  <span>Accessible (Recommended)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-1 bg-[#8A624E]" />
                  <span>At Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-1 bg-[#B66F55]" />
                  <span>Disrupted / Blocked</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#D9D0C4]/70 pt-2">
              <span className="text-[10px] font-mono uppercase text-[#68747B] font-bold block mb-1">
                Field Incidents
              </span>
              <div className="grid grid-cols-1 gap-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#B66F55] shrink-0" />
                  <span>Bridge affected / Road blocked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#8A624E] shrink-0" />
                  <span>Power infrastructure damage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#18324A] shrink-0" />
                  <span>People requiring assistance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
