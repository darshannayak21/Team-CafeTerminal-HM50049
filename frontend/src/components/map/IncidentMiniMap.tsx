'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface IncidentMiniMapProps {
  coordinates: [number, number] | null;
  title: string;
  severity: string;
  category?: string;
  locationName?: string;
}

export const IncidentMiniMap: React.FC<IncidentMiniMapProps> = ({
  coordinates,
  title,
  severity,
  category,
  locationName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !coordinates) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: coordinates,
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(coordinates, 14, { animate: true });
    }

    const map = mapInstanceRef.current;
    
    // Clear existing marker layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    const pinColor =
      severity === 'CRITICAL' ? '#ff3b30' :
      severity === 'HIGH' ? '#ff9500' :
      severity === 'MODERATE' ? '#ffcc00' : '#0066cc';

    const customIcon = L.divIcon({
      className: '',
      html: `
        <div style="display:inline-flex;align-items:center;gap:6px;background:#1d1d1f;color:#ffffff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:-0.2px;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:2px solid ${pinColor};white-space:nowrap;transform:translate(-50%, -100%);">
          <span style="display:inline-block;width:6px;height:6px;background:${pinColor};border-radius:50%;box-shadow:0 0 6px ${pinColor};"></span>
          <span>${title}</span>
        </div>
      `,
      iconSize: [0, 0],
    });

    const marker = L.marker(coordinates, { icon: customIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;font-size:12px;line-height:1.4;padding:2px 0;">
        <div style="font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#86868b;">${category || 'Emergency Incident'}</div>
        <div style="font-size:14px;font-weight:600;color:#1d1d1f;margin:2px 0;">${title}</div>
        <div style="color:#515154;font-size:11px;">${locationName || 'Field Location'}</div>
        <div style="font-family:monospace;font-size:10.5px;color:#0066cc;margin-top:3px;">${coordinates[0].toFixed(4)}° N, ${coordinates[1].toFixed(4)}° E</div>
        <div style="color:${pinColor};font-weight:600;font-size:11px;margin-top:4px;">● Severity: ${severity}</div>
      </div>
    `);

    L.circle(coordinates, {
      radius: 400,
      color: pinColor,
      fillColor: pinColor,
      fillOpacity: 0.12,
      weight: 1.5,
    }).addTo(map);

    return () => {
      // Keep instance active
    };
  }, [coordinates, title, severity, category, locationName]);

  if (!coordinates) {
    return (
      <div className="w-full h-full min-h-[220px] rounded-[14px] bg-[#f5f5f7] border border-[#e5e5ea] flex flex-col items-center justify-center p-6 text-center text-[#86868b]">
        <span className="text-2xl mb-1">📍</span>
        <span className="text-[13px] font-medium text-[#1d1d1f]">Geographic Coordinates Unavailable</span>
        <span className="text-[11px] mt-0.5">This incident report does not contain GPS latitude/longitude coordinates.</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative z-0 rounded-[14px] overflow-hidden border border-[#e5e5ea] bg-white min-h-[220px]">
      <div ref={mapContainerRef} className="w-full h-full min-h-[220px]" />
      <div className="absolute top-2.5 left-2.5 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-[#e5e5ea] text-[11px] font-medium text-[#1d1d1f] shadow-sm flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc]"></span>
        <span>Target Locus Map · {coordinates[0].toFixed(4)}°, {coordinates[1].toFixed(4)}°</span>
      </div>
    </div>
  );
};
