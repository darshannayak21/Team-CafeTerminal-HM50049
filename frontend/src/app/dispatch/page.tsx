'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MainHeader } from '@/components/layout/MainHeader';
import { PROTOTYPE_DISTRICTS, matchTalukaForIncident } from '@/data/prototype';
import { TalukaDistrict } from '@/types/prototype';
import {
  DisasterCommandCenter,
  UnifiedIncident,
} from '@/components/command/DisasterCommandCenter';
import { TalukaCommandCenter } from '@/components/command/TalukaCommandCenter';

export type CommandView = 'disaster' | 'district';

interface LiveWeatherStation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  rain_1h: number | null;
  temp?: number;
  humidity?: number;
  wind_speed?: number;
  condition?: string;
}

export default function CommandPage() {
  // ── Tab Navigation State ──────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<CommandView>('disaster');

  // ── Selected Entities State ───────────────────────────────────────────────
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('mulshi');

  // ── Live Backend Data State ───────────────────────────────────────────────
  const [groundReports, setGroundReports] = useState<any[]>([]);
  const [newsFeed, setNewsFeed] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [districts, setDistricts] = useState<TalukaDistrict[]>(PROTOTYPE_DISTRICTS);
  const [liveWeatherStations, setLiveWeatherStations] = useState<LiveWeatherStation[]>([]);
  const [prioritiesSummary, setPrioritiesSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // ── Real Data Fetching (Backend Polling) ───────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [reportsRes, newsRes, assignmentsRes, prioritiesRes, rainfallRes] = await Promise.allSettled([
        fetch('http://localhost:5000/api/reports'),
        fetch('http://localhost:5000/api/news'),
        fetch('http://localhost:5000/api/dispatch/assignments', {
          headers: { 'X-User-Email': 'admin@gmail.com' },
        }),
        fetch('http://localhost:5000/api/priorities/live'),
        fetch('http://localhost:5000/api/rainfall/live'),
      ]);

      // 1. Ingest Real Ground Reports from SQLite DB
      if (reportsRes.status === 'fulfilled' && reportsRes.value.ok) {
        const data = await reportsRes.value.json();
        const reps = data.reports || data.data || [];
        setGroundReports(reps);
      }

      // 2. Ingest Real News Alerts from SQLite DB
      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        const data = await newsRes.value.json();
        const news = data.news || data.data || [];
        setNewsFeed(news);
      }

      // 3. Ingest Real Dispatch Assignments
      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value.ok) {
        const data = await assignmentsRes.value.json();
        const assigns = data.assignments || [];
        setAssignments(assigns);
      }

      // 4. Ingest Real Weather Telemetry (33 IMD/AWS Stations across Pune District)
      let stations: LiveWeatherStation[] = [];
      if (rainfallRes.status === 'fulfilled' && rainfallRes.value.ok) {
        const rData = await rainfallRes.value.json();
        stations = rData.data || [];
        setLiveWeatherStations(stations);
      }

      // 5. Ingest Real Priorities & Population Exposure for all 14 Talukas
      if (prioritiesRes.status === 'fulfilled' && prioritiesRes.value.ok) {
        const pData = await prioritiesRes.value.json();
        setPrioritiesSummary(pData.summary || null);
        const liveSettlements: any[] = pData.data || pData.settlements || [];

        if (liveSettlements.length > 0) {
          setDistricts(prev =>
            prev.map(d => {
              const match = liveSettlements.find(
                (ls: any) =>
                  ls.settlement_id === `pune-${d.id}` ||
                  ls.settlement_id === d.id ||
                  ls.taluka?.toLowerCase() === d.id.toLowerCase() ||
                  ls.name?.toLowerCase().includes(d.id.toLowerCase())
              );

              if (match) {
                // Also correlate nearest weather station for this taluka
                let matchedRain1h = match.rainfall_summary?.rainfall_1h_mm ?? d.rainfall1h;
                if (stations.length > 0 && d.centerCoordinates) {
                  let minDistance = Infinity;
                  let nearestStation: LiveWeatherStation | null = null;
                  for (const st of stations) {
                    const dist = Math.hypot(st.lat - d.centerCoordinates[0], st.lng - d.centerCoordinates[1]);
                    if (dist < minDistance) {
                      minDistance = dist;
                      nearestStation = st;
                    }
                  }
                  if (nearestStation && nearestStation.rain_1h !== null) {
                    matchedRain1h = nearestStation.rain_1h;
                  }
                }

                return {
                  ...d,
                  riskLevel: match.risk_level || d.riskLevel,
                  hazardScore: typeof match.hazard_score === 'number' ? match.hazard_score : d.hazardScore,
                  rank: match.rank || d.rank,
                  affectedPopulation: typeof match.affected_population === 'number' ? match.affected_population : d.affectedPopulation,
                  totalPopulation: typeof match.total_population === 'number' ? match.total_population : (match.population ?? d.totalPopulation),
                  atRiskRoadsCount: typeof match.roads_count === 'number' ? match.roads_count : d.atRiskRoadsCount,
                  disruptedRoadsCount: typeof match.blocked_roads_count === 'number' ? match.blocked_roads_count : d.disruptedRoadsCount,
                  rainfall1h: matchedRain1h,
                  rainfall24h: match.rainfall_summary?.rainfall_24h_mm ?? d.rainfall24h,
                  rainfall72h: match.rainfall_summary?.rainfall_72h_mm ?? d.rainfall72h,
                  terrainSusceptibility: match.component_scores?.terrain_susceptibility ?? d.terrainSusceptibility,
                  historicalFloodProximity: match.component_scores?.historical_flood_proximity ?? d.historicalFloodProximity,
                  evidence: match.evidence || d.evidence,
                };
              }
              return d;
            }).sort((a, b) => a.rank - b.rank)
          );
        }
      }

      setLastSyncedAt(new Date());
    } catch {
      // Graceful offline fallback during server cold start
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Construct Unified Incidents List with Real Data ───────────────────────
  const unifiedIncidents: UnifiedIncident[] = useMemo(() => {
    const list: UnifiedIncident[] = [];

    // Assignments lookup map: incident_id -> assignment
    const assignMap = new Map<string, any>();
    assignments.forEach(a => {
      if (a.incident_id) assignMap.set(a.incident_id, a);
    });

    // Helper: Find nearest real weather station
    const getRealRainfallInfo = (lat: number | null, lon: number | null, talukaName: string | null): string | null => {
      if (lat !== null && lon !== null && liveWeatherStations.length > 0) {
        let nearest: LiveWeatherStation | null = null;
        let minDist = Infinity;
        for (const st of liveWeatherStations) {
          const d = Math.hypot(st.lat - lat, st.lng - lon);
          if (d < minDist) {
            minDist = d;
            nearest = st;
          }
        }
        if (nearest && minDist < 0.45) { // within ~45km
          const r = nearest.rain_1h ?? 0;
          const cond = nearest.condition || 'Precipitation';
          const temp = nearest.temp ? `${Math.round(nearest.temp)}°C` : '';
          return `${r} mm/h · ${cond} ${temp ? `(${temp})` : ''} at ${nearest.name} AWS`;
        }
      }

      if (talukaName) {
        const dMatch = districts.find(d => d.id === talukaName || d.name.toLowerCase().includes(talukaName.toLowerCase()));
        if (dMatch) {
          return `${dMatch.rainfall1h} mm/h · 24h: ${dMatch.rainfall24h} mm in ${dMatch.name}`;
        }
      }

      return null;
    };

    // Helper: Resolve Taluka from text
    const resolveTaluka = (locStr: string): string | null => {
      if (!locStr) return null;
      const lower = locStr.toLowerCase();
      for (const d of districts) {
        const cleanName = d.name.toLowerCase().replace(' catchment', '').replace(' mountain valley', '').replace(' taluka', '');
        if (lower.includes(d.id.toLowerCase()) || lower.includes(cleanName)) {
          return d.id;
        }
      }
      return null;
    };

    // 1. Ingest Citizen Ground Reports (Real Database Entries)
    groundReports.forEach(rep => {
      const repId = rep.id || `REP-${Math.random().toString(36).substr(2, 6)}`;
      const assign = assignMap.get(repId);

      const hasCoords =
        rep.latitude !== null &&
        rep.latitude !== undefined &&
        rep.longitude !== null &&
        rep.longitude !== undefined;

      const aiAnalysis = rep.analysis_result || null;
      const taluka = matchTalukaForIncident(
        {
          taluka: rep.taluka,
          location: rep.location_name,
          location_name: rep.location_name,
          description: rep.description,
          title: rep.incident_type,
          coordinates: hasCoords ? [rep.latitude, rep.longitude] : null,
          latitude: rep.latitude,
          longitude: rep.longitude,
        },
        districts
      );

      let rawSev: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' = 'MODERATE';
      if (rep.severity) {
        const s = rep.severity.toUpperCase();
        if (s === 'CRITICAL' || s === 'HIGH' || s === 'LOW') rawSev = s;
      } else if (aiAnalysis?.severity) {
        const s = aiAnalysis.severity.toUpperCase();
        if (s === 'CRITICAL' || s === 'HIGH' || s === 'LOW') rawSev = s;
      }

      let verStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'APPROXIMATE' = 'PENDING';
      if (rep.status === 'verified') verStatus = 'VERIFIED';
      else if (rep.status === 'rejected') verStatus = 'REJECTED';
      else if (aiAnalysis?.verification_badge && aiAnalysis.verification_badge.includes('VERIFIED')) verStatus = 'VERIFIED';
      else if (aiAnalysis?.is_relevant) verStatus = 'VERIFIED';

      const realRain = getRealRainfallInfo(
        hasCoords ? rep.latitude : null,
        hasCoords ? rep.longitude : null,
        taluka
      );

      // ── Multi-Factor Calculated Confidence Score ──────────────────────────
      // ── Multi-Factor Calculated Confidence Score ──────────────────────────
      // Dynamic evaluation from real data sources:
      // 1. Base citizen submission: 35%
      let calculatedConfidence = 35;

      // 2. Photo Evidence factor:
      const hasImage = Boolean(rep.image_url || rep.image_filename);
      let photoDelta = 0;
      if (hasImage) {
        photoDelta = 18;
        calculatedConfidence += 18; // Photographic proof attached from incident scene
      }

      // 3. Groq AI Vision / Hazard Analysis corroboration:
      const hasAiHazards = Boolean(
        aiAnalysis?.detected_hazards &&
        Array.isArray(aiAnalysis.detected_hazards) &&
        aiAnalysis.detected_hazards.length > 0 &&
        !aiAnalysis.detected_hazards.includes('general_hazard')
      );
      const isAiVerified = Boolean(
        aiAnalysis?.is_relevant === true ||
        (aiAnalysis?.verification_badge && aiAnalysis.verification_badge.includes('VERIFIED'))
      );
      const groqRawConf = aiAnalysis?.ai_confidence ?? aiAnalysis?.confidence ?? 0.85;

      let visionDelta = 0;
      let visionDetail = 'No image provided: semantic narrative check only';
      if (hasImage) {
        if (aiAnalysis?.is_relevant === false) {
          visionDelta = -20;
          calculatedConfidence -= 20; // Groq vision flagged photo as unrelated / non-hazard
          visionDetail = 'Groq Vision (Llama-3.2-90B) flagged image as unrelated / non-disaster (-20%)';
        } else if (isAiVerified && hasAiHazards) {
          visionDelta = Math.round(groqRawConf * 20) + 8;
          calculatedConfidence += visionDelta;
          visionDetail = `Groq Vision confirmed disaster hazards in scene photo (+${visionDelta}%)`;
        } else if (isAiVerified) {
          visionDelta = Math.round(groqRawConf * 16);
          calculatedConfidence += visionDelta;
          visionDetail = `Groq Vision verified plausible disaster scene (+${visionDelta}%)`;
        } else {
          visionDetail = 'Image attached, pending Groq Vision verification';
        }
      } else if (isAiVerified) {
        visionDelta = 10;
        calculatedConfidence += 10;
        visionDetail = 'Text description verified as plausible emergency narrative (+10%)';
      }

      // 4. Real Meteorological Rain Sensor Corroboration:
      let isActuallyRaining = false;
      let rainRateMm = 0;
      if (realRain) {
        const rainMatch = realRain.match(/([\d.]+)\s*mm\/h/);
        if (rainMatch) {
          rainRateMm = parseFloat(rainMatch[1]);
          if (rainRateMm > 0) isActuallyRaining = true;
        } else if (
          realRain.toLowerCase().includes('rain') ||
          realRain.toLowerCase().includes('precipitation') ||
          realRain.toLowerCase().includes('monsoon')
        ) {
          isActuallyRaining = true;
        }
      }

      let rainDelta = 0;
      let rainDetail = 'Nearest AWS weather station reports 0.0 mm/h (Dry Weather: +0%)';
      if (isActuallyRaining) {
        if (rainRateMm >= 10.0) {
          rainDelta = 18;
          calculatedConfidence += 18; // Heavy storm rainfall sensor directly corroborates flood report
          rainDetail = `Active storm rainfall (${rainRateMm} mm/h) corroborates flood (+18%)`;
        } else {
          rainDelta = 10;
          calculatedConfidence += 10; // Active precipitation sensor corroborates
          rainDetail = `Telemetry shows active precipitation (${rainRateMm || '>0'} mm/h) (+10%)`;
        }
      }

      // 5. Ground Locus Precision & Narrative:
      let gpsDelta = 0;
      if (hasCoords) {
        gpsDelta = 6;
        calculatedConfidence += 6; // High-precision GPS coordinates verified
      }
      let narrativeDelta = 0;
      if (rep.description && rep.description.trim().length > 25) {
        narrativeDelta = 6;
        calculatedConfidence += 6; // Specific localized ground narrative provided
      }

      // Bounded confidence score
      const confScore = Math.min(Math.max(calculatedConfidence, 25), 98);

      list.push({
        id: repId,
        title: rep.incident_type ? `${rep.incident_type} Report` : 'Ground Incident Report',
        description: rep.description || '',
        category: rep.incident_type || 'General Incident',
        severity: rawSev,
        confidenceScore: confScore,
        verificationStatus: verStatus,
        location: rep.location_name || (hasCoords ? `${rep.latitude.toFixed(4)}°N, ${rep.longitude.toFixed(4)}°E` : 'Pune District'),
        coordinates: hasCoords ? [rep.latitude, rep.longitude] : null,
        timestamp: rep.timestamp || rep.created_at || new Date().toISOString(),
        source: 'Citizen Ground Report',
        imageUrl: rep.image_url || null,
        affectedPopulation:
          typeof rep.estimated_population_1km === 'number' && !isNaN(rep.estimated_population_1km)
            ? Math.round(rep.estimated_population_1km)
            : rep.estimated_population_1km && !isNaN(Number(rep.estimated_population_1km))
            ? Math.round(Number(rep.estimated_population_1km))
            : null,
        taluka: taluka,
        rainfallInfo: realRain,
        assignedTeam: assign
          ? {
              id: assign.id || assign.assigned_team_id || 'TEAM-1',
              name: assign.assigned_team_name || assign.team_name || 'Emergency Squad',
              vehicleType: assign.vehicle_type || 'Rapid Response Unit',
              department: assign.department || 'NDRF Pune',
              status: assign.status || 'Active',
            }
          : null,
        responseStatus: assign ? 'ASSIGNED' : 'UNASSIGNED',
        aiAnalysis: {
          actionableSummary: aiAnalysis?.actionable_summary || aiAnalysis?.summary || undefined,
          detectedHazards: aiAnalysis?.detected_hazards || aiAnalysis?.hazards || undefined,
          verificationBadge: aiAnalysis?.verification_badge || 'AI-VERIFIED FIELD OBSERVATION',
          impactRadiusKm: aiAnalysis?.impact_radius_km || undefined,
          rawConfidence: confScore / 100,
          ai_confidence: confScore / 100,
          confidenceBreakdown: {
            base: 35,
            photo: photoDelta,
            vision: visionDelta,
            visionDetail,
            rain: rainDelta,
            rainDetail,
            gps: gpsDelta,
            narrative: narrativeDelta,
            total: confScore,
          },
        },
      });
    });
    return list;
  }, [groundReports, assignments, districts, liveWeatherStations]);

  // ── Cross-View Navigation Actions ──────────────────────────────────────────
  const handleNavigateToIncident = useCallback((incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setActiveView('disaster');
  }, []);

  const handleNavigateToTaluka = useCallback((talukaId: string) => {
    setSelectedDistrictId(talukaId);
    setActiveView('district');
  }, []);

  // ── Real Total Exposed Population from Backend ────────────────────────────
  const realExposedPopulation = useMemo(() => {
    if (prioritiesSummary?.total_exposed_population) {
      return prioritiesSummary.total_exposed_population;
    }
    return districts.reduce((acc, d) => acc + (d.affectedPopulation || 0), 0);
  }, [prioritiesSummary, districts]);

  return (
    <div className="min-h-screen w-full bg-[#f5f5f7] flex flex-col font-sans">
      {/* ── GLOBAL SAHAYAK HEADER ─────────────────────────────────────────── */}
      <MainHeader currentArea="Pune District Command" isResponseView={true} />

      {/* ── TOP SWITCHER: BOTH BUTTONS ON LEFT AND RIGHT END ─────────────── */}
      <nav
        aria-label="Command Center View Switcher"
        className="w-full bg-white border-b border-[#e5e5ea] px-4 md:px-8 py-3.5 sticky top-0 z-40 shadow-xs shrink-0"
      >
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-6">
          
          {/* ── LEFT END: Disaster Command Center Tab Button ── */}
          <button
            id="tab-disaster-command-center"
            type="button"
            role="tab"
            aria-selected={activeView === 'disaster'}
            aria-controls="panel-disaster-command-center"
            onClick={() => setActiveView('disaster')}
            className={`flex items-center gap-3.5 px-6 py-3 md:px-8 md:py-3.5 min-w-[280px] sm:min-w-[340px] md:min-w-[380px] rounded-[18px] transition-all cursor-pointer select-none border text-left ${
              activeView === 'disaster'
                ? 'bg-[#f5f5f7] border-[#0066cc] ring-2 ring-[#0066cc]/25 shadow-sm text-[#1d1d1f]'
                : 'bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] border-[#e5e5ea]'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                activeView === 'disaster' ? 'bg-[#ff3b30] animate-pulse' : 'bg-[#86868b]'
              }`}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold tracking-tight text-[#1d1d1f]">
                  Disaster Command Center
                </span>
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    activeView === 'disaster'
                      ? 'bg-[#0066cc]/10 text-[#0066cc] border-[#0066cc]/20'
                      : 'bg-black/5 text-[#86868b] border-[#e5e5ea]'
                  }`}
                >
                  {unifiedIncidents.length}
                </span>
              </div>
              <span
                className={`text-[11.5px] block mt-0.5 ${
                  activeView === 'disaster' ? 'text-[#48484a] font-medium' : 'text-[#86868b]'
                }`}
              >
                Live Incident Triage & Emergency Sorties
              </span>
            </div>
          </button>

          {/* ── RIGHT END: District / Taluka Command Center Tab Button ── */}
          <button
            id="tab-taluka-command-center"
            type="button"
            role="tab"
            aria-selected={activeView === 'district'}
            aria-controls="panel-taluka-command-center"
            onClick={() => setActiveView('district')}
            className={`flex items-center gap-3.5 px-6 py-3 md:px-8 md:py-3.5 min-w-[280px] sm:min-w-[340px] md:min-w-[380px] rounded-[18px] transition-all cursor-pointer select-none border text-left ${
              activeView === 'district'
                ? 'bg-[#f5f5f7] border-[#0066cc] ring-2 ring-[#0066cc]/25 shadow-sm text-[#1d1d1f]'
                : 'bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] border-[#e5e5ea]'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                activeView === 'district' ? 'bg-[#0066cc]' : 'bg-[#86868b]'
              }`}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold tracking-tight text-[#1d1d1f]">
                  District / Taluka Command Center
                </span>
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    activeView === 'district'
                      ? 'bg-[#0066cc]/10 text-[#0066cc] border-[#0066cc]/20'
                      : 'bg-black/5 text-[#86868b] border-[#e5e5ea]'
                  }`}
                >
                  14
                </span>
              </div>
              <span
                className={`text-[11.5px] block mt-0.5 ${
                  activeView === 'district' ? 'text-[#48484a] font-medium' : 'text-[#86868b]'
                }`}
              >
                14 Official Talukas & Regional Risk Index
              </span>
            </div>
          </button>
        </div>
      </nav>

      {/* ── VIEWPORT CONTENT: NATURALLY SCROLLABLE WORKSPACE ──────────────── */}
      <main className="flex-1 w-full">
        {activeView === 'disaster' ? (
          <div
            id="panel-disaster-command-center"
            role="tabpanel"
            aria-labelledby="tab-disaster-command-center"
            className="w-full"
          >
            <DisasterCommandCenter
              incidents={unifiedIncidents}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={setSelectedIncidentId}
              isLoading={isLoading}
              onNavigateToTaluka={handleNavigateToTaluka}
              realExposedPopulation={realExposedPopulation}
            />
          </div>
        ) : (
          <div
            id="panel-taluka-command-center"
            role="tabpanel"
            aria-labelledby="tab-taluka-command-center"
            className="w-full h-[calc(100vh-112px)]"
          >
            <TalukaCommandCenter
              districts={districts}
              selectedDistrictId={selectedDistrictId}
              onSelectDistrict={setSelectedDistrictId}
              incidents={unifiedIncidents}
              onNavigateToIncident={handleNavigateToIncident}
            />
          </div>
        )}
      </main>
    </div>
  );
}
