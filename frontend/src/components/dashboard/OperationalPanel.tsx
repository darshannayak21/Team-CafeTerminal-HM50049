'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataField } from '@/components/ui/DataField';
import { EvidenceList } from '@/components/dashboard/EvidenceList';
import { Button } from '@/components/ui/Button';
import {
  PROTOTYPE_HAZARD_ASSESSMENT,
  PROTOTYPE_RISK_AREAS,
  PROTOTYPE_SETTLEMENT_SAMPLES,
  PROTOTYPE_PRIORITY_SAMPLES,
  PROTOTYPE_NOTICE
} from '@/data/fixtureData';

interface OperationalPanelProps {
  activeTaluka: string;
  selectedRiskAreaId: string | null;
  onSelectRiskArea: (id: string | null) => void;
}

export const OperationalPanel: React.FC<OperationalPanelProps> = ({
  activeTaluka,
  selectedRiskAreaId,
  onSelectRiskArea
}) => {
  const [activeTab, setActiveTab] = useState<'hazard' | 'settlements' | 'priority'>('hazard');

  const selectedArea = selectedRiskAreaId
    ? PROTOTYPE_RISK_AREAS.find((a) => a.id === selectedRiskAreaId)
    : null;

  // Derive active assessment data: selected area or district baseline
  const activeAssessment = selectedArea
    ? {
        title: selectedArea.name,
        subtitle: `Sector: ${selectedArea.taluka} Taluka · Extent: ${selectedArea.areaKm2} km²`,
        riskLevel: selectedArea.riskLevel,
        hazardScore: selectedArea.hazardScore,
        componentScores: selectedArea.componentScores,
        evidence: selectedArea.evidence,
        summary: selectedArea.summary,
        datum: 'Selected Sector'
      }
    : {
        title: 'District Composite Assessment',
        subtitle: `Evaluated sector: ${activeTaluka} (Baseline overview)`,
        riskLevel: PROTOTYPE_HAZARD_ASSESSMENT.riskLevel,
        hazardScore: PROTOTYPE_HAZARD_ASSESSMENT.hazardScore,
        componentScores: PROTOTYPE_HAZARD_ASSESSMENT.componentScores,
        evidence: PROTOTYPE_HAZARD_ASSESSMENT.evidence,
        summary: 'Baseline composite telemetry reflecting district-level meteorological and terrain indices.',
        datum: 'District Baseline'
      };

  // Filter risk sectors list based on active taluka
  const visibleSectors = PROTOTYPE_RISK_AREAS.filter((area) => {
    if (activeTaluka === 'All Talukas') return true;
    return area.taluka.toLowerCase() === activeTaluka.toLowerCase();
  });

  return (
    <div className="flex flex-col h-full divide-y divide-[#D9D0C4] bg-[#FAF8F3] text-[#273038]">
      {/* Panel Top Heading & Prototype Disclaimer */}
      <div className="p-3.5 bg-[#F3EEE5] border-b border-[#D9D0C4]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#654536]" />
            <h2 className="font-serif font-bold text-sm text-[#18324A] tracking-normal">
              Operational Intelligence
            </h2>
          </div>
          <Badge variant="PROTOTYPE" size="sm">
            Prototype Fixture
          </Badge>
        </div>
        <p className="text-xs font-sans text-[#68747B] mt-1">
          {PROTOTYPE_NOTICE}
        </p>
      </div>

      {/* Operational View Tab Switches */}
      <nav 
        aria-label="Operational views"
        className="flex border-b border-[#D9D0C4] bg-[#FAF8F3] font-sans text-xs"
      >
        <button
          onClick={() => setActiveTab('hazard')}
          className={`flex-1 py-2 px-3 text-center uppercase tracking-wider transition-none border-b-2 cursor-pointer ${
            activeTab === 'hazard'
              ? 'border-b-[#18324A] font-bold text-[#18324A] bg-[#F3EEE5]/40'
              : 'border-b-transparent text-[#68747B] hover:text-[#273038] hover:bg-[#F3EEE5]/20'
          }`}
        >
          Hazard Summary
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex-1 py-2 px-3 text-center uppercase tracking-wider transition-none border-b-2 cursor-pointer ${
            activeTab === 'settlements'
              ? 'border-b-[#18324A] font-bold text-[#18324A] bg-[#F3EEE5]/40'
              : 'border-b-transparent text-[#68747B] hover:text-[#273038] hover:bg-[#F3EEE5]/20'
          }`}
        >
          Settlements (M3)
        </button>
        <button
          onClick={() => setActiveTab('priority')}
          className={`flex-1 py-2 px-3 text-center uppercase tracking-wider transition-none border-b-2 cursor-pointer ${
            activeTab === 'priority'
              ? 'border-b-[#18324A] font-bold text-[#18324A] bg-[#F3EEE5]/40'
              : 'border-b-transparent text-[#68747B] hover:text-[#273038] hover:bg-[#F3EEE5]/20'
          }`}
        >
          Priority Queue (M5)
        </button>
      </nav>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {activeTab === 'hazard' && (
          <>
            {/* Active Selection Banner */}
            {selectedArea ? (
              <div className="border border-[#18324A] bg-[#F3EEE5] p-2.5 flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#B66F55] animate-pulse" />
                  <span className="text-[#18324A]">
                    Focused on: <strong>{selectedArea.name}</strong>
                  </span>
                </div>
                <button
                  onClick={() => onSelectRiskArea(null)}
                  className="text-[11px] font-mono text-[#654536] hover:underline cursor-pointer"
                >
                  Reset Overview ×
                </button>
              </div>
            ) : (
              <div className="border border-[#D9D0C4] bg-[#FAF8F3] p-2 text-xs font-sans text-[#68747B] flex items-center justify-between">
                <span>Displaying District Overview</span>
                <span className="text-[11px] font-mono text-[#8A624E]">Click a map polygon to inspect</span>
              </div>
            )}

            {/* Composite Hazard Card */}
            <Card variant="paper" borderAccent>
              <CardHeader
                title={activeAssessment.title}
                subtitle={activeAssessment.subtitle}
                badge={
                  <Badge variant={activeAssessment.riskLevel}>
                    {activeAssessment.riskLevel}
                  </Badge>
                }
              />
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#D9D0C4]">
                  <DataField
                    label="Composite Hazard Index"
                    value={activeAssessment.hazardScore.toFixed(2)}
                    unit="/ 1.00"
                    detail="Weighted multi-factor score"
                  />
                  <DataField
                    label="Evaluation Datum"
                    value={activeAssessment.datum}
                    unit="Observed"
                    detail="Sample window: 72h"
                  />
                </div>

                {/* Sub-factor breakdowns */}
                <div>
                  <h3 className="text-xs font-sans uppercase tracking-wider text-[#68747B] mb-2 font-bold">
                    Contributing Factors (Normalized):
                  </h3>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-[#D9D0C4]/40">
                      <span className="text-[#273038] font-sans">Rainfall (1h intensity):</span>
                      <span className="font-semibold text-[#18324A]">
                        {activeAssessment.componentScores.rainfall_1h.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#D9D0C4]/40">
                      <span className="text-[#273038] font-sans">Rainfall (24h accumulation):</span>
                      <span className="font-semibold text-[#18324A]">
                        {activeAssessment.componentScores.rainfall_24h.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#D9D0C4]/40">
                      <span className="text-[#273038] font-sans">Rainfall (72h saturation):</span>
                      <span className="font-semibold text-[#18324A]">
                        {activeAssessment.componentScores.rainfall_72h.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#D9D0C4]/40">
                      <span className="text-[#273038] font-sans">Terrain Susceptibility (Slope):</span>
                      <span className="font-semibold text-[#18324A]">
                        {activeAssessment.componentScores.terrain_susceptibility.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[#273038] font-sans">Historical Flood Channel Proximity:</span>
                      <span className="font-semibold text-[#18324A]">
                        {activeAssessment.componentScores.historical_flood_proximity.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tactical Summary */}
                {activeAssessment.summary && (
                  <p className="text-xs font-sans text-[#654536] border-t border-[#D9D0C4]/60 pt-2 italic leading-relaxed">
                    {activeAssessment.summary}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Explainability Evidence Card */}
            <Card variant="paper">
              <CardHeader
                title="Explainability & Localized Evidence"
                subtitle="Deterministic threshold triggers for active sector"
              />
              <CardContent>
                <EvidenceList evidence={activeAssessment.evidence} />
              </CardContent>
            </Card>

            {/* Mapped Risk Sectors Quick Selector */}
            <Card variant="cream">
              <CardHeader
                title="Mapped Risk Sectors"
                subtitle={`Showing ${visibleSectors.length} prototype sector(s)`}
              />
              <CardContent noPadding>
                <div className="divide-y divide-[#D9D0C4] font-sans text-xs">
                  {visibleSectors.map((sector) => {
                    const isSelected = selectedRiskAreaId === sector.id;
                    return (
                      <button
                        key={sector.id}
                        onClick={() => onSelectRiskArea(isSelected ? null : sector.id)}
                        className={`w-full p-2.5 text-left flex items-center justify-between gap-2 transition-none cursor-pointer ${
                          isSelected ? 'bg-[#FAF8F3] font-semibold' : 'hover:bg-[#FAF8F3]/60'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[#18324A]">{sector.name}</span>
                          <span className="text-[11px] text-[#68747B] font-mono">
                            {sector.taluka} Taluka · {sector.areaKm2} km²
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#18324A]">
                            {sector.hazardScore.toFixed(2)}
                          </span>
                          <Badge variant={sector.riskLevel} size="sm">
                            {sector.riskLevel}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'settlements' && (
          <>
            <div className="border border-[#D9D0C4] bg-[#F3EEE5] p-3 text-xs text-[#654536]">
              <span className="font-bold font-sans">Milestone 3 Integration Target:</span>
              <p className="text-xs font-sans text-[#273038] mt-1 leading-snug">
                Settlement boundary ingestion, population weighting, and local exposure calculation will be integrated in Milestone 3. The entries below demonstrate layout structure.
              </p>
            </div>

            <div className="space-y-2.5">
              {PROTOTYPE_SETTLEMENT_SAMPLES.map((s) => (
                <div 
                  key={s.id}
                  className="border border-[#D9D0C4] bg-[#FAF8F3] p-3 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-[#18324A]">{s.name}</span>
                    <Badge variant={s.riskLevel}>{s.riskLevel}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs font-sans text-[#68747B]">
                    <span>Taluka: {s.taluka}</span>
                    <span className="font-mono">Est. Pop: {s.estimatedPopulation.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-[#68747B]">Access:</span>
                    <Badge variant={s.accessStatus} size="sm">{s.accessStatus}</Badge>
                  </div>
                  <p className="text-xs font-sans text-[#654536] border-t border-[#D9D0C4]/60 pt-1 italic">
                    {s.note}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'priority' && (
          <>
            <div className="border border-[#D9D0C4] bg-[#F3EEE5] p-3 text-xs text-[#654536]">
              <span className="font-bold font-sans">Milestone 5 Integration Target:</span>
              <p className="text-xs font-sans text-[#273038] mt-1 leading-snug">
                The response prioritization engine (Impact × Access Isolation) will rank response targets dynamically in Milestone 5.
              </p>
            </div>

            <div className="space-y-2.5">
              {PROTOTYPE_PRIORITY_SAMPLES.map((item) => (
                <div 
                  key={item.rank}
                  className="border border-[#D9D0C4] bg-[#FAF8F3] p-3 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#18324A] text-[#FAF8F3] text-[10px] font-mono font-bold">
                        #{item.rank}
                      </span>
                      <span className="font-serif font-bold text-sm text-[#18324A]">{item.settlementName}</span>
                    </div>
                    <Badge variant={item.riskLevel}>{item.riskLevel}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs font-sans text-[#68747B]">
                    <span>Taluka: {item.taluka}</span>
                    <span className="text-[#8A624E] font-mono font-bold">Priority: {item.priorityScore.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-[#68747B]">Access Isolation:</span>
                    <Badge variant={item.accessStatus}>{item.accessStatus}</Badge>
                  </div>

                  <p className="text-xs font-sans text-[#654536] border-t border-[#D9D0C4]/60 pt-1 leading-normal">
                    {item.primaryRationale}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Operational Panel Footer / Actions */}
      <div className="p-3 bg-[#F3EEE5] border-t border-[#D9D0C4] flex items-center justify-between gap-2">
        <span className="text-xs font-sans text-[#68747B]">
          Scope: <strong className="font-mono text-[#18324A]">{activeTaluka}</strong>
        </span>
        <div className="flex items-center gap-2">
          {selectedRiskAreaId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectRiskArea(null)}
            >
              Deselect Sector
            </Button>
          )}
          <Button variant="primary" size="sm">
            Operational Log
          </Button>
        </div>
      </div>
    </div>
  );
};
