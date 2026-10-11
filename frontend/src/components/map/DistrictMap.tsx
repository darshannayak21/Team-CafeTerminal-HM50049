'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TalukaDistrict, IncidentMarkerData } from '@/types/prototype';
import { PROTOTYPE_DISTRICTS, matchTalukaForIncident } from '@/data/prototype';
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

  // Layer Group References
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const groundReportsLayerRef = useRef<L.LayerGroup | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup | null>(null);
  const radarLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer Visibility Controls
  const [showReports, setShowReports] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Official LGD Boundaries Cache (same dataset as MainHeroMap)
  const settlementsFeaturesRef = useRef<any[] | null>(null);
  const [settlementsLoaded, setSettlementsLoaded] = useState(false);

  // Real Counts for Legend Badges
  const [reportCount, setReportCount] = useState(0);
  const [stationCount, setStationCount] = useState(0);

  // ── 1. Initialize Leaflet Map ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: district.centerCoordinates,
      zoom: district.zoomLevel,
      minZoom: 9,
      maxZoom: 17,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      }
    ).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);

    // Initialize all layer groups
    polygonLayerRef.current = L.layerGroup().addTo(map);
    radarLayerRef.current = L.layerGroup().addTo(map);
    stationsLayerRef.current = L.layerGroup().addTo(map);
    groundReportsLayerRef.current = L.layerGroup().addTo(map);
    incidentLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Load Live Weather Radar Overlay from RainViewer
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        if (data?.radar?.past?.length > 0 && radarLayerRef.current) {
          const pastFrames = data.radar.past;
          const latestFrame = pastFrames[pastFrames.length - 1];
          const tileUrl = `${data.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;

          L.tileLayer(tileUrl, {
            opacity: 0.55,
            zIndex: 10,
            className: 'weather-radar-layer',
            maxNativeZoom: 7,
            maxZoom: 19,
          }).addTo(radarLayerRef.current);
        }
      })
      .catch(err => console.warn('RainViewer unavailable:', err));

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Load Authentic Taluka Boundaries from pune_settlements.json (identical to Main Dashboard)
  useEffect(() => {
    fetch('/data/pune_settlements.json')
      .then(res => res.json())
      .then(data => {
        if (data?.settlements) {
          settlementsFeaturesRef.current = data.settlements;
          setSettlementsLoaded(true);
        }
      })
      .catch(err => console.warn('Failed to load settlements GeoJSON:', err));
  }, []);

  // ── 2. Update Map, Fly to Taluka, and Draw Authentic LGD Boundary When Taluka Changes ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polygonLayer = polygonLayerRef.current;
    if (!map || !polygonLayer) return;

    polygonLayer.clearLayers();

    const color =
      district.riskLevel === 'CRITICAL' ? '#dc2626' :
      district.riskLevel === 'HIGH' ? '#ea580c' :
      district.riskLevel === 'MODERATE' ? '#d97706' : '#2563eb';

    // Look for matching official taluka feature in pune_settlements.json
    const cleanId = district.id.toLowerCase().replace('pune-', '');
    const match = settlementsFeaturesRef.current?.find((s: any) => {
      const sId = (s.settlement_id || '').toLowerCase().replace('pune-', '');
      const sTal = (s.taluka || '').toLowerCase().replace(' taluka', '');
      const sName = (s.name || '').toLowerCase();
      return sId === cleanId || sTal === cleanId || sName === cleanId || sName.includes(cleanId) || cleanId.includes(sTal);
    });

    let fitted = false;

    if (match && match.geometry) {
      try {
        const geoLayer = L.geoJSON(
          {
            type: 'Feature',
            properties: { name: district.name, taluka: match.taluka },
            geometry: match.geometry,
          } as any,
          {
            style: {
              color: color,
              weight: 2.5,
              dashArray: '5, 5',
              fillColor: color,
              fillOpacity: showBoundary ? 0.12 : 0,
              opacity: showBoundary ? 1 : 0,
            },
          }
        );

        if (showBoundary) {
          geoLayer.addTo(polygonLayer);
        }

        const b = geoLayer.getBounds();
        if (b.isValid()) {
          map.fitBounds(b, { padding: [35, 35], maxZoom: 13, animate: true });
          fitted = true;
        }
      } catch (err) {
        console.warn('GeoJSON boundary render error:', err);
      }
    }

    if (!fitted) {
      // Fallback to polygonCoordinates if GeoJSON not yet loaded
      if (district.polygonCoordinates && district.polygonCoordinates.length >= 3) {
        try {
          const bounds = L.latLngBounds(district.polygonCoordinates);
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13, animate: true });
        } catch {
          map.setView(district.centerCoordinates, Math.max(12, district.zoomLevel));
        }

        if (showBoundary) {
          L.polygon(district.polygonCoordinates, {
            color: color,
            weight: 2.5,
            dashArray: '5, 5',
            fillColor: color,
            fillOpacity: 0.12,
          }).addTo(polygonLayer);
        }
      } else {
        map.setView(district.centerCoordinates, Math.max(12, district.zoomLevel));
      }
    }

  }, [district, showBoundary]);

  // ── 3. Ingest Real Live Ground Reports in This Taluka ──────────────────────
  useEffect(() => {
    let isMounted = true;
    const groundLayer = groundReportsLayerRef.current;
    if (!groundLayer) return;

    groundLayer.clearLayers();
    if (!showReports) return;

    const fetchReports = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/reports');
        if (!res.ok || !isMounted) return;
        const resData = await res.json();
        const reports: any[] = resData.reports || resData.data || [];

        // Filter reports belonging to this taluka or nearby
        const talukaReports = reports.filter(r => {
          if (typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return false;
          
          const assignedId = matchTalukaForIncident(
            {
              taluka: r.taluka,
              location_name: r.location_name,
              description: r.description,
              title: r.incident_type,
              latitude: r.latitude,
              longitude: r.longitude,
            },
            PROTOTYPE_DISTRICTS
          );

          if (assignedId === district.id) return true;

          // Also include reports within close proximity of taluka center (~14km)
          const dist = Math.hypot(r.latitude - district.centerCoordinates[0], r.longitude - district.centerCoordinates[1]);
          return dist <= 0.12;
        });

        setReportCount(talukaReports.length);

        talukaReports.forEach(r => {
          const reportIcon = L.divIcon({
            className: 'live-report-ping-icon',
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; cursor: pointer;">
                <div style="position: absolute; inset: 0; background: #2563eb; border-radius: 50%; opacity: 0.4; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: #0f172a; border: 2px solid #60a5fa; border-radius: 50%; box-shadow: 0 4px 12px rgba(37,99,235,0.6); color: #60a5fa; font-size: 14px;">
                  📍
                </div>
              </div>
            `,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
            popupAnchor: [0, -21],
          });

          const imageUrl = r.image_url 
            ? (r.image_url.startsWith('http') ? r.image_url : `http://localhost:5000${r.image_url}`) 
            : null;

          const formattedTime = new Date(r.timestamp || r.created_at || Date.now()).toLocaleString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const popupHtml = `
            <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 250px; max-width: 320px; padding: 6px; color: #0f172a;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 4px;">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                  <span style="display:inline-block; width:6px; height:6px; background:#16a34a; border-radius:50%;"></span>
                  LIVE GROUND REPORT
                </span>
                <span style="font-size: 10px; font-weight: 700; color: #d97706; background: #fffbeb; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                  ${r.status || 'PENDING'}
                </span>
              </div>

              <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
                ${r.incident_type || 'Field Incident'}
              </div>

              <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                ${r.location_name ? `${r.location_name} · ` : ''}${r.latitude.toFixed(4)}°N, ${r.longitude.toFixed(4)}°E
              </div>

              ${r.description ? `
                <div style="font-size: 12.5px; color: #334155; line-height: 1.4; background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
                  ${r.description}
                </div>
              ` : ''}

              ${imageUrl ? `
                <div style="margin-bottom: 8px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; background: #000;">
                  <img src="${imageUrl}" alt="Field Evidence" style="width: 100%; height: 130px; object-fit: cover; display: block;" onerror="this.style.display='none'" />
                </div>
              ` : ''}

              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                <span>ID: <strong style="font-family: monospace;">${r.id}</strong></span>
                <span>${formattedTime}</span>
              </div>
            </div>
          `;

          L.marker([r.latitude, r.longitude], { icon: reportIcon })
            .bindPopup(popupHtml, { maxWidth: 330 })
            .addTo(groundLayer);
        });
      } catch (e) {
        // Fallback gracefully
      }
    };

    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [district, showReports]);



  // ── 5. Ingest Real Live Weather Stations in This Taluka ────────────────────
  useEffect(() => {
    let isMounted = true;
    const stationsLayer = stationsLayerRef.current;
    if (!stationsLayer) return;

    stationsLayer.clearLayers();
    if (!showStations) return;

    const fetchStations = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/rainfall/live');
        if (!res.ok || !isMounted) return;
        const resData = await res.json();
        const stations: any[] = resData.data || [];

        // Filter stations within ~24km of taluka center
        const talukaStations = stations.filter(s => {
          const d = Math.hypot(s.lat - district.centerCoordinates[0], s.lng - district.centerCoordinates[1]);
          return d <= 0.24;
        });

        setStationCount(talukaStations.length);

        talukaStations.forEach(st => {
          const r = st.rain_1h ?? 0;
          const color =
            r === 0 ? '#64748b' :
            r <= 5 ? '#3b82f6' :
            r <= 25 ? '#eab308' : '#ef4444';

          const stationIcon = L.divIcon({
            className: 'aws-station-icon',
            html: `
              <div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 5px rgba(0,0,0,0.4); cursor: pointer;"></div>
            `,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });

          L.marker([st.lat, st.lng], { icon: stationIcon })
            .bindPopup(`
              <div style="font-family: system-ui, sans-serif; min-width: 170px; padding: 4px; color: #1d1d1f;">
                <div style="font-size: 10px; font-weight: 700; color: #0066cc; text-transform: uppercase; margin-bottom: 2px;">IMD / AWS Station</div>
                <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700;">${st.name}</h4>
                <div style="background: #f5f5f7; border-radius: 6px; padding: 6px; font-size: 11.5px; line-height: 1.5;">
                  <div>Rainfall (1h): <strong style="color: ${color};">${st.rain_1h ?? 0} mm</strong></div>
                  <div>Condition: <strong>${st.condition || 'Precipitation'}</strong></div>
                  <div>Temperature: <strong>${st.temp ? `${st.temp}°C` : 'N/A'}</strong></div>
                  <div>Humidity: <strong>${st.humidity ? `${st.humidity}%` : 'N/A'}</strong></div>
                  <div>Wind Speed: <strong>${st.wind_speed ? `${st.wind_speed} m/s` : 'N/A'}</strong></div>
                </div>
              </div>
            `)
            .addTo(stationsLayer);
        });
      } catch {
        // Fallback gracefully
      }
    };

    fetchStations();
  }, [district, showStations]);

  // ── 6. Update Radar Layer Visibility ──────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !radarLayerRef.current) return;
    if (showRadar) {
      radarLayerRef.current.addTo(mapInstanceRef.current);
    } else {
      mapInstanceRef.current.removeLayer(radarLayerRef.current);
    }
  }, [showRadar]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-[#f5f5f7]">
      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Interactive Layer Control & Legend (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-[16px] border border-[#e5e5ea] shadow-lg text-[#1d1d1f] w-[260px] overflow-hidden transition-all duration-200">
          
          {/* Header Toggle */}
          <button
            type="button"
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-white/70 hover:bg-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0066cc]" />
              <span className="font-semibold text-[13px] tracking-tight">
                Map Layers & Telemetry
              </span>
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transform transition-transform ${isLegendOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Collapsible Layer Toggles */}
          {isLegendOpen && (
            <div className="p-3.5 pt-1 space-y-2.5 border-t border-[#e5e5ea] text-[12px]">
              
              {/* Ground Reports Toggle */}
              <label className="flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] p-1.5 rounded-[8px] transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showReports}
                    onChange={e => setShowReports(e.target.checked)}
                    className="accent-[#2563eb] rounded"
                  />
                  <span className="font-medium text-[#1d1d1f]">Live Ground Reports</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#2563eb]/10 text-[#2563eb] px-2 py-0.5 rounded-full">
                  {reportCount}
                </span>
              </label>

              {/* AWS Weather Stations Toggle */}
              <label className="flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] p-1.5 rounded-[8px] transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showStations}
                    onChange={e => setShowStations(e.target.checked)}
                    className="accent-[#eab308] rounded"
                  />
                  <span className="font-medium text-[#1d1d1f]">IMD Weather Stations</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-black/5 text-[#64748b] px-2 py-0.5 rounded-full">
                  {stationCount}
                </span>
              </label>

              {/* RainViewer Radar Toggle */}
              <label className="flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] p-1.5 rounded-[8px] transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showRadar}
                    onChange={e => setShowRadar(e.target.checked)}
                    className="accent-[#0066cc] rounded"
                  />
                  <span className="font-medium text-[#1d1d1f]">RainViewer Doppler Radar</span>
                </div>
                <span className="text-[10px] text-[#34c759] font-semibold">LIVE</span>
              </label>

              {/* Taluka Boundary Toggle */}
              <label className="flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] p-1.5 rounded-[8px] transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBoundary}
                    onChange={e => setShowBoundary(e.target.checked)}
                    className="accent-[#0066cc] rounded"
                  />
                  <span className="font-medium text-[#1d1d1f]">Taluka LGD Boundary</span>
                </div>
                <span className="text-[10px] text-[#86868b]">LGD</span>
              </label>


            </div>
          )}
        </div>
      </div>
    </div>
  );
};
