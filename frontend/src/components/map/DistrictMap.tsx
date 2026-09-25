'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TalukaDistrict, IncidentMarkerData } from '@/types/prototype';
import { getIncidentMarkerSvg } from './gisIcons';

interface DistrictMapProps {
  district: TalukaDistrict;
  incidents: IncidentMarkerData[];
  selectedIncident: IncidentMarkerData | null;
  onSelectIncident: (incident: IncidentMarkerData | null) => void;
}

export const DistrictMap: React.FC<DistrictMapProps> = ({
  district,
  incidents,
  onSelectIncident,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: district.centerCoordinates,
      zoom: district.zoomLevel,
      minZoom: 9,
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
    const incidentLayer = L.layerGroup().addTo(map);

    polygonLayerRef.current = polygonLayer;
    incidentLayerRef.current = incidentLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center, bounds, polygon, and incidents when selected district changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polygonLayer = polygonLayerRef.current;
    const incidentLayer = incidentLayerRef.current;
    if (!map || !polygonLayer || !incidentLayer) return;

    polygonLayer.clearLayers();
    incidentLayer.clearLayers();

    // Pan / Zoom to district
    map.setView(district.centerCoordinates, district.zoomLevel);

    // Draw district boundary polygon
    if (district.polygonCoordinates && district.polygonCoordinates.length > 0) {
      const color =
        district.riskLevel === 'CRITICAL' ? '#B66F55' :
        district.riskLevel === 'HIGH' ? '#8A624E' :
        district.riskLevel === 'MODERATE' ? '#557A95' : '#8FAFC2';

      L.polygon(district.polygonCoordinates, {
        color: color,
        weight: 2.5,
        dashArray: '4, 4',
        fillColor: color,
        fillOpacity: 0.15,
      }).addTo(polygonLayer);
    }

    // Filter incidents for this district
    const districtIncidents = incidents.filter(
      (inc) => inc.talukaId.toLowerCase() === district.id.toLowerCase()
    );

    districtIncidents.forEach((inc) => {
      const customIcon = L.divIcon({
        className: 'carto-incident-icon',
        html: getIncidentMarkerSvg(inc.type, inc.severity),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker(inc.coordinates, { icon: customIcon }).addTo(incidentLayer);

      const popupHtml = `
        <div style="font-family: var(--font-sans); min-width: 220px; padding: 4px; color: #273038;">
          <div style="font-size: 10px; font-family: var(--font-mono); font-weight: bold; text-transform: uppercase; color: #B66F55; margin-bottom: 2px;">
            ${inc.title.toUpperCase()}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #18324A; margin-bottom: 2px;">
            ${inc.locationName} · ${inc.timestamp}
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
        onSelectIncident(inc);
      });
    });
  }, [district, incidents, onSelectIncident]);

  return (
    <div className="relative w-full h-full min-h-[380px] bg-[#FAF8F3]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* District Map Legend (Bottom Corner) */}
      <div className="absolute bottom-4 right-4 z-1000 max-w-xs pointer-events-auto">
        <div className="border border-[#D9D0C4] bg-[#FAF8F3]/95 text-[#273038] text-xs font-sans p-2.5 shadow-md">
          <div className="font-serif font-bold text-[11px] uppercase tracking-wider text-[#18324A] pb-1.5 mb-1.5 border-b border-[#D9D0C4]">
            INCIDENTS &amp; HAZARDS
          </div>
          <div className="space-y-1 text-[11px] font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#B66F55] shrink-0" />
              <span>Bridge affected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#B66F55] shrink-0" />
              <span>Road blocked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#8A624E] shrink-0" />
              <span>Infrastructure damage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#18324A] shrink-0" />
              <span>People requiring assistance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#557A95] shrink-0" />
              <span>Affected settlement</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
