'use client';

import React, { useState } from 'react';
import { TalukaDistrict, IncidentMarkerData } from '@/types/prototype';
import { DistrictMapContainer } from '@/components/map/DistrictMapContainer';
import { LiveUpdatesFeed } from '@/components/public/LiveUpdatesFeed';
import { PROTOTYPE_INCIDENTS, PROTOTYPE_LIVE_UPDATES } from '@/data/prototype';

interface DistrictIntelligenceProps {
  district: TalukaDistrict;
}

export const DistrictIntelligence: React.FC<DistrictIntelligenceProps> = ({
  district,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<IncidentMarkerData | null>(null);
  const [showEvidenceBreakdown, setShowEvidenceBreakdown] = useState<boolean>(false);

  const districtUpdates = PROTOTYPE_LIVE_UPDATES.filter(
    (u) => !u.talukaId || u.talukaId.toLowerCase() === district.id.toLowerCase()
  );

  return (
    <div className="flex flex-col h-full bg-canvas overflow-y-auto scrollbar-none">
      {/* ── 1. DISTRICT HEADER ────────────────────────────────────────── */}
      <div className="p-6 md:p-8 border-b border-hairline bg-canvas">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[28px] font-semibold text-ink tracking-tight">
                {district.name}
              </h1>
              <span className="text-[13px] font-normal text-ink-muted-48 uppercase tracking-wide">
                Taluka
              </span>
            </div>
            <div className={`text-[12px] font-semibold uppercase tracking-wide ${
              district.riskLevel === 'CRITICAL' ? 'text-[#ff3b30]' : 
              district.riskLevel === 'HIGH' ? 'text-[#ff9500]' : 'text-[#ffcc00]'
            }`}>
              {district.riskLevel} PRIORITY
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-normal tracking-[-0.12px] px-3 py-1 border border-hairline bg-surface-pearl text-ink-muted-80 uppercase rounded-sm">
              Tactical Intel
            </span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-canvas border border-hairline rounded-lg p-4">
            <span className="block text-[12px] uppercase text-ink-muted-48 tracking-[-0.12px] mb-1">
              Hazard Score
            </span>
            <span className="text-[24px] font-semibold tracking-tight text-ink">
              {district.hazardScore.toFixed(2)}
            </span>
          </div>

          <div className="bg-canvas border border-hairline rounded-lg p-4">
            <span className="block text-[12px] uppercase text-ink-muted-48 tracking-[-0.12px] mb-1">
              Affected Pop.
            </span>
            <span className="text-[24px] font-semibold tracking-tight text-ink">
              {district.affectedPopulation.toLocaleString()}
            </span>
          </div>

          <div className="bg-canvas border border-hairline rounded-lg p-4">
            <span className="block text-[12px] uppercase text-ink-muted-48 tracking-[-0.12px] mb-1">
              At-Risk Roads
            </span>
            <span className="text-[24px] font-semibold tracking-tight text-ink">
              {district.atRiskRoadsCount}
            </span>
          </div>

          <div className="bg-canvas border border-hairline rounded-lg p-4">
            <span className="block text-[12px] uppercase text-ink-muted-48 tracking-[-0.12px] mb-1">
              Disrupted
            </span>
            <span className="text-[24px] font-semibold tracking-tight text-[#ff3b30]">
              {district.disruptedRoadsCount}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. DISTRICT MAP ───────────────────────────────────────────── */}
      <div className="h-[400px] w-full relative border-b border-hairline">
        <DistrictMapContainer
          district={district}
          incidents={PROTOTYPE_INCIDENTS}
          selectedIncident={selectedIncident}
          onSelectIncident={setSelectedIncident}
        />
      </div>

      {/* ── 3. DISTRICT LIVE UPDATES ──────────────────────────────────── */}
      <div className="p-6 md:p-8 bg-surface-pearl border-b border-hairline">
        <LiveUpdatesFeed
          updates={districtUpdates}
          title={`${district.name} Event Feed`}
          maxItems={3}
        />
      </div>

      {/* ── 4. HAZARD INTELLIGENCE ────────────────────────────────────── */}
      <div className="p-6 md:p-8 bg-canvas space-y-6">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <h2 className="text-[21px] font-semibold tracking-[0.231px] text-ink">
            Hazard Intelligence
          </h2>
          <span className="text-[12px] font-normal text-ink-muted-48 uppercase tracking-[-0.12px]">
            Telemetry & Indices
          </span>
        </div>

        {/* Hazard indices grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rainfall Accumulation */}
          <div className="border border-hairline rounded-xl bg-canvas p-5 shadow-sm">
            <div className="text-[14px] font-semibold tracking-[-0.16px] text-ink mb-4">
              Rainfall Accumulation
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-pearl rounded-lg p-3">
                <span className="text-[12px] text-ink-muted-80 block tracking-[-0.12px] mb-1">1H</span>
                <strong className="text-[17px] font-semibold tracking-[-0.374px] text-ink">{district.rainfall1h} mm</strong>
              </div>
              <div className="bg-surface-pearl rounded-lg p-3">
                <span className="text-[12px] text-ink-muted-80 block tracking-[-0.12px] mb-1">24H</span>
                <strong className="text-[17px] font-semibold tracking-[-0.374px] text-ink">{district.rainfall24h} mm</strong>
              </div>
              <div className="bg-surface-pearl rounded-lg p-3">
                <span className="text-[12px] text-ink-muted-80 block tracking-[-0.12px] mb-1">72H</span>
                <strong className="text-[17px] font-semibold tracking-[-0.374px] text-ink">{district.rainfall72h} mm</strong>
              </div>
            </div>
            <div className="text-[12px] text-ink-muted-48 tracking-[-0.12px] leading-[1.4] mt-4">
              Automated weather telemetry calibrated against IMD convective radar.
            </div>
          </div>

          {/* Terrain & Flood Susceptibility */}
          <div className="border border-hairline rounded-xl bg-canvas p-5 shadow-sm">
            <div className="text-[14px] font-semibold tracking-[-0.16px] text-ink mb-4">
              Terrain & Hydrologic Indices
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-surface-pearl rounded-lg p-3">
                <span className="text-[12px] text-ink-muted-80 block tracking-[-0.12px] mb-1">Terrain Susc.</span>
                <strong className="text-[17px] font-semibold tracking-[-0.374px] text-ink">
                  {district.terrainSusceptibility.toFixed(2)}
                </strong>
              </div>
              <div className="bg-surface-pearl rounded-lg p-3">
                <span className="text-[12px] text-ink-muted-80 block tracking-[-0.12px] mb-1">Flood Prox.</span>
                <strong className="text-[17px] font-semibold tracking-[-0.374px] text-ink">
                  {district.historicalFloodProximity.toFixed(2)}
                </strong>
              </div>
            </div>
            <div className="flex items-center justify-between text-[13px] font-normal tracking-[-0.08px] bg-surface-pearl rounded-lg p-3 border border-hairline">
              <span>Risk: <strong className={district.riskLevel === 'CRITICAL' ? 'text-[#ff3b30]' : 'text-ink'}>{district.riskLevel}</strong></span>
              <span>Score: <strong className="text-ink">{district.hazardScore.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* Evidence Checklist */}
        <div className="border border-hairline rounded-xl bg-canvas p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[17px] font-semibold tracking-[-0.374px] text-ink">
              Multi-Source Evidence Matrix
            </div>
            <span className="text-[12px] font-normal tracking-[-0.12px] text-primary bg-primary/10 px-3 py-1 rounded-pill">
              Validated Telemetry & Evidence
            </span>
          </div>

          <div className="space-y-3 mb-4">
            {district.evidence.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-[14px] leading-[1.43] tracking-[-0.224px] text-ink">
                <span className="text-primary font-semibold">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Citizen Ground Reports & News Telemetry Layer */}
          <div className="pt-4 border-t border-hairline space-y-2.5">
            <div className="text-[12px] font-bold uppercase tracking-wider text-ink-muted-48">
              Supplemental Real-Time Streams
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    Ground Incident Reports
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Live Stream
                  </span>
                </div>
                <p className="text-[12px] text-blue-950 leading-relaxed">
                  Real-time crowdsourced citizen observations from RainGuard Mobile App. Status marked as <em>Pending Verification</em> until field dispatch confirmation.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold text-slate-900">
                    Traffic & News Alerts
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                    News
                  </span>
                </div>
                <p className="text-[12px] text-slate-700 leading-relaxed">
                  Traffic and infrastructure disruption reports aggregated from official news and transit advisories.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Confidence & Evidence Breakdown */}
        <div className="border border-hairline rounded-xl bg-surface-pearl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-semibold tracking-[-0.16px] text-ink uppercase">
                Confidence Score
              </span>
              <span className="text-[17px] font-semibold tracking-[-0.374px] text-ink bg-canvas px-3 py-1 rounded-sm border border-hairline shadow-sm">
                {district.confidence}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowEvidenceBreakdown(!showEvidenceBreakdown)}
              className="text-[14px] font-normal text-primary hover:text-primary-focus cursor-pointer transition-colors"
            >
              {showEvidenceBreakdown ? 'Hide Breakdown ▴' : 'Show Breakdown ▾'}
            </button>
          </div>

          {showEvidenceBreakdown && (
            <div className="mt-5 pt-5 border-t border-hairline space-y-4 animate-slide-up">
              <div className="text-[13px] leading-[1.43] tracking-[-0.08px] text-ink-muted-80">
                Confidence rating based on multi-source sensor agreement, ground report density, and historical calibration.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {district.confidenceFactors.map((cf, i) => (
                  <div key={i} className="bg-canvas p-4 rounded-lg border border-hairline">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px] font-semibold tracking-[-0.16px] text-ink">{cf.factor}</span>
                      <span
                        className={`text-[11px] font-semibold tracking-[-0.08px] px-2 py-0.5 rounded-sm uppercase ${
                          cf.rating === 'Strong'
                            ? 'bg-ink text-white'
                            : cf.rating === 'High'
                            ? 'bg-ink-muted-48 text-white'
                            : 'bg-surface-pearl border border-hairline text-ink-muted-80'
                        }`}
                      >
                        {cf.rating}
                      </span>
                    </div>
                    <div className="text-[12px] leading-[1.4] tracking-[-0.12px] text-ink-muted-80">
                      {cf.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

