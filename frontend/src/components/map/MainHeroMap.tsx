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
  showElevation?: boolean; // kept for compatibility but not strictly needed anymore
}

export const MainHeroMap: React.FC<MainHeroMapProps> = ({
  activeRoute,
  onSelectIncident,
  showElevation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [isLegendOpen, setIsLegendOpen] = React.useState(false);

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
    const routeLayer = L.layerGroup().addTo(map);
    const incidentLayer = L.layerGroup().addTo(map);

    polygonLayerRef.current = polygonLayer;
    routeLayerRef.current = routeLayer;
    incidentLayerRef.current = incidentLayer;
    mapInstanceRef.current = map;

    // Create Overlays
    const radarLayerGroup = L.layerGroup().addTo(map); // Radar always ON
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
            maxNativeZoom: 7,
            maxZoom: 19
          }).addTo(radarLayerGroup);
        }
      })
      .catch(err => console.error('Failed to load RainViewer data:', err));

    const elevationLayerGroup = L.layerGroup().addTo(map);
    let currentOverlay: L.ImageOverlay | null = null;
    let isElevationActive = true;

    const fetchHeatmap = () => {
      if (!isElevationActive) return;
      const bounds = map.getBounds();
      // Clamp to our data bounds
      const lat_min = Math.max(18.0, bounds.getSouth());
      const lat_max = Math.min(19.0, bounds.getNorth());
      const lng_min = Math.max(73.0, bounds.getWest());
      const lng_max = Math.min(75.0, bounds.getEast());

      if (lat_min >= lat_max || lng_min >= lng_max) return;

      fetch(`http://localhost:5000/api/elevation/heatmap?lat_min=${lat_min}&lat_max=${lat_max}&lng_min=${lng_min}&lng_max=${lng_max}&width=512&height=512`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.image) {
            if (currentOverlay) {
               elevationLayerGroup.removeLayer(currentOverlay);
            }
            const newBounds: L.LatLngBoundsExpression = [[lat_min, lng_min], [lat_max, lng_max]];
            currentOverlay = L.imageOverlay(data.image, newBounds, { opacity: 0.85, zIndex: 5 });
            elevationLayerGroup.addLayer(currentOverlay);
          }
        })
        .catch(err => console.error('Failed to load dynamic heatmap:', err));
    };

    // Initial fetch
    fetchHeatmap();

    map.on('moveend', fetchHeatmap);
    map.on('zoomend', fetchHeatmap);

    map.on('overlayadd', (e: any) => {
      if (e.name === 'Terrain Elevation (SRTM)') {
        isElevationActive = true;
        fetchHeatmap();
      }
    });

    map.on('overlayremove', (e: any) => {
      if (e.name === 'Terrain Elevation (SRTM)') {
        isElevationActive = false;
        if (currentOverlay) {
           elevationLayerGroup.removeLayer(currentOverlay);
           currentOverlay = null;
        }
      }
    });

    // Add Layer Control
    L.control.layers(
      { 'OpenStreetMap': osmBase },
      { 'Terrain Elevation (SRTM)': elevationLayerGroup },
      { position: 'topright', collapsed: false }
    ).addTo(map);

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
        `<div style="font-family: var(--font-sans); font-size: 14px; font-weight: 500;">
           <strong style="color: var(--color-ink);">${d.name}</strong><br/>
           <span style="font-size: 12px; color: var(--color-ink-muted-80);">${d.riskLevel} · Score ${d.hazardScore.toFixed(2)}</span>
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
        <div style="font-family: var(--font-sans); min-width: 220px; padding: 8px; color: var(--color-ink);">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--color-primary); margin-bottom: 4px; letter-spacing: -0.1px;">
            ${inc.type} · ${inc.timestamp}
          </div>
          <div style="font-size: 15px; font-weight: 600; color: var(--color-ink); margin-bottom: 2px; letter-spacing: -0.2px;">
            ${inc.title}
          </div>
          <div style="font-size: 13px; color: var(--color-ink-muted-80); margin-bottom: 8px;">
            ${inc.locationName}
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
        <div style="width: 24px; height: 24px; background: var(--color-primary); border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 12px; font-weight: 600; font-family: var(--font-sans); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          A
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    L.marker(activeRoute.waypoints[0], { icon: originIcon }).addTo(routeLayer);

    // Destination marker
    const destIcon = L.divIcon({
      className: 'route-dest-marker',
      html: `
        <div style="width: 24px; height: 24px; background: #1d1d1f; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 12px; font-weight: 600; font-family: var(--font-sans); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          B
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    L.marker(activeRoute.waypoints[activeRoute.waypoints.length - 1], { icon: destIcon }).addTo(routeLayer);

    // Zoom to route bounds
    map.fitBounds(routePolyline.getBounds(), { padding: [50, 50], maxZoom: 13 });
  }, [activeRoute]);

  // Remove old Elevation effect as it's now handled by Layer Control

  return (
    <div className="relative w-full h-full min-h-[480px]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Legend Overlay (Collapsible) */}
      <div className="absolute top-[180px] right-6 z-[1000] pointer-events-auto">
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
            <div className="p-3 pt-0 space-y-3 border-t border-hairline/50 mt-1">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2px] text-ink-muted-48 font-semibold block mb-1.5">
                  Risk Zones
                </span>
                <div className="grid grid-cols-1 gap-1.5 text-[11px] font-medium tracking-[-0.1px]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-[3px] bg-[#B66F55] opacity-80" />
                    <span>High Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-[3px] bg-[#557A95] opacity-75" />
                    <span>Moderate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-[3px] bg-[#8FAFC2] opacity-70" />
                    <span>Low Risk</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-divider-soft pt-2">
                <span className="text-[10px] uppercase tracking-[0.2px] text-ink-muted-48 font-semibold block mb-1.5">
                  Incidents
                </span>
                <div className="grid grid-cols-1 gap-1.5 text-[11px] font-medium tracking-[-0.1px] leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] shrink-0" />
                    <span>Road Blocked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500] shrink-0" />
                    <span>Power Damage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                    <span>Needs Assistance</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
