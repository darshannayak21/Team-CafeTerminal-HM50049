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
  const [isLegendOpen, setIsLegendOpen] = React.useState(false);

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

    const osmBase = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      }
    ).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);

    const polygonLayer = L.layerGroup().addTo(map);
    const incidentLayer = L.layerGroup().addTo(map);

    polygonLayerRef.current = polygonLayer;
    incidentLayerRef.current = incidentLayer;
    mapInstanceRef.current = map;

    // Create Overlays
    const radarLayerGroup = L.layerGroup().addTo(map);
    // Fetch RainViewer weather radar
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        if (data?.radar?.past?.length > 0) {
          const pastFrames = data.radar.past;
          const latestFrame = pastFrames[pastFrames.length - 1]; // Only the LIVE data
          const tileUrl = `${data.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;
          
          L.tileLayer(tileUrl, {
            opacity: 0.6,
            zIndex: 10,
            className: 'weather-radar-layer',
            maxNativeZoom: 7, // Fixes "Zoom Level Not Supported" error by scaling zoom 7 tiles up
            maxZoom: 19 // Ensure the layer stays visible at high map zoom levels
          }).addTo(radarLayerGroup);
        }
      })
      .catch(err => console.error('Failed to load RainViewer data:', err));

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
        district.riskLevel === 'CRITICAL' ? '#ff3b30' :
          district.riskLevel === 'HIGH' ? '#ff9500' :
            district.riskLevel === 'MODERATE' ? '#ffcc00' : '#0066cc';

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
        <div style="font-family: var(--font-sans); min-width: 220px; padding: 8px; color: var(--color-ink);">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--color-primary); margin-bottom: 4px; letter-spacing: -0.1px;">
            ${inc.title}
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--color-ink); margin-bottom: 2px;">
            ${inc.locationName} · ${inc.timestamp}
          </div>
          <div style="font-size: 14px; line-height: 1.4; border-top: 1px solid var(--color-hairline); padding-top: 8px; margin-bottom: 8px;">
            ${inc.description}
          </div>
          <div style="font-size: 11px; color: var(--color-ink-muted-48); background: var(--color-surface-pearl); padding: 4px 8px; border-radius: 4px; display: inline-block;">
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
    <div className="relative w-full h-full min-h-[380px] bg-canvas">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* District Map Legend (Collapsible) */}
      <div className="absolute top-6 right-6 z-[1000] pointer-events-auto">
        <div className="frosted-glass rounded-lg border border-hairline shadow-sm text-ink w-[220px] overflow-hidden transition-all duration-300">
          <button 
            type="button"
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="w-full flex items-center justify-between p-3 bg-canvas/50 hover:bg-canvas/80 transition-colors"
          >
            <span className="font-semibold text-[13px] tracking-[-0.2px]">Map Legend</span>
            <svg 
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" 
              className={`transform transition-transform ${isLegendOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          
          {isLegendOpen && (
            <div className="p-3 pt-0 space-y-2 border-t border-hairline/50 mt-1">
              <div className="text-[10px] uppercase tracking-[0.2px] text-ink-muted-48 font-semibold block mb-1.5">
                Incidents & Hazards
              </div>
              <div className="space-y-1.5 text-[11px] font-medium tracking-[-0.1px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] shrink-0" />
                  <span>Bridge / Road affected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500] shrink-0" />
                  <span>Infrastructure damage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                  <span>Requires assistance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-ink-muted-48 shrink-0" />
                  <span>Affected settlement</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
