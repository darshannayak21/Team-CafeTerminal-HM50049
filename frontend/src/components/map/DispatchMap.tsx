'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Assignment {
  id: string;
  incident_id: string;
  incident_title: string;
  incident_location: string;
  incident_lat: number | null;
  incident_lon: number | null;
  severity: string;
  unit_name: string;
  vehicle_type: string;
  origin_name: string;
  distance_km: number | null;
  duration_minutes: number | null;
  safety_status: string | null;
  status: string;
  route_waypoints?: [number, number][];
}

interface Shelter {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface DispatchMapProps {
  basePoint: [number, number];
  baseName: string;
  departmentName: string;
  activeAssignment: Assignment | null;
  shelters?: Shelter[];
}

export const DispatchMap: React.FC<DispatchMapProps> = ({
  basePoint,
  baseName,
  departmentName,
  activeAssignment,
  shelters = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const lastFittedAssignmentIdRef = useRef<string | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: basePoint,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layersRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // 1. Point A: Base Headquarters Pin (Apple Sleek Black Pill)
    const baseIcon = L.divIcon({
      className: '',
      html: `
        <div style="display:inline-flex;align-items:center;gap:6px;background:#1d1d1f;color:#ffffff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:-0.2px;box-shadow:0 2px 8px rgba(0,0,0,0.18);border:1px solid rgba(255,255,255,0.2);white-space:nowrap;transform:translate(-50%, -100%);">
          <span style="display:inline-block;width:6px;height:6px;background:#34c759;border-radius:50%;"></span>
          <span>Point A · ${baseName}</span>
        </div>
      `,
      iconSize: [0, 0],
    });

    const baseMarker = L.marker(basePoint, { icon: baseIcon }).addTo(layers);
    baseMarker.bindPopup(`
      <div style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;font-size:12px;line-height:1.4;padding:2px 0;">
        <div style="font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#86868b;">Base Headquarters</div>
        <div style="font-size:14px;font-weight:600;color:#1d1d1f;margin:2px 0;">${baseName}</div>
        <div style="color:#86868b;font-size:11px;">${departmentName}</div>
        <div style="font-family:monospace;font-size:10.5px;color:#0066cc;margin-top:3px;">${basePoint[0].toFixed(4)}° N, ${basePoint[1].toFixed(4)}° E</div>
        <div style="color:#34c759;font-weight:600;font-size:11px;margin-top:4px;">● Standby Readiness</div>
      </div>
    `);

    // Radius Circle around Point A Base Camp
    L.circle(basePoint, {
      radius: 450,
      color: '#0066cc',
      fillColor: '#0066cc',
      fillOpacity: 0.08,
      weight: 1.2,
    }).addTo(layers);

    // If an incident assignment is active
    if (activeAssignment && activeAssignment.incident_lat && activeAssignment.incident_lon) {
      const destPoint: [number, number] = [activeAssignment.incident_lat, activeAssignment.incident_lon];

      // 2. Point B: Incident Destination Pin (Apple Action Blue Pill)
      const incidentIcon = L.divIcon({
        className: '',
        html: `
          <div style="display:inline-flex;align-items:center;gap:6px;background:#0066cc;color:#ffffff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:-0.2px;box-shadow:0 2px 8px rgba(0,102,204,0.3);border:1px solid rgba(255,255,255,0.3);white-space:nowrap;transform:translate(-50%, -100%);">
            <span style="display:inline-block;width:6px;height:6px;background:#ffffff;border-radius:50%;"></span>
            <span>Point B · ${activeAssignment.incident_title || 'Incident Location'}</span>
          </div>
        `,
        iconSize: [0, 0],
      });

      const incMarker = L.marker(destPoint, { icon: incidentIcon }).addTo(layers);
      incMarker.bindPopup(`
        <div style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;font-size:12px;line-height:1.4;padding:2px 0;">
          <div style="font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#86868b;">Point B Target</div>
          <div style="font-size:14px;font-weight:600;color:#1d1d1f;margin:2px 0;">${activeAssignment.incident_title}</div>
          <div style="color:#515154;font-size:11px;">${activeAssignment.incident_location}</div>
          <div style="color:#0066cc;font-weight:600;font-size:11px;margin-top:3px;">Severity: ${activeAssignment.severity}</div>
        </div>
      `);

      // 3. Route Polyline
      let routeCoords: [number, number][] = [];
      if (activeAssignment.route_waypoints && activeAssignment.route_waypoints.length > 1) {
        routeCoords = activeAssignment.route_waypoints;
      } else {
        routeCoords = [basePoint, destPoint];
      }

      // Outer halo
      L.polyline(routeCoords, {
        color: '#0066cc',
        weight: 5,
        opacity: 0.25,
      }).addTo(layers);

      // Main route polyline
      L.polyline(routeCoords, {
        color: '#0066cc',
        weight: 3,
        opacity: 0.95,
      }).addTo(layers);

      // Only fit bounds if assignment changed or on initial selection
      if (lastFittedAssignmentIdRef.current !== activeAssignment.id) {
        lastFittedAssignmentIdRef.current = activeAssignment.id;
        const bounds = L.latLngBounds([basePoint, destPoint]);
        routeCoords.forEach(pt => bounds.extend(pt));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } else {
      if (lastFittedAssignmentIdRef.current !== 'BASE_ONLY') {
        lastFittedAssignmentIdRef.current = 'BASE_ONLY';
        map.setView(basePoint, 13, { animate: true });
      }
    }
  }, [basePoint, baseName, departmentName, activeAssignment]);

  return (
    <div className="w-full h-full relative z-0 rounded-[18px] overflow-hidden border border-hairline bg-canvas min-h-[440px]">
      <div ref={mapContainerRef} className="w-full h-full min-h-[440px]" />
      <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-hairline text-[11px] font-medium text-ink flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]"></span>
        <span>Tactical GPS Telemetry · Point A Base</span>
      </div>
    </div>
  );
};
