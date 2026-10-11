'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MainHeader } from '@/components/layout/MainHeader';
import { RoutePlanner } from '@/components/public/RoutePlanner';
import { ReportIncidentModal } from '@/components/public/ReportIncidentModal';
import { MainMapContainer } from '@/components/map/MainMapContainer';
import { RouteOption, GroundReport, NewsReport } from '@/types/prototype';

const TEAMS_DATA: { id: string; name: string; base: [number, number]; type: string; color: string }[] = [
  { id: 'medical-kothrud', name: 'Kothrud Response Team', base: [18.5033, 73.8066], type: 'Response', color: '#dc2626' },
  { id: 'pimpri-rescue', name: 'Pimpri Response Team', base: [18.6519, 73.7619], type: 'Rescue', color: '#8b5cf6' },
  { id: 'ndrf-alpha', name: 'NDRF Alpha (Shivajinagar)', base: [18.5314, 73.8446], type: 'NDRF', color: '#ea580c' },
  { id: 'police-swargate', name: 'Swargate Police Reserve', base: [18.4991, 73.8586], type: 'Police', color: '#2563eb' },
  { id: 'fire-hadapsar', name: 'Hadapsar Fire Brigade', base: [18.5089, 73.9259], type: 'Fire', color: '#b91c1c' },
  { id: 'medical-wakad', name: 'Wakad Rapid Medical', base: [18.5987, 73.7688], type: 'Medical', color: '#be123c' },
  { id: 'pmc-disaster', name: 'PMC Disaster Response', base: [18.5204, 73.8567], type: 'PMC', color: '#047857' },
  { id: 'ndrf-bravo', name: 'NDRF Bravo (Katraj)', base: [18.4529, 73.8596], type: 'NDRF', color: '#c2410c' },
  { id: 'police-viman', name: 'Viman Nagar Police', base: [18.5679, 73.9143], type: 'Police', color: '#1d4ed8' },
  { id: 'fire-baner', name: 'Baner Fire Station', base: [18.5590, 73.7868], type: 'Fire', color: '#991b1b' },
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function MainPage() {
  const [activeRoutes, setActiveRoutes] = useState<any[]>([]);
  const [isTeamsOverlayOpen, setIsTeamsOverlayOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [showElevation, setShowElevation] = useState<boolean>(false);
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);

  // Live Ground Reports and News Feed State
  const [groundReports, setGroundReports] = useState<GroundReport[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsReport[]>([]);
  const [operationalMetrics, setOperationalMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ground' | 'simulated'>('ground');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Notification State
  const [notification, setNotification] = useState<{title: string, message: string, type: 'report'|'news'}|null>(null);
  const prevReportsCountRef = useRef(0);
  const prevNewsCountRef = useRef(0);

  const [isRoutesLoaded, setIsRoutesLoaded] = useState(false);

  // Load activeRoutes from localStorage on mount
  useEffect(() => {
    try {
      const storedRoutes = localStorage.getItem('sahayak_active_routes');
      if (storedRoutes) {
        setActiveRoutes(JSON.parse(storedRoutes));
      }
    } catch (e) {
      console.error('Failed to parse active routes from local storage', e);
    } finally {
      setIsRoutesLoaded(true);
    }
  }, []);

  // Save activeRoutes to localStorage when it changes
  useEffect(() => {
    if (!isRoutesLoaded) return;
    try {
      localStorage.setItem('sahayak_active_routes', JSON.stringify(activeRoutes));
    } catch (e) {
      console.error('Failed to save active routes to local storage', e);
    }
  }, [activeRoutes, isRoutesLoaded]);

  // Poll Backend for Live Ground Reports, Database-Backed News, and Operational Stats
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [reportsRes, newsRes, statsRes] = await Promise.allSettled([
          fetch('http://localhost:5000/api/reports'),
          fetch('http://localhost:5000/api/news'),
          fetch('http://localhost:5000/api/news/stats'),
        ]);

        if (reportsRes.status === 'fulfilled' && reportsRes.value.ok && isMounted) {
          const data = await reportsRes.value.json();
          const reports = data.reports || data.data || [];
          setGroundReports(reports);
          
          if (reports.length > prevReportsCountRef.current && prevReportsCountRef.current > 0) {
             setNotification({ title: 'New Ground Report', message: reports[reports.length - 1]?.incident_type || reports[0]?.incident_type, type: 'report' });
             setTimeout(() => setNotification(null), 6000);
          }
          prevReportsCountRef.current = reports.length;
        }

        if (newsRes.status === 'fulfilled' && newsRes.value.ok && isMounted) {
          const data = await newsRes.value.json();
          const news = (data.news || data.data || []).slice(0, 5);
          setNewsFeed(news);
          
          if (news.length > prevNewsCountRef.current && prevNewsCountRef.current > 0) {
             setNotification({ title: 'New Disaster Alert Ingested', message: news[news.length - 1]?.title || news[0]?.title, type: 'news' });
             setTimeout(() => setNotification(null), 6000);
          }
          prevNewsCountRef.current = news.length;
        }

        if (statsRes.status === 'fulfilled' && statsRes.value.ok && isMounted) {
          const sData = await statsRes.value.json();
          setOperationalMetrics(sData.metrics || sData.data || null);
        }
      } catch (err) {
        // Backend offline during cold start
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-canvas">
      <MainHeader currentArea="Pune District" isResponseView={false} />

      {/* Global Notification Toast */}
      {notification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto transition-all duration-300 animate-bounce">
           <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-4 rounded-[20px] shadow-2xl flex items-center gap-4 w-[420px]">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notification.type === 'report' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                <span className="text-xl">{notification.type === 'report' ? '📍' : '📰'}</span>
              </div>
              <div className="flex-1 pr-2">
                <h4 className="text-white text-[15px] font-bold mb-0.5 tracking-wide">{notification.title}</h4>
                <p className="text-slate-300 text-[13px] leading-tight line-clamp-2">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-white shrink-0 p-2 rounded-full hover:bg-slate-800 transition-colors">✕</button>
           </div>
        </div>
      )}

      <main className="flex-1 relative w-full h-full">
        {/* Full Bleed Map Background */}
        <div className="absolute inset-0 z-0">
          <MainMapContainer
            activeRoutes={activeRoutes}
            showElevation={showElevation}
            focusLocation={focusLocation}
          />
        </div>

        {/* Floating Utility Panels (Frosted Glass) */}
        <div
          className="absolute top-6 left-6 bottom-6 z-10 flex flex-col w-[380px] pointer-events-none"
        >
          {/* Reported Incidents & Tactical Feed Panel - Now filling full height */}
          <div
            className="pointer-events-auto flex flex-col h-full frosted-glass rounded-xl border border-hairline p-4 shadow-sm animate-slide-up bg-white/95 backdrop-blur-md"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-[16px] font-bold text-ink flex items-center gap-2">
                <span>Field Incidents</span>
                {groundReports.length > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-[#2563eb]/10 text-[#2563eb] rounded-full uppercase tracking-wider">
                    {groundReports.length} Live
                  </span>
                )}
              </h3>

              {/* Feed Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('ground')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'ground'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ground Reports ({groundReports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('simulated')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'simulated'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  News ({newsFeed.length})
                </button>
              </div>
            </div>

            {/* TAB 1: Live Ground Reports */}
            {activeTab === 'ground' && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin' }}>
                {groundReports.length === 0 ? (
                  <div className="text-center py-6 px-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      📍
                    </div>
                    <p className="text-[13px] font-semibold text-slate-700 mb-0.5">No ground reports received yet.</p>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Submit an incident report from the mobile app to see it appear here live.
                    </p>
                  </div>
                ) : (
                  groundReports.map((report) => {
                    const routeForReport = activeRoutes.find(ar => Math.abs(ar.toCoords[0] - report.latitude) < 0.001 && Math.abs(ar.toCoords[1] - report.longitude) < 0.001);
                    return (
                    <div
                      key={report.id}
                      className="text-left w-full bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Ground Report
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {routeForReport ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              RESPONDING
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              {report.status || 'Pending'}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Delete this ground report?')) {
                                try {
                                  await fetch(`http://localhost:5000/api/reports/${report.id}`, { method: 'DELETE' });
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="text-slate-400 hover:text-red-600 transition-colors bg-slate-50 hover:bg-red-50 p-1 rounded border border-slate-200 hover:border-red-200 ml-1"
                            title="Delete Report"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-[14px] font-bold text-slate-900 leading-tight mb-0.5">
                            {report.incident_type}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium mb-1">
                            {report.location_name ? `${report.location_name} · ` : ''}
                            {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}°
                          </p>
                        </div>
                        {report.image_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage(
                                report.image_url?.startsWith('http')
                                  ? report.image_url
                                  : `http://localhost:5000${report.image_url}`
                              )
                            }
                            className="shrink-0 group relative overflow-hidden rounded-md border border-slate-300 w-12 h-12 bg-black"
                            title="Click to view photo evidence"
                          >
                            <img
                              src={
                                report.image_url.startsWith('http')
                                  ? report.image_url
                                  : `http://localhost:5000${report.image_url}`
                              }
                              alt="Thumbnail"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No photo attached</span>
                        )}
                      </div>

                      {report.description ? (
                        <p className="text-[12px] text-slate-700 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100 mb-2">
                          {report.description}
                        </p>
                      ) : null}

                      {/* Population Estimation */}
                      <div className="bg-slate-50 rounded-md border border-slate-100 px-2 py-1.5 flex items-center gap-2 mb-2">
                        <span className="text-[14px]">👥</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Estimated population nearby</span>
                          {report.estimated_population_1km !== null && report.estimated_population_1km !== undefined ? (
                            <span className="text-[12px] font-semibold text-slate-800">
                              Within {report.impact_radius_km || 1} km: {Math.round(report.estimated_population_1km).toLocaleString()} people
                            </span>
                          ) : (
                            <span className="text-[12px] font-medium text-slate-500 italic">Population data unavailable</span>
                          )}
                        </div>
                      </div>

                      {/* Dispatch controls */}
                      {routeForReport ? (
                        <div className="flex items-center gap-2 mb-2 mt-2 pt-2 border-t border-slate-100">
                          <div className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md flex-1 flex items-center justify-between border border-slate-200">
                            <span>Assigned to: <strong className="text-slate-900">{routeForReport.teamName}</strong></span>
                            <span className="text-blue-600 font-bold uppercase text-[9px] tracking-wider animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full inline-block"></span> En Route
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-2 mt-2 pt-2 border-t border-slate-100">
                        <select
                          className="text-[11px] font-medium px-2 py-1 border border-slate-200 bg-slate-50 text-slate-700 rounded focus:outline-none flex-1"
                          defaultValue=""
                          id={`dispatch-select-${report.id}`}
                        >
                          <option value="" disabled>Select Team (Nearest First)</option>
                          {[...TEAMS_DATA].sort((a, b) => getDistance(report.latitude, report.longitude, a.base[0], a.base[1]) - getDistance(report.latitude, report.longitude, b.base[0], b.base[1])).map(team => (
                            <option key={team.id} value={team.id}>
                              {team.name} ({getDistance(report.latitude, report.longitude, team.base[0], team.base[1]).toFixed(1)} km)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            const selectEl = document.getElementById(`dispatch-select-${report.id}`) as HTMLSelectElement;
                            if (!selectEl || !selectEl.value) {
                              alert("Please select a team first.");
                              return;
                            }

                            const selectedTeam = TEAMS_DATA.find(t => t.id === selectEl.value)!;
                            let waypoints: [number, number][] = [
                              selectedTeam.base,
                              [report.latitude, report.longitude],
                            ];
                            let safetyBrief: string[] = [
                              `Reported location: ${report.location_name || 'Field coordinates'}`,
                              `Incident type: ${report.incident_type}`,
                              'Follow designated route. Proceed with caution.',
                            ];
                            let distanceKm: string = getDistance(selectedTeam.base[0], selectedTeam.base[1], report.latitude, report.longitude).toFixed(1);
                            let durationMinutes = 14;
                            let atRiskSegments = 0;
                            let blockedAvoided = 0;
                            let routeSummary = 'Flood-aware route calculated';
                            let riskScore = 0;
                            let safetyStatus = 'COMPUTING';

                            try {
                              // ── Call flood-aware routing backend (allow up to 60s for graph load) ──
                              const controller = new AbortController();
                              const timeoutId = setTimeout(() => controller.abort(), 60000);
                              
                              const routeRes = await fetch('http://localhost:5000/api/route', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                signal: controller.signal,
                                body: JSON.stringify({
                                  origin_lat: selectedTeam.base[0],
                                  origin_lon: selectedTeam.base[1],
                                  dest_lat: report.latitude,
                                  dest_lon: report.longitude,
                                  team_name: selectedTeam.name,
                                }),
                              });
                              clearTimeout(timeoutId);

                              if (routeRes.ok) {
                                const routeData = await routeRes.json();
                                console.log('[Dispatch] Route response:', {
                                  success: routeData.success,
                                  waypoints: routeData.waypoints?.length,
                                  status: routeData.safety_status,
                                  distance: routeData.distance_km,
                                });
                                if (routeData.success && routeData.waypoints?.length > 2) {
                                  waypoints = routeData.waypoints as [number, number][];
                                  distanceKm = String(routeData.distance_km ?? distanceKm);
                                  durationMinutes = routeData.duration_minutes ?? durationMinutes;
                                  atRiskSegments = routeData.at_risk_segments_count ?? 0;
                                  blockedAvoided = routeData.blocked_segments_count ?? 0;
                                  riskScore = routeData.overall_risk_score ?? 0;
                                  safetyStatus = routeData.safety_status ?? 'COMPUTED';
                                  routeSummary = routeData.rerouted
                                    ? `⚠ Auto-rerouted — ${blockedAvoided} blocked zone(s) avoided via 500m exclusion`
                                    : `Flood-aware route · Risk: ${(riskScore * 100).toFixed(0)}%`;
                                  safetyBrief = routeData.safety_brief?.length
                                    ? routeData.safety_brief
                                    : safetyBrief;
                                } else if (routeData.waypoints?.length === 2) {
                                  // Fallback straight line returned — warn user
                                  console.warn('[Dispatch] Backend returned only 2 waypoints (fallback). Status:', routeData.safety_status);
                                  safetyBrief = ['⚠ Could not compute full road route. Using direct path.', ...safetyBrief];
                                  waypoints = routeData.waypoints;
                                }
                              }
                            } catch (e: any) {
                              if (e.name === 'AbortError') {
                                console.error('[Dispatch] Route request timed out after 60s');
                                safetyBrief = ['⚠ Route computation timed out. Retry dispatch.', ...safetyBrief];
                              } else {
                                console.warn('[Dispatch] Flood-aware routing failed:', e.message);
                              }
                            }

                            const missionData = {
                              title: report.incident_type,
                              description: report.description || 'Respond to field incident immediately.',
                              population: ((report as any).analysis_result?.estimated_lives_at_risk) ?? 'Unknown (Requires Field Assessment)',
                              brief: safetyBrief,
                              route: waypoints,
                              team: selectedTeam,
                              risk_score: riskScore,
                              safety_status: safetyStatus,
                            };

                            // Sync assignment with backend database for department head dashboard
                            try {
                              let unitId = 'KOTHRUD-VAN-01';
                              let deptName = 'Kothrud Response';
                              if (selectedTeam.name.toLowerCase().includes('pimpri') || selectedTeam.id.toLowerCase().includes('pimpri')) {
                                unitId = 'PIMPRI-RESCUE-01';
                                deptName = 'Pimpri Response';
                              } else {
                                unitId = 'KOTHRUD-VAN-01';
                                deptName = 'Kothrud Response';
                              }

                              await fetch('http://localhost:5000/api/dispatch/assign', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-User-Email': 'admin@gmail.com',
                                },
                                body: JSON.stringify({
                                  incident_id: String(report.id),
                                  incident_title: report.incident_type || 'Ground Incident',
                                  incident_description: report.description || (report as any).text || '',
                                  image_url: (report as any).image_url || (report as any).image_path || ((report as any).image_filename ? `/api/uploads/${(report as any).image_filename}` : '') || '',
                                  incident_lat: report.latitude,
                                  incident_lon: report.longitude,
                                  incident_location: report.location_name || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`,
                                  severity: (report as any).analysis_result?.verified_severity || 'HIGH',
                                  affected_population: report.estimated_population_1km || 0,
                                  unit_id: unitId,
                                  department: deptName,
                                  status: 'assigned_to_head',
                                  dispatched_by: 'admin@gmail.com',
                                  notes: safetyBrief.slice(0, 2).join('; '),
                                  route_waypoints: waypoints,
                                  distance_km: Number(distanceKm) || null,
                                  duration_minutes: durationMinutes,
                                  safety_status: safetyStatus,
                                }),
                              });
                            } catch (e) {
                              console.warn('[Dispatch] Error syncing assignment:', e);
                            }

                            const newRoute = {
                              id: 'dispatch-' + report.id + '-' + Date.now(),
                              fromName: selectedTeam.name,
                              toName: `Incident: ${report.incident_type}`,
                              fromCoords: waypoints[0],
                              toCoords: waypoints[waypoints.length - 1],
                              distanceKm,
                              durationMinutes,
                              atRiskSegmentsCount: atRiskSegments,
                              disruptedSegmentsAvoidedCount: blockedAvoided,
                              waypoints,
                              routeSummary,
                              color: selectedTeam.color,
                              teamName: selectedTeam.name,
                              population: missionData.population,
                              riskScore,
                              safetyStatus,
                            };

                            setActiveRoutes(prev => [...prev, newRoute]);
                            alert(`Task Assigned to ${selectedTeam.name} Head!\n\nThe Department Head will now review and deploy a unit to the Field Responder.`);
                          }}
                          className="text-[10px] font-bold px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          DISPATCH
                        </button>
                      </div>

                      )}
                      
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>ID: {report.id}</span>
                        <button
                          type="button"
                          onClick={() => setFocusLocation([report.latitude, report.longitude])}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          View on Map →
                        </button>
                      </div>
                    </div>
                  )})
                )}
              </div>
            )}

            {/* TAB 2: News Feed */}
            {activeTab === 'simulated' && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-2">
                {/* News Items List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {newsFeed.map((item) => {
                    const geoStatus = item.geolocation_status || 'UNRESOLVED';
                    const hasValidCoords =
                      typeof item.latitude === 'number' &&
                      typeof item.longitude === 'number' &&
                      !isNaN(item.latitude) &&
                      !isNaN(item.longitude);

                    const isVerified = geoStatus === 'VERIFIED';
                    const isApprox = geoStatus === 'APPROXIMATE_LOCALITY';
                    const isAmbiguous = geoStatus === 'AMBIGUOUS';

                    const severityBadgeClass =
                      item.severity === 'CRITICAL'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : item.severity === 'HIGH'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : item.severity === 'LOW'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200';

                    return (
                      <div
                        key={item.id}
                        className="text-left w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg p-3 transition-colors shadow-xs"
                      >
                        {/* Header Badges */}
                        <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.source || 'News'}
                            </span>
                          </div>

                          {/* Geolocation Status Badge */}
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                              isVerified
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : isApprox
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : isAmbiguous
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {isVerified
                              ? '✓ Verified Location'
                              : isApprox
                              ? '⚠ Approx Locality'
                              : isAmbiguous
                              ? '? Ambiguous'
                              : '✕ Unlocated'}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-[13px] font-bold text-slate-900 leading-snug mb-1">
                          {item.title}
                        </h4>

                        {/* Extracted Location and Coordinates */}
                        <div className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <span>📍</span>
                          <strong className="text-slate-700">
                            {item.extracted_location || item.location_name || 'Unspecified Area'}
                          </strong>
                          {hasValidCoords && (
                            <span className="text-slate-400 text-[10px]">
                              ({Number(item.latitude).toFixed(4)}°N, {Number(item.longitude).toFixed(4)}°E)
                            </span>
                          )}
                        </div>

                        {/* Location Evidence Snippet */}
                        {item.location_evidence && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 border-l-2 border-blue-500 px-2 py-1 rounded-r mb-1.5 line-clamp-2 italic">
                            <span className="font-semibold text-slate-700 not-italic">Evidence: </span>
                            "{item.location_evidence}"
                          </div>
                        )}

                        {/* Description */}
                        <p className="text-[12px] text-slate-600 leading-relaxed mb-2 line-clamp-3">
                          {item.description}
                        </p>


                        {/* Card Footer Actions */}
                        <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-2 mt-1">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-500 font-bold hover:text-slate-800 flex items-center gap-1"
                            >
                              <span>Original Article</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                          ) : (
                            <span className="text-slate-400">
                              {new Date(item.timestamp || item.published_at || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}

                          {hasValidCoords && (isVerified || isApprox) ? (
                            <button
                              type="button"
                              onClick={() => setFocusLocation([item.latitude!, item.longitude!])}
                              className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                            >
                              <span>Focus Map</span>
                              <span>→</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[9.5px]">
                              {isAmbiguous ? 'Ambiguous Location' : 'No GPS Coordinates'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {newsFeed.length === 0 && (
                    <div className="text-center text-slate-400 text-xs py-10">
                      No ingested news articles available.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-hairline shrink-0">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="w-full bg-canvas border border-hairline text-primary text-[14px] font-semibold rounded-pill px-[22px] py-[10px] hover:scale-98 transition-transform text-center shadow-xs"
              >
                + Report an Incident
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Active Teams Mini Panel */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col pointer-events-none w-[340px]">
        <div className="pointer-events-auto rounded-xl border border-hairline shadow-sm bg-white/97 backdrop-blur-md overflow-hidden" style={{ fontFamily: "'SF Pro Text', system-ui, -apple-system, sans-serif" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.224px' }}>Active Teams</h3>
              {activeRoutes.length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 600, background: '#0066cc', color: '#fff', borderRadius: '9999px', padding: '1px 8px' }}>{activeRoutes.length}</span>
              )}
            </div>
            {activeRoutes.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to reset the demo and clear all routes?')) {
                      localStorage.removeItem('sahayak_active_routes');
                      setActiveRoutes([]);
                    }
                  }}
                  style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Reset
                </button>
                <button
                  onClick={() => setIsTeamsOverlayOpen(true)}
                  style={{ fontSize: '12px', fontWeight: 600, color: '#0066cc', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View All
                </button>
              </div>
            )}
          </div>
          {/* Body */}
          <div className="px-3 py-2">
            {activeRoutes.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#7a7a7a', padding: '8px 4px', fontStyle: 'italic' }}>No teams currently dispatched.</p>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {activeRoutes.slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: '#f5f5f7' }}>
                    <div className="w-2.5 h-full min-h-[36px] rounded-full shrink-0" style={{ backgroundColor: r.color, width: '3px' }}></div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.224px' }} className="truncate">{r.teamName}</div>
                      <div style={{ fontSize: '11px', color: '#7a7a7a', letterSpacing: '-0.12px' }} className="truncate">To: {r.toName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.374px' }}>{r.durationMinutes ?? '—'} min</div>
                      <div style={{ fontSize: '11px', color: '#7a7a7a' }}>{r.distanceKm ?? '—'} km</div>
                    </div>
                  </div>
                ))}
                {activeRoutes.length > 3 && <p style={{ fontSize: '11px', color: '#7a7a7a', textAlign: 'center', paddingTop: '4px' }}>+{activeRoutes.length - 3} more</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Overlay for Active Teams */}
      {isTeamsOverlayOpen && (
        <div className="absolute inset-0 z-[100] bg-white/97 backdrop-blur-md flex flex-col pointer-events-auto overflow-y-auto" style={{ fontFamily: "'SF Pro Text', system-ui, -apple-system, sans-serif" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-10 py-8 border-b border-hairline">
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#7a7a7a', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Command Center</div>
              <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.374px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                Active Dispatches
                <span style={{ fontSize: '14px', fontWeight: 600, background: '#0066cc', color: '#fff', borderRadius: '9999px', padding: '2px 12px' }}>{activeRoutes.length}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset the demo and clear all routes?')) {
                    localStorage.removeItem('sahayak_active_routes');
                    setActiveRoutes([]);
                  }
                }}
                style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer' }}
              >
                Reset Demo
              </button>
              <button
                onClick={() => setIsTeamsOverlayOpen(false)}
                style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', background: '#f5f5f7', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
          {/* Cards Grid */}
          <div className="flex-1 px-10 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl">
              {activeRoutes.map(r => (
                <div key={r.id} style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {/* Color bar top */}
                  <div style={{ height: '4px', background: r.color }}></div>
                  <div style={{ padding: '20px' }}>
                    {/* Team name + status */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '17px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.374px', marginBottom: '4px' }}>{r.teamName}</div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '9999px', padding: '2px 10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>En Route</span>
                      </div>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.color, marginTop: '6px', boxShadow: `0 0 0 3px ${r.color}30` }}></div>
                    </div>
                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '0', borderTop: '1px solid #f0f0f0', paddingTop: '16px', marginBottom: '16px' }}>
                      <div style={{ flex: 1, paddingRight: '16px', borderRight: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: '11px', color: '#7a7a7a', marginBottom: '2px', letterSpacing: '-0.12px' }}>Est. Time</div>
                        <div style={{ fontSize: '22px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.374px' }}>{r.durationMinutes ?? '—'}<span style={{ fontSize: '13px', fontWeight: 400, color: '#7a7a7a', marginLeft: '3px' }}>min</span></div>
                      </div>
                      <div style={{ flex: 1, paddingLeft: '16px' }}>
                        <div style={{ fontSize: '11px', color: '#7a7a7a', marginBottom: '2px', letterSpacing: '-0.12px' }}>Distance</div>
                        <div style={{ fontSize: '22px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.374px' }}>{r.distanceKm ?? '—'}<span style={{ fontSize: '13px', fontWeight: 400, color: '#7a7a7a', marginLeft: '3px' }}>km</span></div>
                      </div>
                    </div>
                    {/* Destination */}
                    <div style={{ background: '#f5f5f7', borderRadius: '11px', padding: '12px 14px', marginBottom: r.riskScore !== undefined ? '12px' : '0' }}>
                      <div style={{ fontSize: '11px', color: '#7a7a7a', marginBottom: '3px', letterSpacing: '-0.12px' }}>Destination</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.224px' }}>{r.toName}</div>
                      <div style={{ fontSize: '11px', color: '#7a7a7a', marginTop: '2px' }}>From: {r.fromName}</div>
                    </div>
                    {/* Risk */}
                    {r.riskScore !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                        <span style={{ fontSize: '12px', color: '#7a7a7a', letterSpacing: '-0.12px' }}>Route Risk Score</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: r.riskScore >= 0.6 ? '#dc2626' : r.riskScore >= 0.35 ? '#d97706' : '#16a34a' }}>{(r.riskScore * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Live Field Photo Evidence
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black min-h-[250px]">
              <img
                src={previewImage}
                alt="Enlarged field report evidence"
                className="max-h-[70vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
