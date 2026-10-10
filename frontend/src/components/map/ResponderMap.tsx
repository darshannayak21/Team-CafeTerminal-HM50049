'use client';

import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

export default function ResponderMap({
  route,
  reports = [],
  additionalRoutes = [],
  etaMinutes,
  distanceKm,
  riskScore,
  safetyStatus,
}: {
  route?: [number, number][];
  reports?: any[];
  additionalRoutes?: any[];
  etaMinutes?: number;
  distanceKm?: string | number;
  riskScore?: number;
  safetyStatus?: string;
}) {
  const routePositions: [number, number][] = route || [];

  const [popup, setPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    distance?: string | number;
    eta?: number;
  } | null>(null);

  const center: [number, number] = routePositions.length > 0
    ? routePositions[Math.floor(routePositions.length / 2)]
    : [18.5204, 73.8567];

  const routeColor =
    riskScore !== undefined
      ? riskScore >= 0.6 ? '#dc2626'
      : riskScore >= 0.35 ? '#ea580c'
      : riskScore >= 0.15 ? '#ca8a04'
      : '#16a34a'
    : '#2563eb';

  const safetyLabel =
    safetyStatus === 'CONFIRMED_BLOCKED' || safetyStatus === 'BLOCKED_SEGMENTS_DETECTED' ? 'Auto-rerouted around blockages'
    : safetyStatus === 'HIGH_RISK_ROUTE' ? 'High Risk — Exercise Caution'
    : safetyStatus === 'ELEVATED_RISK_ROUTE' ? 'Elevated Risk'
    : safetyStatus === 'CLEAR' || safetyStatus === 'LOW_RISK_ROUTE' ? 'Route Clear'
    : null;

  const reportIcon = typeof window !== 'undefined'
    ? L.divIcon({
        className: '',
        html: `<div style="width:12px;height:12px;background:#dc2626;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6], popupAnchor: [0, -8],
      })
    : undefined;

  const showPopup = (e: L.LeafletMouseEvent, label: string, distance?: string | number, eta?: number) => {
    const containerPoint = e.containerPoint;
    setPopup({
      visible: true,
      x: containerPoint.x,
      y: containerPoint.y,
      label,
      distance,
      eta,
    });
  };

  const hidePopup = () => setPopup(null);

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

        {/* Ground Report Markers */}
        {reportIcon && reports.map((r: any) =>
          typeof r.latitude === 'number' && typeof r.longitude === 'number' ? (
            <Marker key={r.id} position={[r.latitude, r.longitude]} icon={reportIcon}>
              <Popup><strong>{r.incident_type}</strong><br />{r.location_name || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}</Popup>
            </Marker>
          ) : null
        )}

        {/* Route glow (non-interactive) */}
        {routePositions.length > 0 && (
          <Polyline
            positions={routePositions}
            pathOptions={{ color: routeColor, weight: 16, opacity: 0.18, interactive: false }}
          />
        )}

        {/* Main route — click to show popup */}
        {routePositions.length > 0 && (
          <Polyline
            positions={routePositions}
            pathOptions={{ color: routeColor, weight: 6, opacity: 0.9, interactive: true }}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                showPopup(e, 'Active Mission', distanceKm, etaMinutes);
              },
              mouseover: (e) => showPopup(e, 'Active Mission', distanceKm, etaMinutes),
              mouseout: hidePopup,
            }}
          />
        )}

        {/* Origin + Destination markers */}
        {routePositions.length > 0 && (
          <>
            <Marker position={routePositions[0]} icon={startIcon}>
              <Popup><strong>Dispatch Point</strong></Popup>
            </Marker>
            <Marker position={routePositions[routePositions.length - 1]} icon={endIcon}>
              <Popup><strong>Destination</strong><br />Proceed with caution.</Popup>
            </Marker>
          </>
        )}

        {/* Additional routes (other teams) */}
        {additionalRoutes.map((ar, idx) => (
          <React.Fragment key={`ar-${idx}`}>
            <Polyline
              positions={ar.waypoints}
              pathOptions={{ color: ar.color || '#eab308', weight: 5, opacity: 0.7, dashArray: '8, 12', interactive: true }}
              eventHandlers={{
                click: (e) => { L.DomEvent.stopPropagation(e); showPopup(e, ar.teamName || 'Other Team'); },
                mouseover: (e) => showPopup(e, ar.teamName || 'Other Team'),
                mouseout: hidePopup,
              }}
            />
            {ar.waypoints.length > 0 && <Marker position={ar.waypoints[0]} icon={startIcon}><Popup>{ar.teamName || 'Other Team'}</Popup></Marker>}
            {ar.waypoints.length > 0 && <Marker position={ar.waypoints[ar.waypoints.length - 1]} icon={endIcon}><Popup>Destination</Popup></Marker>}
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Floating route info popup — follows mouse position */}
      {popup?.visible && (
        <div
          style={{
            position: 'absolute',
            left: popup.x + 16,
            top: popup.y - 80,
            zIndex: 2000,
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '11px',
            padding: '14px 18px',
            minWidth: '210px',
            fontFamily: "'SF Pro Text', system-ui, -apple-system, sans-serif",
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0066cc', marginBottom: '10px', letterSpacing: '-0.224px' }}>
            {popup.label}
          </div>
          <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
            {popup.distance !== undefined && (
              <div>
                <div style={{ fontSize: '11px', color: '#7a7a7a', marginBottom: '2px', letterSpacing: '-0.12px' }}>Distance</div>
                <div style={{ fontSize: '17px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.374px' }}>{popup.distance} km</div>
              </div>
            )}
            {popup.eta !== undefined && (
              <div>
                <div style={{ fontSize: '11px', color: '#7a7a7a', marginBottom: '2px', letterSpacing: '-0.12px' }}>Est. Time</div>
                <div style={{ fontSize: '17px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.374px' }}>{Math.round(popup.eta)} min</div>
              </div>
            )}
            {popup.distance === undefined && popup.eta === undefined && (
              <div style={{ fontSize: '13px', color: '#7a7a7a' }}>Active Route</div>
            )}
          </div>
        </div>
      )}

      {/* Persistent top-left navigation panel */}
      {routePositions.length > 0 && (
        <div style={{
          position: 'absolute', top: '24px', left: '24px', zIndex: 1000,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
          borderRadius: '11px', border: '1px solid #e0e0e0',
          padding: '16px 20px', minWidth: '220px',
          fontFamily: "'SF Pro Text', system-ui, -apple-system, sans-serif",
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#7a7a7a', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
            Navigating to Scene
          </div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: safetyLabel ? '10px' : 0 }}>
            {etaMinutes !== undefined && (
              <div>
                <div style={{ fontSize: '11px', color: '#7a7a7a', marginBottom: '2px' }}>Est. Time</div>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.374px' }}>{Math.round(etaMinutes)} min</div>
              </div>
            )}
            {distanceKm !== undefined && (
              <div>
                <div style={{ fontSize: '11px', color: '#7a7a7a', marginBottom: '2px' }}>Distance</div>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.374px' }}>{distanceKm} km</div>
              </div>
            )}
          </div>
          {safetyLabel && (
            <div style={{
              fontSize: '12px', fontWeight: 600, borderTop: '1px solid #f0f0f0', paddingTop: '8px',
              color: safetyLabel.includes('High') ? '#dc2626' : safetyLabel.includes('Elevated') ? '#d97706' : '#16a34a',
            }}>
              {safetyLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
