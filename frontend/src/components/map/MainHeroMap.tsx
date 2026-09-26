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
  focusLocation?: [number, number] | null;
}

export const MainHeroMap: React.FC<MainHeroMapProps> = ({
  activeRoute,
  onSelectIncident,
  showElevation,
  focusLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const [showWards, setShowWards] = React.useState(false);
  const [showWorldPop, setShowWorldPop] = React.useState(false);
  const [showTalukas, setShowTalukas] = React.useState(false);
  const [showElevationLayer, setShowElevationLayer] = React.useState(false);
  const [showStations, setShowStations] = React.useState(false);
  const [isLegendOpen, setIsLegendOpen] = React.useState(false);
  
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  
  const wardsLayerRef = useRef<L.Layer | null>(null);
  const worldPopLayerRef = useRef<L.Layer | null>(null);
  const talukasLayerRef = useRef<L.Layer | null>(null);
  
  const elevationLayerRef = useRef<L.LayerGroup | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup | null>(null);

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

    // Initialize polygon, route and incident layers here...
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

    elevationLayerRef.current = L.layerGroup();
    stationsLayerRef.current = L.layerGroup();

    // Render Navale Bridge incident mock
    const navaleIcon = L.divIcon({
      className: '',
      html: `
        <div class="relative flex items-center justify-center w-14 h-14">
          <div class="absolute inset-0 bg-[#ff3b30] rounded-full opacity-50 animate-ping"></div>
          <div class="relative flex items-center justify-center w-8 h-8 bg-white border-[3px] border-[#ff3b30] rounded-full shadow-[0_4px_12px_rgba(255,59,48,0.5)]">
            <span class="text-[#ff3b30] font-black text-[22px] leading-none mt-[2px]">!</span>
          </div>
        </div>
      `,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
      popupAnchor: [0, -28],
    });

    const navaleMarker = L.marker([18.45999, 73.82313], { icon: navaleIcon }).addTo(incidentLayer);
    
    const popupHtml = `
      <div style="font-family: var(--font-sans); min-width: 220px; padding: 8px; color: var(--color-ink);">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ff3b30; margin-bottom: 4px; letter-spacing: -0.1px; display: flex; align-items: center; gap: 4px;">
          <span style="display:inline-block; width:6px; height:6px; background:#ff3b30; border-radius:50%; animation: pulse 2s infinite;"></span>
          LIVE ALERT
        </div>
        <div style="font-size: 15px; font-weight: 600; color: var(--color-ink); margin-bottom: 2px; letter-spacing: -0.2px;">
          Navale Bridge Collapse
        </div>
        <div style="font-size: 13px; color: var(--color-ink-muted-80); margin-bottom: 8px;">
          NH48 Highway
        </div>
        <div style="font-size: 14px; line-height: 1.4; border-top: 1px solid var(--color-hairline); padding-top: 8px; margin-bottom: 8px;">
          Major structural failure reported on Navale Bridge. Road blocked in both directions. Avoid area.
        </div>
        <div style="font-size: 11px; color: var(--color-ink-muted-48); background: var(--color-surface-pearl); padding: 4px 8px; border-radius: 4px; display: inline-block;">
          Source: Punekar News
        </div>
      </div>
    `;

    navaleMarker.bindPopup(popupHtml);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onSelectIncident]);

  // Handle Focus Location Change
  useEffect(() => {
    if (mapInstanceRef.current && focusLocation) {
      mapInstanceRef.current.flyTo(focusLocation, 14, {
        animate: true,
        duration: 1.5
      });
    }
  }, [focusLocation]);

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

  // PMC Wards Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    if (showWards) {
      if (!wardsLayerRef.current) {
        fetch('/data/pune-admin-wards.geojson')
          .then(res => res.json())
          .then(data => {
            wardsLayerRef.current = L.geoJSON(data, {
              style: { color: '#2563eb', weight: 2.5, fillOpacity: 0.1, dashArray: undefined },
              onEachFeature: (feature, layer) => {
                if (feature.properties && feature.properties.ward_name) {
                  layer.bindTooltip(feature.properties.ward_name, { sticky: true, className: 'text-xs font-semibold' });
                }
              }
            });
            wardsLayerRef.current.addTo(map);
          });
      } else {
        wardsLayerRef.current.addTo(map);
      }
    } else {
      if (wardsLayerRef.current) map.removeLayer(wardsLayerRef.current);
    }
  }, [showWards]);

  // LGD Talukas Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    if (showTalukas) {
      if (!talukasLayerRef.current) {
        fetch('/data/pune_settlements.json')
          .then(res => res.json())
          .then(data => {
            if (!data.settlements) return;
            const puneFeatures = data.settlements.map((s: any) => ({
              type: 'Feature',
              properties: { sdtname: s.taluka, sdtcode: s.settlement_id },
              geometry: s.geometry
            }));
            talukasLayerRef.current = L.geoJSON({ type: 'FeatureCollection', features: puneFeatures } as any, {
              style: { color: '#10b981', weight: 2, fillOpacity: 0.05, dashArray: undefined },
              onEachFeature: (feature, layer) => {
                if (feature.properties && feature.properties.sdtname) {
                  layer.bindTooltip(
                    `<b>Taluka:</b> ${feature.properties.sdtname}<br/><b>ID:</b> ${feature.properties.sdtcode || 'N/A'}`
                  , { sticky: true });
                }
              }
            });
            talukasLayerRef.current.addTo(map);
          });
      } else {
        talukasLayerRef.current.addTo(map);
      }
    } else {
      if (talukasLayerRef.current) map.removeLayer(talukasLayerRef.current);
    }
  }, [showTalukas]);

  // WorldPop 2020 Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (showWorldPop) {
      if (!worldPopLayerRef.current) {
        fetch('/data/pune_settlements.json')
          .then(res => res.json())
          .then(data => {
            if (!data.settlements) return;
            const features = data.settlements.map((s: any) => ({
              type: 'Feature',
              properties: { population: s.population, taluka: s.taluka },
              geometry: s.geometry
            }));
            
            const maxPop = Math.max(...features.map((f: any) => f.properties.population));
            const minPop = Math.min(...features.map((f: any) => f.properties.population));
            
            const getColor = (d: number) => {
              const r = (d - minPop) / (maxPop - minPop);
              return r > 0.8 ? '#800026' :
                     r > 0.6 ? '#bd0026' :
                     r > 0.4 ? '#e31a1c' :
                     r > 0.2 ? '#fc4e2a' :
                     r > 0.1 ? '#fd8d3c' :
                     r > 0.05 ? '#feb24c' :
                     '#ffeda0';
            };

            worldPopLayerRef.current = L.geoJSON({ type: 'FeatureCollection', features } as any, {
              style: (feature: any) => ({
                fillColor: getColor(feature.properties.population),
                weight: 1,
                opacity: 0.5,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.6
              }),
              onEachFeature: (feature, layer) => {
                layer.bindTooltip(`<b>Population:</b> ${Math.round(feature.properties.population).toLocaleString()}<br/><b>Taluka:</b> ${feature.properties.taluka}`, { sticky: true });
              }
            });
            worldPopLayerRef.current.addTo(map);
          });
      } else {
        worldPopLayerRef.current.addTo(map);
      }
    } else {
      if (worldPopLayerRef.current) map.removeLayer(worldPopLayerRef.current);
    }
  }, [showWorldPop]);

  // Terrain Elevation (Dynamic)
  useEffect(() => {
    if (!mapInstanceRef.current || !elevationLayerRef.current) return;
    const map = mapInstanceRef.current;
    let currentOverlay: L.ImageOverlay | null = null;
    
    const fetchHeatmap = () => {
      const bounds = map.getBounds();
      const lat_min = Math.max(18.0, bounds.getSouth());
      const lat_max = Math.min(19.0, bounds.getNorth());
      const lng_min = Math.max(73.0, bounds.getWest());
      const lng_max = Math.min(75.0, bounds.getEast());

      if (lat_min >= lat_max || lng_min >= lng_max) return;

      fetch(`http://localhost:5000/api/elevation/heatmap?lat_min=${lat_min}&lat_max=${lat_max}&lng_min=${lng_min}&lng_max=${lng_max}&width=512&height=512`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.image && elevationLayerRef.current) {
            if (currentOverlay) {
               elevationLayerRef.current.removeLayer(currentOverlay);
            }
            const newBounds: L.LatLngBoundsExpression = [[lat_min, lng_min], [lat_max, lng_max]];
            currentOverlay = L.imageOverlay(data.image, newBounds, { opacity: 0.85, zIndex: 5 });
            elevationLayerRef.current.addLayer(currentOverlay);
          }
        })
        .catch(err => console.error('Failed to load dynamic heatmap:', err));
    };

    if (showElevationLayer) {
      elevationLayerRef.current.addTo(map);
      fetchHeatmap();
      map.on('moveend', fetchHeatmap);
      map.on('zoomend', fetchHeatmap);
    } else {
      if (elevationLayerRef.current) map.removeLayer(elevationLayerRef.current);
      map.off('moveend', fetchHeatmap);
      map.off('zoomend', fetchHeatmap);
    }

    return () => {
      map.off('moveend', fetchHeatmap);
      map.off('zoomend', fetchHeatmap);
    };
  }, [showElevationLayer]);

  // IMD AWS Weather Stations
  useEffect(() => {
    if (!mapInstanceRef.current || !stationsLayerRef.current) return;
    const map = mapInstanceRef.current;

    const getRainfallColor = (rain1h: number) => {
      if (rain1h === 0) return '#6b7280'; // gray (no rain)
      if (rain1h <= 2.5) return '#3b82f6'; // blue (light)
      if (rain1h <= 7.5) return '#22c55e'; // green (moderate)
      if (rain1h <= 35.5) return '#eab308'; // yellow (heavy)
      if (rain1h <= 64.4) return '#f97316'; // orange (very heavy)
      return '#ef4444'; // red (extreme)
    };

    if (showStations) {
      if (stationsLayerRef.current.getLayers().length === 0) {
        fetch('http://localhost:5000/api/rainfall/live')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data && stationsLayerRef.current) {
              data.data.forEach((station: any) => {
                const color = getRainfallColor(station.rain_1h);
                const markerHtml = `
                  <div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>
                `;
                const icon = L.divIcon({ html: markerHtml, className: '', iconSize: [14, 14], iconAnchor: [7, 7] });
                
                L.marker([station.lat, station.lng], { icon })
                  .bindPopup(`
                    <div style="min-width: 150px; font-family: sans-serif;">
                      <h4 style="margin: 0 0 8px 0; border-bottom: 1px solid #ccc; padding-bottom: 4px;">${station.name}</h4>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Rain (1h):</span> <strong>${station.rain_1h} mm</strong></div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Temp:</span> <strong>${station.temp}°C</strong></div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Condition:</span> <strong>${station.condition}</strong></div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Humidity:</span> <strong>${station.humidity}%</strong></div>
                      <div style="display: flex; justify-content: space-between;"><span>Wind:</span> <strong>${station.wind_speed} m/s</strong></div>
                    </div>
                  `)
                  .addTo(stationsLayerRef.current!);
              });
            }
          })
          .catch(err => console.error('Failed to load live rainfall:', err));
      }
      stationsLayerRef.current.addTo(map);
    } else {
      if (stationsLayerRef.current) map.removeLayer(stationsLayerRef.current);
    }
  }, [showStations]);

  return (
    <div className="relative w-full h-full min-h-[480px]">
      {/* Map Layers Panel */}
      <div className="absolute top-4 right-16 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200/50 w-64 pointer-events-auto">
        <h3 className="text-[11px] font-bold text-slate-800 tracking-wider mb-3">MAP LAYERS</h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={showWards} 
              onChange={() => setShowWards(!showWards)}
              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer" 
            />
            <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900">PMC Wards</span>
          </label>

          <div className="flex flex-col">
            <label className="flex items-center space-x-3 cursor-pointer group mb-1.5">
              <input 
                type="checkbox" 
                checked={showWorldPop} 
                onChange={() => setShowWorldPop(!showWorldPop)}
                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer" 
              />
              <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900">Population — WorldPop 2020</span>
            </label>
            {showWorldPop && (
              <div className="pl-7 pr-2 w-full transition-all duration-300">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#ffeda0] via-[#fc4e2a] to-[#800026] rounded-sm mb-1" />
                <div className="flex justify-between text-[9px] text-slate-500 font-medium uppercase tracking-wide">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center space-x-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={showTalukas} 
              onChange={() => setShowTalukas(!showTalukas)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
            />
            <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900">LGD Talukas</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer group pt-2 border-t border-slate-200">
            <input 
              type="checkbox" 
              checked={showElevationLayer} 
              onChange={() => setShowElevationLayer(!showElevationLayer)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
            />
            <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900">Terrain Elevation (SRTM)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={showStations} 
              onChange={() => setShowStations(!showStations)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
            />
            <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900">IMD AWS Weather</span>
          </label>
        </div>
      </div>
      <div ref={mapContainerRef} className="w-full h-full" />

    </div>
  );
};
