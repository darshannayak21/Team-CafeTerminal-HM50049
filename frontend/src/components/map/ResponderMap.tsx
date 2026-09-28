'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons for the route
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function ResponderMap({ route, reports = [], news = [], additionalRoutes = [] }: { route?: [number, number][], reports?: any[], news?: any[], additionalRoutes?: any[] }) {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Could not get responder location, falling back to dispatch center", error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Use provided route or fallback to empty array
  const baseRoute = route || [];
  
  // Replace the first point with the responder's real location if available
  const routePositions: [number, number][] = baseRoute.length > 0 ? [
    currentLocation || baseRoute[0],
    ...baseRoute.slice(1)
  ] : [];
  
  // Calculate center based on route or default to Pune
  const center = routePositions.length > 0 
    ? routePositions[Math.floor(routePositions.length / 2)] 
    : [18.5204, 73.8567] as [number, number];

  const reportIcon = typeof window !== 'undefined' ? L.divIcon({
    className: '',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; cursor: pointer;">
        <div style="position: absolute; inset: 0; background: #2563eb; border-radius: 50%; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: #0f172a; border: 2px solid #60a5fa; border-radius: 50%; box-shadow: 0 4px 12px rgba(37,99,235,0.6); color: #60a5fa; font-size: 15px;">📍</div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  }) : undefined;

  const newsIcon = typeof window !== 'undefined' ? L.divIcon({
    className: '',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; cursor: pointer;">
        <div style="position: absolute; inset: 0; background: #3b82f6; border-radius: 50%; opacity: 0.3; animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #ffffff; border: 2.5px solid #2563eb; border-radius: 50%; box-shadow: 0 4px 12px rgba(37,99,235,0.4); color: #2563eb; font-size: 14px;">📰</div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  }) : undefined;

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Global Reports Markers */}
        {reportIcon && reports.map((r: any) => (
          typeof r.latitude === 'number' && typeof r.longitude === 'number' && (
            <Marker key={r.id} position={[r.latitude, r.longitude]} icon={reportIcon}>
              <Popup>
                <strong>{r.incident_type}</strong><br/>
                {r.location_name || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}
              </Popup>
            </Marker>
          )
        ))}

        {/* Global News Markers */}
        {newsIcon && news.map((n: any) => (
          typeof n.latitude === 'number' && typeof n.longitude === 'number' && (
            <Marker key={n.id} position={[n.latitude, n.longitude]} icon={newsIcon}>
              <Popup>
                <strong>{n.title}</strong><br/>
                {n.source}
              </Popup>
            </Marker>
          )
        ))}

        {/* Route Line */}
        <Polyline 
          positions={routePositions} 
          pathOptions={{ color: '#dc2626', weight: 6, opacity: 0.8 }} 
        />

        {/* Start Marker */}
        {routePositions.length > 0 && (
          <Marker position={routePositions[0]} icon={startIcon}>
            <Popup>Current Location: Team Alpha</Popup>
          </Marker>
        )}

        {/* Additional Background Routes */}
        {additionalRoutes.map((ar, idx) => (
          <React.Fragment key={`ar-${idx}`}>
            <Polyline 
              positions={ar.waypoints} 
              pathOptions={{ color: ar.color || '#eab308', weight: 5, opacity: 0.8, dashArray: '5, 10' }} 
            />
            {/* Start Marker for Additional Route */}
            {ar.waypoints.length > 0 && (
              <Marker position={ar.waypoints[0]} icon={startIcon}>
                <Popup>{ar.teamName || 'Other Team'}</Popup>
              </Marker>
            )}
            {/* End Marker for Additional Route */}
            {ar.waypoints.length > 0 && (
              <Marker position={ar.waypoints[ar.waypoints.length - 1]} icon={endIcon}>
                <Popup>Destination</Popup>
              </Marker>
            )}
          </React.Fragment>
        ))}

        {/* Destination Marker */}
        {routePositions.length > 0 && (
          <Marker position={routePositions[routePositions.length - 1]} icon={endIcon}>
            <Popup>
              <strong>Destination</strong><br/>
              Proceed with caution.
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {/* Route Status Overlay */}
      {routePositions.length > 0 && (
        <div className="absolute top-6 left-6 z-[1000] bg-white px-4 py-3 rounded-lg shadow-lg border border-hairline flex flex-col gap-1">
          <span className="text-[12px] font-bold text-ink uppercase tracking-wide">Navigating to Scene</span>
          <span className="text-[14px] text-ink-muted-80">ETA: 12 minutes (4.2 km)</span>
        </div>
      )}
    </div>
  );
}
