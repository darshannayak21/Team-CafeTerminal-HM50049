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

  // Filter updates and incidents for the active district
  const districtUpdates = PROTOTYPE_LIVE_UPDATES.filter(
    (u) => !u.talukaId || u.talukaId.toLowerCase() === district.id.toLowerCase()
  );

  return (
    <div className="flex flex-col h-full bg-[#FAF8F3] overflow-y-auto divide-y divide-[#D9D0C4]">
      {/* ── 1. DISTRICT HEADER ────────────────────────────────────────── */}
      <div className="p-4 bg-[#F3EEE5] border-b border-[#D9D0C4]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#B66F55]" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-xl md:text-2xl text-[#18324A] uppercase tracking-normal">
                  {district.name}
                </h1>
                <span className="font-mono text-xs text-[#68747B]">TALUKA</span>
              </div>
              <div className="text-xs font-mono font-bold tracking-wider text-[#B66F55] uppercase mt-0.5">
                {district.riskLevel} PRIORITY
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 border border-[#D9D0C4] bg-[#FAF8F3] text-[#654536] uppercase font-semibold">
              TACTICAL INTEL
            </span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#D9D0C4]/70">
          <div className="bg-[#FAF8F3] p-2.5 border border-[#D9D0C4]">
            <span className="block text-[10px] font-mono uppercase text-[#68747B]">
              Hazard Score
            </span>
            <span className="font-serif font-bold text-lg text-[#18324A]">
              {district.hazardScore.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#FAF8F3] p-2.5 border border-[#D9D0C4]">
            <span className="block text-[10px] font-mono uppercase text-[#68747B]">
              Affected Population
            </span>
            <span className="font-serif font-bold text-lg text-[#18324A]">
              {district.affectedPopulation.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#FAF8F3] p-2.5 border border-[#D9D0C4]">
            <span className="block text-[10px] font-mono uppercase text-[#68747B]">
              At-Risk Roads
            </span>
            <span className="font-serif font-bold text-lg text-[#8A624E]">
              {district.atRiskRoadsCount}
            </span>
          </div>

          <div className="bg-[#FAF8F3] p-2.5 border border-[#D9D0C4]">
            <span className="block text-[10px] font-mono uppercase text-[#68747B]">
              Disrupted Roads
            </span>
            <span className="font-serif font-bold text-lg text-[#B66F55]">
              {district.disruptedRoadsCount}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. DISTRICT MAP ───────────────────────────────────────────── */}
      <div className="h-[380px] w-full relative">
        <DistrictMapContainer
          district={district}
          incidents={PROTOTYPE_INCIDENTS}
          selectedIncident={selectedIncident}
          onSelectIncident={setSelectedIncident}
        />
      </div>

      {/* ── 3. DISTRICT LIVE UPDATES ──────────────────────────────────── */}
      <div>
        <LiveUpdatesFeed
          updates={districtUpdates}
          title={`${district.name.toUpperCase()} SECTOR EVENT FEED`}
          maxItems={4}
        />
      </div>

      {/* ── 4. HAZARD INTELLIGENCE (CRITICAL SPECIFICATION) ───────────── */}
      <div className="p-4 sm:p-5 bg-[#FAF8F3] space-y-4">
        <div className="flex items-center justify-between border-b border-[#D9D0C4] pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#18324A]" />
            <h2 className="font-serif font-bold text-base uppercase text-[#18324A] tracking-normal">
              Hazard Intelligence
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#68747B] uppercase">
            Telemetry &amp; Indices
          </span>
        </div>

        {/* Hazard indices grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rainfall Accumulation */}
          <div className="border border-[#D9D0C4] bg-[#F3EEE5]/40 p-3.5 space-y-2">
            <div className="font-serif font-bold text-xs uppercase text-[#18324A] tracking-wider">
              Rainfall Accumulation
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-[#FAF8F3] p-2 border border-[#D9D0C4]/70">
                <span className="text-[10px] text-[#68747B] block">1H</span>
                <strong className="text-sm text-[#18324A]">{district.rainfall1h} mm</strong>
              </div>
              <div className="bg-[#FAF8F3] p-2 border border-[#D9D0C4]/70">
                <span className="text-[10px] text-[#68747B] block">24H</span>
                <strong className="text-sm text-[#18324A]">{district.rainfall24h} mm</strong>
              </div>
              <div className="bg-[#FAF8F3] p-2 border border-[#D9D0C4]/70">
                <span className="text-[10px] text-[#68747B] block">72H</span>
                <strong className="text-sm text-[#18324A]">{district.rainfall72h} mm</strong>
              </div>
            </div>
            <div className="text-[10px] text-[#68747B] font-sans pt-1">
              Automated weather telemetry calibrated against IMD convective radar.
            </div>
          </div>

          {/* Terrain & Flood Susceptibility */}
          <div className="border border-[#D9D0C4] bg-[#F3EEE5]/40 p-3.5 space-y-2">
            <div className="font-serif font-bold text-xs uppercase text-[#18324A] tracking-wider">
              Terrain &amp; Hydrologic Indices
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#FAF8F3] p-2 border border-[#D9D0C4]/70">
                <span className="text-[10px] text-[#68747B] block">Terrain Susceptibility</span>
                <strong className="text-sm text-[#18324A]">
                  {district.terrainSusceptibility.toFixed(2)}
                </strong>
              </div>
              <div className="bg-[#FAF8F3] p-2 border border-[#D9D0C4]/70">
                <span className="text-[10px] text-[#68747B] block">Historical Flood Proximity</span>
                <strong className="text-sm text-[#18324A]">
                  {district.historicalFloodProximity.toFixed(2)}
                </strong>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs font-mono bg-[#FAF8F3] p-2 border border-[#D9D0C4]">
              <span>Risk Level: <strong className="text-[#B66F55]">{district.riskLevel}</strong></span>
              <span>Hazard Score: <strong className="text-[#18324A]">{district.hazardScore.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* Evidence Checklist */}
        <div className="border border-[#D9D0C4] bg-[#FAF8F3] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-serif font-bold text-xs uppercase text-[#18324A] tracking-wider">
              Evidence Supporting Priority Assignment
            </div>
            <span className="text-[10px] font-mono text-[#557A95]">
              {district.evidence.length} Indicators Validated
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-sans">
            {district.evidence.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[#273038]">
                <span className="text-[#557A95] font-bold">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence & Evidence Breakdown */}
        <div className="border border-[#D9D0C4] bg-[#F3EEE5]/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-serif font-bold text-xs uppercase text-[#18324A] tracking-wider">
                CONFIDENCE SCORE
              </span>
              <span className="font-mono font-bold text-sm text-[#18324A] bg-[#FAF8F3] px-2 py-0.5 border border-[#D9D0C4]">
                {district.confidence}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowEvidenceBreakdown(!showEvidenceBreakdown)}
              className="text-xs font-mono font-semibold text-[#654536] hover:text-[#18324A] underline cursor-pointer"
            >
              {showEvidenceBreakdown ? 'Hide Evidence Breakdown ▴' : 'Evidence Breakdown ▾'}
            </button>
          </div>

          {showEvidenceBreakdown && (
            <div className="mt-3 pt-3 border-t border-[#D9D0C4] space-y-2">
              <div className="text-[11px] font-sans text-[#68747B] mb-2">
                Confidence rating based on multi-source sensor agreement, ground report density, and historical calibration.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {district.confidenceFactors.map((cf, i) => (
                  <div key={i} className="bg-[#FAF8F3] p-2.5 border border-[#D9D0C4]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#18324A]">{cf.factor}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 ${
                          cf.rating === 'Strong'
                            ? 'bg-[#18324A] text-[#FAF8F3]'
                            : cf.rating === 'High'
                            ? 'bg-[#557A95] text-[#FAF8F3]'
                            : 'bg-[#F3EEE5] text-[#654536]'
                        }`}
                      >
                        {cf.rating}
                      </span>
                    </div>
                    <div className="text-[10px] font-sans text-[#68747B]">
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
