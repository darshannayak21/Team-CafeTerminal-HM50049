'use client';

import React, { useState, useMemo } from 'react';
import { TalukaDistrict, IncidentMarkerData } from '@/types/prototype';
import { matchTalukaForIncident } from '@/data/prototype';
import { DistrictMapContainer } from '@/components/map/DistrictMapContainer';
import { UnifiedIncident } from './DisasterCommandCenter';

interface TalukaCommandCenterProps {
  districts: TalukaDistrict[];
  selectedDistrictId: string;
  onSelectDistrict: (id: string) => void;
  incidents: UnifiedIncident[];
  onNavigateToIncident: (incidentId: string) => void;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-[#ff3b30]/10', text: 'text-[#d70015]', border: 'border-[#ff3b30]/20' },
  HIGH: { bg: 'bg-[#ff9500]/10', text: 'text-[#c93400]', border: 'border-[#ff9500]/20' },
  MODERATE: { bg: 'bg-[#ffcc00]/15', text: 'text-[#9e6a00]', border: 'border-[#ffcc00]/30' },
  LOW: { bg: 'bg-[#34c759]/10', text: 'text-[#248a3d]', border: 'border-[#34c759]/20' },
};

export const TalukaCommandCenter: React.FC<TalukaCommandCenterProps> = ({
  districts,
  selectedDistrictId,
  onSelectDistrict,
  incidents,
  onNavigateToIncident,
}) => {
  const [selectedMapIncident, setSelectedMapIncident] = useState<IncidentMarkerData | null>(null);

  // Selected Taluka
  const selectedDistrict = useMemo(() => {
    return districts.find(d => d.id === selectedDistrictId) || districts[0] || null;
  }, [districts, selectedDistrictId]);

  // Map incidents per taluka using canonical spatial coordinates and locality matching
  const talukaIncidentMap = useMemo(() => {
    const map: Record<string, UnifiedIncident[]> = {};
    districts.forEach(d => {
      map[d.id] = [];
    });

    incidents.forEach(inc => {
      // 1. Resolve exact taluka using coordinate boundaries, centers, and locality keywords
      const talukaId = matchTalukaForIncident(
        {
          taluka: inc.taluka,
          location: inc.location,
          location_name: inc.location,
          description: inc.description,
          title: inc.title,
          coordinates: inc.coordinates,
        },
        districts
      );

      if (map[talukaId]) {
        map[talukaId].push(inc);
      } else {
        // Fallback to first district or pune-city
        const fallback = districts.find(d => d.id === 'pune-city')?.id || districts[0]?.id;
        if (fallback && map[fallback]) {
          map[fallback].push(inc);
        }
      }
    });
    return map;
  }, [districts, incidents]);

  // Incidents for selected taluka
  const activeTalukaIncidents = useMemo(() => {
    if (!selectedDistrict) return [];
    return talukaIncidentMap[selectedDistrict.id] || [];
  }, [selectedDistrict, talukaIncidentMap]);

  // Formatted IncidentMarkerData for DistrictMapContainer
  const mapIncidents: IncidentMarkerData[] = useMemo(() => {
    return activeTalukaIncidents
      .filter(i => i.coordinates !== null)
      .map(i => ({
        id: i.id,
        type: (i.category.toLowerCase().includes('bridge') ? 'bridge' :
               i.category.toLowerCase().includes('road') ? 'road' :
               i.category.toLowerCase().includes('water') ? 'settlement' : 'road') as any,
        title: i.title,
        locationName: i.location,
        timestamp: i.timestamp,
        description: i.description,
        source: i.source,
        coordinates: i.coordinates as [number, number],
        severity: i.severity,
        talukaId: selectedDistrict?.id || 'mulshi',
      }));
  }, [activeTalukaIncidents, selectedDistrict]);

  // Selected Taluka Metrics
  const talukaMetrics = useMemo(() => {
    const total = activeTalukaIncidents.length;
    const verified = activeTalukaIncidents.filter(i => i.verificationStatus === 'VERIFIED').length;
    const critical = activeTalukaIncidents.filter(i => i.severity === 'CRITICAL').length;
    const activeOperations = activeTalukaIncidents.filter(i => i.responseStatus !== 'UNASSIGNED').length;
    const unassigned = activeTalukaIncidents.filter(i => i.responseStatus === 'UNASSIGNED').length;

    return {
      total,
      verified,
      critical,
      activeOperations,
      unassigned,
    };
  }, [activeTalukaIncidents]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#f5f5f7]">
      {/* ── PART A: LEFT SIDEBAR TALUKA SELECTOR (ALL 14 TALUKAS) ── */}
      <aside className="w-full lg:w-[360px] shrink-0 border-r border-[#e5e5ea] bg-white flex flex-col h-auto lg:h-full overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#e5e5ea] bg-[#f5f5f7]/60">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] uppercase text-[#1d1d1f]">
              Pune District Sub-Divisions
            </h3>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#0066cc]/10 text-[#0066cc]">
              14 Talukas
            </span>
          </div>
          <p className="text-[12px] text-[#86868b] leading-tight">
            Canonical Local Government Directory (LGD) administrative register
          </p>
        </div>

        {/* 14 Talukas Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0f0] p-2 space-y-1">
          {districts.map(d => {
            const isSelected = selectedDistrict?.id === d.id;
            const incCount = (talukaIncidentMap[d.id] || []).length;
            const sev = SEVERITY_COLORS[d.riskLevel] || SEVERITY_COLORS.MODERATE;

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectDistrict(d.id)}
                className={`w-full text-left p-3.5 rounded-[14px] transition-all cursor-pointer flex flex-col gap-2 select-none ${
                  isSelected
                    ? 'bg-[#fafafc] border border-[#0066cc] ring-1 ring-[#0066cc]'
                    : 'bg-white border border-transparent hover:bg-[#f5f5f7]'
                }`}
              >
                {/* Rank, Name & Severity */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#86868b]">
                      #{d.rank.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[14px] font-semibold text-[#1d1d1f] tracking-tight">
                      {d.name}
                    </span>
                  </div>
                  <span className={`text-[9.5px] font-semibold uppercase px-2 py-0.5 rounded-full border ${sev.bg} ${sev.text} ${sev.border}`}>
                    {d.riskLevel}
                  </span>
                </div>

                {/* Telemetry row: Incidents & Population */}
                <div className="flex items-center justify-between text-[11.5px] text-[#86868b]">
                  <span className={`inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-full transition-colors ${
                    incCount > 0 
                      ? 'bg-[#ff3b30]/10 text-[#d70015] border border-[#ff3b30]/20' 
                      : 'text-[#1d1d1f]'
                  }`}>
                    <span>🚨</span>
                    <span>{incCount} {incCount === 1 ? 'Incident' : 'Incidents'}</span>
                  </span>
                  <span suppressHydrationWarning>
                    👥 {new Intl.NumberFormat('en-IN').format(Math.round(d.affectedPopulation))} at risk
                  </span>
                </div>

                {/* Rainfall Telemetry strip */}
                <div className="pt-1.5 border-t border-[#f0f0f0] flex items-center justify-between text-[10.5px] text-[#86868b]">
                  <span>24h Rain: <strong className="text-[#1d1d1f]">{d.rainfall24h} mm</strong></span>
                  <span>Hazard: <strong className="text-[#0066cc]">{d.hazardScore.toFixed(2)}</strong></span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── PART B: RIGHT PANEL SELECTED TALUKA DASHBOARD (5 SECTIONS) ── */}
      <main className="flex-1 h-full overflow-y-auto p-6 space-y-6">
        {selectedDistrict ? (
          <div className="max-w-[1400px] mx-auto space-y-6">
            
            {/* Header: Taluka Name & Risk Profile */}
            <div className="bg-white rounded-[20px] border border-[#e5e5ea] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e5e5ea]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#0066cc]"></span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                      Sub-Division Administrative Locus
                    </span>
                  </div>
                  <h1 className="text-[26px] font-semibold text-[#1d1d1f] tracking-tight">
                    {selectedDistrict.name}
                  </h1>
                </div>

                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-[0.04em] font-semibold text-[#86868b] block">
                    Composite Hazard Score
                  </span>
                  <div className="text-[20px] font-bold text-[#0066cc]">
                    {selectedDistrict.hazardScore.toFixed(2)} / 1.00
                  </div>
                </div>
              </div>

              {/* ── 1. OVERVIEW METRICS ── */}
              <div className="pt-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b] mb-3">
                  1. Overview Telemetry & Operational Metrics
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-[#f5f5f7] rounded-[14px] p-3 border border-[#e5e5ea]">
                    <span className="text-[10.5px] uppercase font-semibold text-[#86868b] block">Total Incidents</span>
                    <span className="text-[20px] font-bold text-[#1d1d1f]">{talukaMetrics.total}</span>
                  </div>
                  <div className="bg-[#34c759]/5 rounded-[14px] p-3 border border-[#34c759]/20">
                    <span className="text-[10.5px] uppercase font-semibold text-[#248a3d] block">Verified Reports</span>
                    <span className="text-[20px] font-bold text-[#248a3d]">{talukaMetrics.verified}</span>
                  </div>
                  <div className="bg-[#ff3b30]/5 rounded-[14px] p-3 border border-[#ff3b30]/20">
                    <span className="text-[10.5px] uppercase font-semibold text-[#d70015] block">Critical Scale</span>
                    <span className="text-[20px] font-bold text-[#d70015]">{talukaMetrics.critical}</span>
                  </div>
                  <div className="bg-[#f5f5f7] rounded-[14px] p-3 border border-[#e5e5ea]">
                    <span className="text-[10.5px] uppercase font-semibold text-[#86868b] block">At-Risk Population</span>
                    <div className="text-[20px] font-bold text-[#1d1d1f]" suppressHydrationWarning>
                      {new Intl.NumberFormat('en-IN').format(Math.round(selectedDistrict.affectedPopulation))}
                    </div>
                    <span className="text-[10px] text-[#86868b] block mt-0.5" suppressHydrationWarning>
                      {selectedDistrict.totalPopulation 
                        ? `Census: ${new Intl.NumberFormat('en-IN').format(Math.round(selectedDistrict.totalPopulation))}`
                        : 'Local buffer exposure'}
                    </span>
                  </div>
                  <div className="bg-[#0066cc]/5 rounded-[14px] p-3 border border-[#0066cc]/20">
                    <span className="text-[10.5px] uppercase font-semibold text-[#0066cc] block">Active Operations</span>
                    <span className="text-[20px] font-bold text-[#0066cc]">{talukaMetrics.activeOperations}</span>
                  </div>
                  <div className="bg-[#f5f5f7] rounded-[14px] p-3 border border-[#e5e5ea]">
                    <span className="text-[10.5px] uppercase font-semibold text-[#86868b] block">Unassigned</span>
                    <span className="text-[20px] font-bold text-[#1d1d1f]">{talukaMetrics.unassigned}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2. INCIDENT REGISTER ── */}
            <div className="bg-white rounded-[20px] border border-[#e5e5ea] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                    2. Taluka Incident Register
                  </h3>
                  <p className="text-[12px] text-[#86868b]">
                    Incidents recorded in {selectedDistrict.name}
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#0066cc]/10 text-[#0066cc]">
                  {activeTalukaIncidents.length} Registered
                </span>
              </div>

              {activeTalukaIncidents.length === 0 ? (
                <div className="p-8 text-center text-[#86868b] bg-[#f5f5f7] rounded-[14px]">
                  <p className="font-semibold text-[#1d1d1f]">No active incidents in this taluka</p>
                  <p className="text-[12px] text-[#86868b] mt-0.5">Telemetry shows normal standby operations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTalukaIncidents.map(item => {
                    const sev = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.MODERATE;

                    return (
                      <div
                        key={item.id}
                        className="bg-[#f5f5f7] rounded-[14px] p-4 border border-[#e5e5ea] flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${sev.bg} ${sev.text} ${sev.border}`}>
                              {item.severity}
                            </span>
                            <span className="text-[10px] bg-white border border-[#e5e5ea] px-2 py-0.5 rounded text-[#1d1d1f]">
                              {item.category}
                            </span>
                            <span className="text-[11px] font-mono text-[#86868b]">{item.id}</span>
                          </div>
                          <div className="flex items-start gap-3">
                            {item.imageUrl && (
                              <div className="w-14 h-14 rounded-[10px] overflow-hidden shrink-0 border border-[#e5e5ea] bg-black">
                                <img
                                  src={item.imageUrl.startsWith('http') ? item.imageUrl : `http://localhost:5000${item.imageUrl}`}
                                  alt="Field Report Evidence"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[15px] font-semibold text-[#1d1d1f] truncate">
                                {item.title}
                              </h4>
                              {item.description && (
                                <p className="text-[12.5px] text-[#424245] line-clamp-2 mt-0.5 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11.5px] text-[#86868b]">
                                <span>📍 {item.location}</span>
                                <span>·</span>
                                <span className="font-medium text-[#1d1d1f]">{item.source}</span>
                                <span>·</span>
                                <span>Reported: {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                {item.verificationStatus === 'VERIFIED' && (
                                  <span className="text-[9.5px] font-bold text-[#248a3d] bg-[#34c759]/10 px-1.5 py-0.5 rounded border border-[#34c759]/20">
                                    ✓ VERIFIED
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Navigation action to Disaster Command Center */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                            item.responseStatus !== 'UNASSIGNED' ? 'bg-[#0066cc]/10 text-[#0066cc]' : 'bg-white text-[#86868b] border border-[#e5e5ea]'
                          }`}>
                            {item.responseStatus !== 'UNASSIGNED' ? '● Operation Active' : 'Unassigned'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onNavigateToIncident(item.id)}
                            className="px-3.5 py-1.5 bg-[#0066cc] hover:bg-[#0071e3] active:scale-[0.98] text-white rounded-full text-[12px] font-medium transition-all cursor-pointer"
                          >
                            View in Disaster Center →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 3. WEATHER & ENVIRONMENTAL CONDITIONS ── */}
            <div className="bg-white rounded-[20px] border border-[#e5e5ea] p-6 space-y-4">
              <div className="pb-3 border-b border-[#e5e5ea]">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                  3. Weather & Environmental Risk Indicators
                </h3>
                <p className="text-[12px] text-[#86868b]">
                  IMD AWS convective precipitation telemetry & LGD slope indices
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rainfall */}
                <div className="bg-[#f5f5f7] rounded-[16px] p-4 border border-[#e5e5ea]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b] block mb-2">
                    Precipitation Accumulation
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2.5 rounded-[10px] border border-[#e5e5ea]">
                      <span className="text-[10px] text-[#86868b] block">1H</span>
                      <strong className="text-[15px] text-[#1d1d1f]">{selectedDistrict.rainfall1h} mm</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-[10px] border border-[#e5e5ea]">
                      <span className="text-[10px] text-[#86868b] block">24H</span>
                      <strong className="text-[15px] text-[#1d1d1f]">{selectedDistrict.rainfall24h} mm</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-[10px] border border-[#e5e5ea]">
                      <span className="text-[10px] text-[#86868b] block">72H</span>
                      <strong className="text-[15px] text-[#1d1d1f]">{selectedDistrict.rainfall72h} mm</strong>
                    </div>
                  </div>
                </div>

                {/* Terrain & Flood Proximity */}
                <div className="bg-[#f5f5f7] rounded-[16px] p-4 border border-[#e5e5ea]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b] block mb-2">
                    Catchment & Hydrological Indices
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2.5 rounded-[10px] border border-[#e5e5ea]">
                      <span className="text-[10px] text-[#86868b] block">Terrain Slope Index</span>
                      <strong className="text-[15px] text-[#1d1d1f]">{selectedDistrict.terrainSusceptibility.toFixed(2)}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-[10px] border border-[#e5e5ea]">
                      <span className="text-[10px] text-[#86868b] block">Historical Flood Prox</span>
                      <strong className="text-[15px] text-[#1d1d1f]">{selectedDistrict.historicalFloodProximity.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. OPERATIONAL RESPONSE & RESOURCES ── */}
            <div className="bg-white rounded-[20px] border border-[#e5e5ea] p-6 space-y-3">
              <div className="pb-3 border-b border-[#e5e5ea]">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                  4. Operational Response & Stationed Resources
                </h3>
                <p className="text-[12px] text-[#86868b]">
                  Response teams and designated emergency vehicles
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                <div className="p-3.5 bg-[#f5f5f7] rounded-[12px] border border-[#e5e5ea]">
                  <span className="text-[10.5px] uppercase font-semibold text-[#86868b] block mb-1">Stationed Units</span>
                  <span className="font-medium text-[#1d1d1f]">
                    SDRF Multi-Purpose Battalion · 7 Rapid Response Units Stationed
                  </span>
                </div>
                <div className="p-3.5 bg-[#f5f5f7] rounded-[12px] border border-[#e5e5ea]">
                  <span className="text-[10.5px] uppercase font-semibold text-[#86868b] block mb-1">Road Network Status</span>
                  <span className="font-medium text-[#1d1d1f]">
                    {selectedDistrict.atRiskRoadsCount} At-risk corridors · {selectedDistrict.disruptedRoadsCount} Disrupted roads
                  </span>
                </div>
              </div>
            </div>

            {/* ── 5. TALUKA MAP ── */}
            <div className="bg-white rounded-[20px] border border-[#e5e5ea] p-6 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea]">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                    5. Administrative Taluka Geospatial Locus
                  </h3>
                  <p className="text-[12px] text-[#86868b]">
                    Boundary polygon, incident markers, and rain radar
                  </p>
                </div>
                <span className="text-[11px] font-mono text-[#86868b]">
                  [{selectedDistrict.centerCoordinates[0].toFixed(4)}° N, {selectedDistrict.centerCoordinates[1].toFixed(4)}° E]
                </span>
              </div>

              <div className="h-[420px] w-full rounded-[16px] overflow-hidden border border-[#e5e5ea]">
                <DistrictMapContainer
                  district={selectedDistrict}
                  incidents={mapIncidents}
                  selectedIncident={selectedMapIncident}
                  onSelectIncident={setSelectedMapIncident}
                />
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[#86868b]">
            Select a taluka from the left sidebar to view intelligence.
          </div>
        )}
      </main>
    </div>
  );
};
