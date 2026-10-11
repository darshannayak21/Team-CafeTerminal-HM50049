'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { IncidentMiniMapContainer } from '@/components/map/IncidentMiniMapContainer';

export interface UnifiedIncident {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  confidenceScore: number | null;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'APPROXIMATE';
  location: string;
  coordinates: [number, number] | null;
  timestamp: string;
  source: string;
  imageUrl?: string | null;
  affectedPopulation?: number | null;
  taluka?: string | null;
  rainfallInfo?: string | null;
  assignedTeam?: {
    id: string;
    name: string;
    vehicleType?: string;
    department?: string;
    status: string;
  } | null;
  responseStatus: 'ASSIGNED' | 'DISPATCHED' | 'EN_ROUTE' | 'ON_SCENE' | 'RESOLVED' | 'UNASSIGNED';
  aiAnalysis?: {
    actionableSummary?: string;
    detectedHazards?: string[];
    verificationBadge?: string;
    impactRadiusKm?: number;
    rawConfidence?: number;
    ai_confidence?: number;
    confidenceBreakdown?: {
      base: number;
      photo: number;
      vision: number;
      visionDetail: string;
      rain: number;
      rainDetail: string;
      gps: number;
      narrative: number;
      total: number;
    };
  } | null;
}

interface DisasterCommandCenterProps {
  incidents: UnifiedIncident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  isLoading?: boolean;
  onNavigateToTaluka?: (talukaId: string) => void;
  realExposedPopulation?: number;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-[#ff3b30]/10', text: 'text-[#d70015]', border: 'border-[#ff3b30]/20' },
  HIGH: { bg: 'bg-[#ff9500]/10', text: 'text-[#c93400]', border: 'border-[#ff9500]/20' },
  MODERATE: { bg: 'bg-[#ffcc00]/15', text: 'text-[#9e6a00]', border: 'border-[#ffcc00]/30' },
  LOW: { bg: 'bg-[#34c759]/10', text: 'text-[#248a3d]', border: 'border-[#34c759]/20' },
};

const VERIFICATION_COLORS: Record<string, { bg: string; text: string }> = {
  VERIFIED: { bg: 'bg-[#34c759]/10', text: 'text-[#248a3d]' },
  PENDING: { bg: 'bg-[#ff9500]/10', text: 'text-[#c93400]' },
  APPROXIMATE: { bg: 'bg-[#0066cc]/10', text: 'text-[#0066cc]' },
  REJECTED: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]' },
};

export const DisasterCommandCenter: React.FC<DisasterCommandCenterProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  isLoading = false,
  onNavigateToTaluka,
  realExposedPopulation,
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [responseFilter, setResponseFilter] = useState('ALL');
  const [talukaFilter, setTalukaFilter] = useState('ALL');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else if (selectedIncidentId) {
          onSelectIncident(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIncidentId, previewImage, onSelectIncident]);


  // Calculate Summary Metrics
  const summary = useMemo(() => {
    const total = incidents.length;
    const verified = incidents.filter(i => i.verificationStatus === 'VERIFIED').length;
    const critical = incidents.filter(i => i.severity === 'CRITICAL').length;
    const pendingVerification = incidents.filter(i => i.verificationStatus === 'PENDING').length;
    const activeOperations = incidents.filter(i => i.responseStatus !== 'UNASSIGNED').length;
    const unassigned = incidents.filter(i => i.responseStatus === 'UNASSIGNED').length;
    
    // Sum from incidents or fallback to real exposed district population
    const incidentPopSum = incidents.reduce((acc, i) => acc + (i.affectedPopulation || 0), 0);
    const totalAffectedPopulation = realExposedPopulation && realExposedPopulation > 0 
      ? realExposedPopulation 
      : incidentPopSum;

    return {
      total,
      verified,
      critical,
      pendingVerification,
      activeOperations,
      unassigned,
      totalAffectedPopulation,
    };
  }, [incidents, realExposedPopulation]);

  // Distinct Talukas list for filter
  const availableTalukas = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach(i => {
      if (i.taluka) set.add(i.taluka);
    });
    return Array.from(set).sort();
  }, [incidents]);

  // Distinct Categories list for filter
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [incidents]);

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesLocation = item.location.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesLocation && !matchesDesc) return false;
      }
      // Type
      if (typeFilter !== 'ALL' && item.category !== typeFilter) return false;
      // Severity
      if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
      // Verification
      if (verificationFilter !== 'ALL' && item.verificationStatus !== verificationFilter) return false;
      // Response
      if (responseFilter === 'ASSIGNED' && item.responseStatus === 'UNASSIGNED') return false;
      if (responseFilter === 'UNASSIGNED' && item.responseStatus !== 'UNASSIGNED') return false;
      // Taluka
      if (talukaFilter !== 'ALL' && item.taluka !== talukaFilter) return false;

      return true;
    });
  }, [incidents, searchQuery, typeFilter, severityFilter, verificationFilter, responseFilter, talukaFilter]);

  // Selected incident object
  const activeIncident = useMemo(() => {
    if (!selectedIncidentId) return null;
    return incidents.find(i => i.id === selectedIncidentId) || null;
  }, [incidents, selectedIncidentId]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (activeIncident) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeIncident]);

  return (
    <div className="w-full flex flex-col bg-[#f5f5f7]">
      {/* ── SECTION A: SUMMARY METRICS CARDS (Top KPI Banner) ── */}
      <section className="bg-white border-b border-[#e5e5ea] px-4 md:px-8 py-5 shrink-0">
        <div className="max-w-[1700px] mx-auto">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse" />
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] uppercase text-[#1d1d1f]">
                Disaster Command Intelligence · Live Metrics
              </h2>
            </div>
            <span className="text-[11px] text-[#86868b] font-mono">
              Auto-sync active · {incidents.length} Telemetry Feeds Ingested
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1. Total Incidents */}
            <div className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-[16px] p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-[0.04em]">
                Total Incidents
              </span>
              <div className="text-[24px] font-bold text-[#1d1d1f] tracking-tight mt-1">
                {summary.total}
              </div>
              <span className="text-[10px] text-[#86868b]">Field + News Ingest</span>
            </div>

            {/* 2. Critical Incidents */}
            <div className="bg-[#ff3b30]/5 border border-[#ff3b30]/20 rounded-[16px] p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[#d70015] uppercase tracking-[0.04em]">
                Critical Severity
              </span>
              <div className="text-[24px] font-bold text-[#d70015] tracking-tight mt-1">
                {summary.critical}
              </div>
              <span className="text-[10px] text-[#d70015]/80">Immediate intervention</span>
            </div>

            {/* 3. Verified Incidents */}
            <div className="bg-[#34c759]/5 border border-[#34c759]/20 rounded-[16px] p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[#248a3d] uppercase tracking-[0.04em]">
                Verified
              </span>
              <div className="text-[24px] font-bold text-[#248a3d] tracking-tight mt-1">
                {summary.verified}
              </div>
              <span className="text-[10px] text-[#248a3d]/80">Ground confirmed</span>
            </div>

            {/* 4. Awaiting Verification */}
            <div className="bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-[16px] p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[#c93400] uppercase tracking-[0.04em]">
                Pending Verify
              </span>
              <div className="text-[24px] font-bold text-[#c93400] tracking-tight mt-1">
                {summary.pendingVerification}
              </div>
              <span className="text-[10px] text-[#c93400]/80">Under AI/Officer review</span>
            </div>

            {/* 5. Active Response Operations */}
            <div className="bg-[#0066cc]/5 border border-[#0066cc]/20 rounded-[16px] p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[#0066cc] uppercase tracking-[0.04em]">
                Active Sorties
              </span>
              <div className="text-[24px] font-bold text-[#0066cc] tracking-tight mt-1">
                {summary.activeOperations}
              </div>
              <span className="text-[10px] text-[#0066cc]/80">Field teams deployed</span>
            </div>

            {/* 6. Unassigned Incidents */}
            <div className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-[16px] p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-[0.04em]">
                Unassigned
              </span>
              <div className="text-[24px] font-bold text-[#1d1d1f] tracking-tight mt-1">
                {summary.unassigned}
              </div>
              <span className="text-[10px] text-[#86868b]">Awaiting dispatch order</span>
            </div>

            {/* 7. Estimated Affected Population (Real WorldPop) */}
            <div className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-[16px] p-3.5 flex flex-col justify-between col-span-2 sm:col-span-4 lg:col-span-1">
              <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-[0.04em]">
                At-Risk Population
              </span>
              <div className="text-[24px] font-bold text-[#1d1d1f] tracking-tight mt-1" suppressHydrationWarning>
                {summary.totalAffectedPopulation > 0
                  ? new Intl.NumberFormat('en-IN').format(Math.round(summary.totalAffectedPopulation))
                  : 'Data unavailable'}
              </div>
              <span className="text-[10px] text-[#86868b]">WorldPop polygon overlay</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION B: INCIDENT FILTERS & SEARCH CONTROLS ── */}
      <section className="bg-white border-b border-[#e5e5ea] px-4 md:px-8 py-3.5 shrink-0">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[260px] max-w-[420px] relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by ID, title, or location..."
              className="w-full bg-[#f5f5f7] border border-[#e5e5ea] rounded-full px-4 py-2 text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0066cc]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#86868b] hover:text-[#1d1d1f]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            {/* Category Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-full px-3 py-1.5 text-[#1d1d1f] focus:outline-none focus:border-[#0066cc] cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-full px-3 py-1.5 text-[#1d1d1f] focus:outline-none focus:border-[#0066cc] cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>

            {/* Verification Filter */}
            <select
              value={verificationFilter}
              onChange={e => setVerificationFilter(e.target.value)}
              className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-full px-3 py-1.5 text-[#1d1d1f] focus:outline-none focus:border-[#0066cc] cursor-pointer"
            >
              <option value="ALL">All Verification</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROXIMATE">Approximate Location</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Response Filter */}
            <select
              value={responseFilter}
              onChange={e => setResponseFilter(e.target.value)}
              className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-full px-3 py-1.5 text-[#1d1d1f] focus:outline-none focus:border-[#0066cc] cursor-pointer"
            >
              <option value="ALL">All Response</option>
              <option value="ASSIGNED">Team Deployed</option>
              <option value="UNASSIGNED">Unassigned Only</option>
            </select>

            {/* Taluka Filter */}
            <select
              value={talukaFilter}
              onChange={e => setTalukaFilter(e.target.value)}
              className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-full px-3 py-1.5 text-[#1d1d1f] focus:outline-none focus:border-[#0066cc] cursor-pointer"
            >
              <option value="ALL">All Talukas ({availableTalukas.length})</option>
              {availableTalukas.map(taluka => (
                <option key={taluka} value={taluka}>{taluka}</option>
              ))}
            </select>

            {/* Reset Button */}
            {(typeFilter !== 'ALL' || severityFilter !== 'ALL' || verificationFilter !== 'ALL' || responseFilter !== 'ALL' || talukaFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setTypeFilter('ALL');
                  setSeverityFilter('ALL');
                  setVerificationFilter('ALL');
                  setResponseFilter('ALL');
                  setTalukaFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-[11px] text-[#0066cc] hover:underline font-medium px-2 py-1 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION C: EMERGENCY INCIDENT REGISTRY ── */}
      <div className="max-w-[1700px] w-full mx-auto px-4 md:px-8 py-6">
        <div className="w-full space-y-4">
            
            {/* Header Strip */}
            <div className="bg-white rounded-[18px] border border-[#e5e5ea] p-4 flex items-center justify-between shadow-xs">
              <div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                  Emergency Incident Registry
                </h3>
                <p className="text-[12px] text-[#86868b] mt-0.5">
                  Displaying {filteredIncidents.length} of {incidents.length} recorded incidents
                </p>
              </div>
              <span className="text-[11px] font-medium text-[#86868b] bg-[#f5f5f7] px-3 py-1 rounded-full border border-[#e5e5ea]">
                Ordered by urgency & timestamp
              </span>
            </div>

            {/* Empty States */}
            {isLoading && incidents.length === 0 && (
              <div className="py-20 text-center text-[#86868b] text-[13px] bg-white rounded-[18px] border border-[#e5e5ea]">
                <div className="w-6 h-6 rounded-full border-2 border-[#0066cc] border-t-transparent animate-spin mx-auto mb-3" />
                Polling live emergency telemetry feeds...
              </div>
            )}

            {!isLoading && filteredIncidents.length === 0 && (
              <div className="py-20 text-center text-[#86868b] text-[13px] bg-white rounded-[18px] border border-[#e5e5ea]">
                <div className="w-12 h-12 rounded-full bg-[#f5f5f7] border border-[#e5e5ea] flex items-center justify-center text-xl mx-auto mb-3">
                  ✓
                </div>
                <p className="font-semibold text-[#1d1d1f] text-[15px]">No incidents match the selected filter criteria</p>
                <p className="text-[12px] text-[#86868b] mt-1">Try widening search terms or resetting filters.</p>
              </div>
            )}

            {/* Incident Cards Container: Full 2-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIncidents.map(item => {
                const isSelected = selectedIncidentId === item.id;
                const sev = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.MODERATE;
                const ver = VERIFICATION_COLORS[item.verificationStatus] || VERIFICATION_COLORS.PENDING;

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectIncident(item.id)}
                    className={`rounded-[18px] p-5 border transition-all cursor-pointer select-none bg-white shadow-xs hover:shadow-md ${
                      isSelected
                        ? 'border-[#0066cc] ring-2 ring-[#0066cc]/30 bg-[#fafafc]'
                        : 'border-[#e5e5ea] hover:border-[#86868b]/40'
                    }`}
                  >
                    {/* Top Meta: Severity, Verification, Category, ID */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${sev.bg} ${sev.text} ${sev.border}`}>
                          {item.severity}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${ver.bg} ${ver.text}`}>
                          {item.verificationStatus}
                        </span>
                        {item.category && (
                          <span className="text-[10px] font-medium bg-[#f5f5f7] text-[#1d1d1f] border border-[#e5e5ea] px-2.5 py-0.5 rounded-full">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[#86868b]">{item.id}</span>
                    </div>

                    {/* Title & Description */}
                    <h4 className="text-[16px] font-semibold text-[#1d1d1f] tracking-tight leading-snug mb-1.5">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-[13px] text-[#48484a] line-clamp-2 leading-relaxed mb-3">
                        {item.description}
                      </p>
                    )}

                    {/* Telemetry Strip: Real Location, WorldPop Exposure, Photo, Operation */}
                    <div className="pt-3 border-t border-[#f0f0f0] flex flex-wrap items-center justify-between gap-2.5 text-[11.5px] text-[#86868b]">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-[#1d1d1f] font-medium">📍 {item.location}</span>
                        {item.taluka && (
                          <span className="text-[#0066cc] font-medium bg-[#0066cc]/10 px-2 py-0.5 rounded-full text-[10px]">
                            {item.taluka} Taluka
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {item.affectedPopulation !== null && item.affectedPopulation !== undefined && (
                          <span className="font-semibold text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] px-2.5 py-0.5 rounded-full text-[11px]" suppressHydrationWarning>
                            👥 {new Intl.NumberFormat('en-IN').format(Math.round(item.affectedPopulation))} lives
                          </span>
                        )}
                        {item.imageUrl && (
                          <span className="bg-[#f5f5f7] border border-[#e5e5ea] px-2 py-0.5 rounded-full text-[10px] text-[#1d1d1f] font-medium">
                            📷 Photo Attached
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${
                          item.responseStatus !== 'UNASSIGNED'
                            ? 'bg-[#0066cc]/10 text-[#0066cc]'
                            : 'bg-[#f5f5f7] text-[#86868b] border border-[#e5e5ea]'
                        }`}>
                          {item.responseStatus !== 'UNASSIGNED' ? '● Operation Active' : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>

      {/* ── MODAL POPUP: INCIDENT DETAIL DOSSIER (CENTERED SCROLLABLE POPUP) ── */}
      {activeIncident && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
          onClick={() => onSelectIncident(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[24px] border border-[#e5e5ea] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dossier Header */}
            <div className="px-5 py-4 border-b border-[#e5e5ea] flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc]" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#0066cc]">
                  Incident Detail Dossier
                </span>
                <span className="text-[11px] font-mono text-[#86868b]">[{activeIncident.id}]</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectIncident(null)}
                className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] flex items-center justify-center text-sm font-semibold cursor-pointer transition-colors"
                title="Close Dossier"
                aria-label="Close Dossier"
              >
                ✕
              </button>
            </div>

            {/* 7 Structured Detail Sections (Scrollable Body) */}
            <div className="p-5 md:p-6 space-y-5 overflow-y-auto flex-1">
                
                {/* 1. Incident Overview */}
                <div className="p-4.5 bg-[#f5f5f7] rounded-[18px] border border-[#e5e5ea] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                      1. Incident Overview
                    </span>
                    <span className="text-[11px] text-[#86868b] font-medium">Source: {activeIncident.source}</span>
                  </div>
                  <h3 className="text-[19px] font-semibold text-[#1d1d1f] tracking-tight">
                    {activeIncident.title}
                  </h3>
                  <p className="text-[13px] text-[#1d1d1f] leading-relaxed">
                    {activeIncident.description || 'No additional narrative description provided.'}
                  </p>
                  <div className="pt-2.5 border-t border-[#e5e5ea] flex flex-wrap items-center justify-between text-[11.5px] text-[#86868b]">
                    <span>Reported: {new Date(activeIncident.timestamp).toLocaleString('en-IN')}</span>
                    <span>Category: <strong className="text-[#1d1d1f]">{activeIncident.category}</strong></span>
                  </div>
                </div>

                {/* 2. AI Detection & Verification */}
                <div className="p-4.5 bg-white rounded-[18px] border border-[#e5e5ea] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                      2. AI Verification & Telemetry Corroboration
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                      VERIFICATION_COLORS[activeIncident.verificationStatus]?.bg || 'bg-[#34c759]/10'
                    } ${VERIFICATION_COLORS[activeIncident.verificationStatus]?.text || 'text-[#248a3d]'}`}>
                      {activeIncident.verificationStatus}
                    </span>
                  </div>

                  {/* Calculated Confidence Score Banner */}
                  <div className="p-3 bg-[#f5f5f7] rounded-[14px] border border-[#e5e5ea] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-[#1d1d1f]">Confidence Metric:</div>
                      <div className="text-[11px] text-[#64748b]">
                        Multi-factor score evaluated from real sensors, proofs & Groq AI
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[20px] font-bold font-mono ${
                        (activeIncident.confidenceScore || 0) >= 75 ? 'text-[#0066cc]' :
                        (activeIncident.confidenceScore || 0) >= 50 ? 'text-[#d97706]' : 'text-[#86868b]'
                      }`}>
                        {activeIncident.confidenceScore ?? 35}%
                      </div>
                      <div className="text-[9.5px] font-semibold uppercase tracking-wider text-[#86868b]">
                        {(activeIncident.confidenceScore || 0) >= 75 ? 'High Confidence' :
                         (activeIncident.confidenceScore || 0) >= 50 ? 'Moderate Confidence' : 'Uncorroborated'}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Factor Verification Breakdown */}
                  {activeIncident.aiAnalysis?.confidenceBreakdown && (
                    <div className="space-y-1.5 pt-1 text-[11px]">
                      <div className="text-[10.5px] font-semibold text-[#1d1d1f] uppercase tracking-wide">
                        Real-Data Confidence Breakdown:
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#fafafa] border border-[#e5e5ea]">
                          <span className="text-[#334155]">📋 Citizen Field Intake Baseline</span>
                          <span className="font-mono font-bold text-[#0066cc]">+35%</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#fafafa] border border-[#e5e5ea]">
                          <span className="text-[#334155]">
                            📸 Photographic Evidence: {activeIncident.imageUrl ? 'Attached' : 'None Provided'}
                          </span>
                          <span className={`font-mono font-bold ${activeIncident.aiAnalysis.confidenceBreakdown.photo > 0 ? 'text-[#34c759]' : 'text-[#86868b]'}`}>
                            {activeIncident.aiAnalysis.confidenceBreakdown.photo > 0 ? `+${activeIncident.aiAnalysis.confidenceBreakdown.photo}%` : '0%'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#fafafa] border border-[#e5e5ea]">
                          <span className="text-[#334155] text-[10.5px]">
                            🤖 Groq Vision: {activeIncident.aiAnalysis.confidenceBreakdown.visionDetail}
                          </span>
                          <span className={`font-mono font-bold shrink-0 ml-2 ${
                            activeIncident.aiAnalysis.confidenceBreakdown.vision > 0 ? 'text-[#34c759]' :
                            activeIncident.aiAnalysis.confidenceBreakdown.vision < 0 ? 'text-[#dc2626]' : 'text-[#86868b]'
                          }`}>
                            {activeIncident.aiAnalysis.confidenceBreakdown.vision >= 0 ? `+${activeIncident.aiAnalysis.confidenceBreakdown.vision}%` : `${activeIncident.aiAnalysis.confidenceBreakdown.vision}%`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#fafafa] border border-[#e5e5ea]">
                          <span className="text-[#334155] text-[10.5px]">
                            🌧️ AWS Rainfall Sensor: {activeIncident.aiAnalysis.confidenceBreakdown.rainDetail}
                          </span>
                          <span className={`font-mono font-bold shrink-0 ml-2 ${activeIncident.aiAnalysis.confidenceBreakdown.rain > 0 ? 'text-[#34c759]' : 'text-[#86868b]'}`}>
                            {activeIncident.aiAnalysis.confidenceBreakdown.rain > 0 ? `+${activeIncident.aiAnalysis.confidenceBreakdown.rain}%` : '0%'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#fafafa] border border-[#e5e5ea]">
                          <span className="text-[#334155]">
                            📍 GPS Geolocation & Narrative Detail
                          </span>
                          <span className="font-mono font-bold text-[#34c759]">
                            +{activeIncident.aiAnalysis.confidenceBreakdown.gps + activeIncident.aiAnalysis.confidenceBreakdown.narrative}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeIncident.aiAnalysis?.actionableSummary && (
                    <p className="text-[12.5px] text-[#1d1d1f] italic bg-[#f5f5f7] p-3 rounded-[12px] border border-[#e5e5ea]">
                      "{activeIncident.aiAnalysis.actionableSummary}"
                    </p>
                  )}
                  {activeIncident.aiAnalysis?.detectedHazards && activeIncident.aiAnalysis.detectedHazards.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeIncident.aiAnalysis.detectedHazards.map((h, i) => (
                        <span key={i} className="text-[10px] bg-[#f5f5f7] border border-[#e5e5ea] px-2.5 py-0.5 rounded-full text-[#86868b] font-medium">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Evidence & Ground Reports */}
                <div className="p-4.5 bg-white rounded-[18px] border border-[#e5e5ea] space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                    3. Ground Evidence & Intake Media
                  </div>
                  {activeIncident.imageUrl ? (
                    <div>
                      <div
                        onClick={() => setPreviewImage(
                          activeIncident.imageUrl!.startsWith('http')
                            ? activeIncident.imageUrl!
                            : `http://localhost:5000${activeIncident.imageUrl!.startsWith('/') ? '' : '/'}${activeIncident.imageUrl!}`
                        )}
                        className="relative group rounded-[14px] overflow-hidden border border-[#e5e5ea] bg-[#f5f5f7] max-h-[220px] cursor-pointer"
                      >
                        <img
                          src={
                            activeIncident.imageUrl.startsWith('http')
                              ? activeIncident.imageUrl
                              : `http://localhost:5000${activeIncident.imageUrl.startsWith('/') ? '' : '/'}${activeIncident.imageUrl}`
                          }
                          alt="Ground Evidence"
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[12px] font-bold">
                          Click to Enlarge Photographic Evidence
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-[12px] bg-[#f5f5f7] text-[12px] text-[#86868b] italic">
                      No photographic ground evidence attached with this intake.
                    </div>
                  )}
                </div>

                {/* 4. Weather & Real Rainfall Telemetry */}
                <div className="p-4.5 bg-white rounded-[18px] border border-[#e5e5ea] space-y-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                    4. Weather & Real Meteorological Telemetry
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                    <div className="bg-[#f5f5f7] p-3 rounded-[12px] border border-[#e5e5ea]">
                      <span className="text-[10px] uppercase text-[#86868b] block mb-0.5">Precipitation Telemetry</span>
                      <span className="font-semibold text-[#1d1d1f]">
                        {activeIncident.rainfallInfo || 'Data unavailable'}
                      </span>
                    </div>
                    <div className="bg-[#f5f5f7] p-3 rounded-[12px] border border-[#e5e5ea]">
                      <span className="text-[10px] uppercase text-[#86868b] block mb-0.5">Station Corroboration</span>
                      <span className="font-semibold text-[#1d1d1f]">
                        {activeIncident.taluka ? `${activeIncident.taluka} Sector AWS` : 'District IMD Radar'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Population & Real WorldPop Impact */}
                <div className="p-4.5 bg-white rounded-[18px] border border-[#e5e5ea] space-y-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                    5. Population & Human Impact Scope
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-[#f5f5f7] rounded-[14px] border border-[#e5e5ea]">
                    <div>
                      <span className="text-[10.5px] font-semibold text-[#86868b] uppercase">
                        WorldPop Exposure ({activeIncident.aiAnalysis?.impactRadiusKm || 0.1}km Zone)
                      </span>
                      <div className="text-[17px] font-bold text-[#1d1d1f] mt-0.5" suppressHydrationWarning>
                        {activeIncident.affectedPopulation !== null && activeIncident.affectedPopulation !== undefined
                          ? `${new Intl.NumberFormat('en-IN').format(Math.round(activeIncident.affectedPopulation))} Lives at Risk`
                          : 'Data unavailable'}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#ff3b30]/10 text-[#d70015]">
                      {activeIncident.severity === 'CRITICAL' ? 'High Exposure' : 'Active Hazard'}
                    </span>
                  </div>
                </div>

                {/* 6. Response Team & Assigned Resources */}
                <div className="p-4.5 bg-white rounded-[18px] border border-[#e5e5ea] space-y-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                    6. Operational Response & Resources
                  </div>
                  {activeIncident.assignedTeam ? (
                    <div className="p-3.5 bg-[#0066cc]/5 border border-[#0066cc]/20 rounded-[14px] text-[12px]">
                      <div className="font-semibold text-[#0066cc] text-[13px]">
                        Deployed: {activeIncident.assignedTeam.name}
                      </div>
                      <div className="text-[#48484a] mt-1">
                        Vehicle: {activeIncident.assignedTeam.vehicleType || 'Emergency Response'} · Status: <span className="font-semibold uppercase text-[#0066cc]">{activeIncident.assignedTeam.status}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-[#f5f5f7] rounded-[14px] border border-[#e5e5ea] text-[12px] text-[#86868b] flex items-center justify-between">
                      <span>No response team currently assigned to this incident.</span>
                      <span className="font-semibold text-[#c93400] bg-[#c93400]/10 px-2.5 py-0.5 rounded-full text-[11px]">Unassigned</span>
                    </div>
                  )}
                </div>

                {/* 7. Incident Location & Map */}
                <div className="p-4.5 bg-white rounded-[18px] border border-[#e5e5ea] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                      7. Incident Location & Map
                    </div>
                    {activeIncident.taluka && onNavigateToTaluka && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTaluka(activeIncident.taluka!.toLowerCase().replace(' ', '-'))}
                        className="text-[11px] text-[#0066cc] font-medium hover:underline cursor-pointer"
                      >
                        View in {activeIncident.taluka} Taluka Dashboard →
                      </button>
                    )}
                  </div>

                  <div className="text-[12.5px] text-[#1d1d1f]">
                    <strong>Location:</strong> {activeIncident.location}
                    {activeIncident.coordinates && (
                      <span className="font-mono text-[#86868b] ml-1.5">
                        [{activeIncident.coordinates[0].toFixed(4)}° N, {activeIncident.coordinates[1].toFixed(4)}° E]
                      </span>
                    )}
                  </div>

                  <div className="h-[260px] w-full rounded-[16px] overflow-hidden border border-[#e5e5ea]">
                    <IncidentMiniMapContainer
                      coordinates={activeIncident.coordinates}
                      title={activeIncident.title}
                      severity={activeIncident.severity}
                      category={activeIncident.category}
                      locationName={activeIncident.location}
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      {/* Ground Photo Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer"
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#1d1d1f] rounded-[24px] overflow-hidden border border-white/20 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 text-white">
              <span className="text-[13px] font-medium">Ground Photographic Evidence</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-white/70 hover:text-white text-base font-semibold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center">
              <img
                src={previewImage}
                alt="Enlarged Ground Evidence"
                className="w-full max-h-[75vh] object-contain rounded-[14px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
