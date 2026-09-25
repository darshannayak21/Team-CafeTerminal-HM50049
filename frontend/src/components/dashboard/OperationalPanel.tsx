'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataField } from '@/components/ui/DataField';
import { EvidenceList } from '@/components/dashboard/EvidenceList';
import { Button } from '@/components/ui/Button';
import { ImpactChainView } from '@/components/dashboard/ImpactChainView';
import { PriorityQueue } from '@/components/priority/PriorityQueue';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  PROTOTYPE_HAZARD_ASSESSMENT,
  PROTOTYPE_RISK_AREAS,
  PROTOTYPE_SETTLEMENTS,
  PROTOTYPE_ROADS,
  PROTOTYPE_PRIORITY_ITEMS,
  PROTOTYPE_NOTICE
} from '@/data/fixtureData';

interface OperationalPanelProps {
  activeTaluka: string;
  selectedRiskAreaId: string | null;
  onSelectRiskArea: (id: string | null) => void;
  isLoading?: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export const OperationalPanel: React.FC<OperationalPanelProps> = ({
  activeTaluka,
  selectedRiskAreaId,
  onSelectRiskArea,
  isLoading = false,
  error = null,
  onClearError,
}) => {
  const [activeTab, setActiveTab] = useState<'hazard' | 'settlements' | 'priority'>('hazard');

  const selectedArea = selectedRiskAreaId
    ? PROTOTYPE_RISK_AREAS.find((a) => a.id === selectedRiskAreaId) ?? null
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

  // Settlements and roads tied to selected risk area
  const selectedSettlements = selectedArea
    ? PROTOTYPE_SETTLEMENTS.filter((s) => s.riskAreaId === selectedArea.id)
    : [];

  const selectedRoads = selectedArea
    ? PROTOTYPE_ROADS.filter((r) => r.riskAreaId === selectedArea.id)
    : [];

  // Filter settlements for the dedicated Settlements directory tab
  const displaySettlements = PROTOTYPE_SETTLEMENTS.filter((s) => {
    if (selectedRiskAreaId) return s.riskAreaId === selectedRiskAreaId;
    if (activeTaluka === 'All Talukas') return true;
    return s.taluka.toLowerCase() === activeTaluka.toLowerCase();
  });

  const totalExposedPopulation = displaySettlements.reduce((sum, s) => sum + s.population, 0);
  const totalExposedHouseholds = displaySettlements.reduce((sum, s) => sum + s.affectedHouseholds, 0);

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
          Settlements ({displaySettlements.length})
        </button>
        <button
          onClick={() => setActiveTab('priority')}
          className={`flex-1 py-2 px-3 text-center uppercase tracking-wider transition-none border-b-2 cursor-pointer ${
            activeTab === 'priority'
              ? 'border-b-[#18324A] font-bold text-[#18324A] bg-[#F3EEE5]/40'
              : 'border-b-transparent text-[#68747B] hover:text-[#273038] hover:bg-[#F3EEE5]/20'
          }`}
        >
          Priority Queue ({PROTOTYPE_PRIORITY_ITEMS.length})
        </button>
      </nav>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Render simulated error state if active */}
        {error && (
          <ErrorState
            message={error}
            onAction={onClearError}
            secondaryActionLabel="Deselect Sector"
            onSecondaryAction={() => onSelectRiskArea(null)}
          />
        )}

        {/* Render simulated loading state if active */}
        {isLoading && !error && (
          <LoadingState
            message="Synchronizing Sector Telemetry..."
            detail="Updating spatial reticle and calculating downstream road intersections"
          />
        )}

        {/* Normal Content when not loading or errored */}
        {!isLoading && !error && (
          <>
            {activeTab === 'hazard' && (
              <>
                {/* When a sector IS selected: show active banner, hazard breakdown, impact chain */}
                {selectedArea ? (
                  <>
                    {/* Active Selection Banner */}
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

                    {/* Operational Impact Chain Card */}
                    <Card variant="paper">
                      <CardHeader
                        title="Operational Impact Chain"
                        subtitle="Deterministic sequence: Area → Evidence → Settlements → Impact → Road Risk"
                        badge={<Badge variant={selectedArea.riskLevel}>{selectedArea.riskLevel}</Badge>}
                      />
                      <CardContent noPadding>
                        <ImpactChainView
                          area={selectedArea}
                          settlements={selectedSettlements}
                          roads={selectedRoads}
                        />
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  /* ── NO-SELECTION STATE (Deliberate instructional empty state) ── */
                  <div className="space-y-3.5">
                    <EmptyState
                      title="No Risk Sector Selected"
                      description="Click an active hazard polygon on the Pune map, pick an operational sector below, or select a prioritized dispatch target from the Response Queue."
                      onSelectDefault={() => onSelectRiskArea(PROTOTYPE_PRIORITY_ITEMS[0].riskAreaId)}
                      actionLabel="Select Priority #1 Sector"
                      secondaryActionLabel="View Response Queue"
                      onSecondaryAction={() => setActiveTab('priority')}
                    />

                    {/* District Baseline Evidence Card */}
                    <Card variant="paper">
                      <CardHeader
                        title="District Baseline Telemetry"
                        subtitle={`General observations across ${activeTaluka}`}
                      />
                      <CardContent>
                        <EvidenceList evidence={PROTOTYPE_HAZARD_ASSESSMENT.evidence} />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Mapped Risk Sectors Quick Selector */}
                <Card variant="cream">
                  <CardHeader
                    title="Mapped Risk Sectors"
                    subtitle={`Showing ${visibleSectors.length} sector(s) · Click to inspect impact chain`}
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
                {/* Filter scope indicator */}
                <div className="border border-[#D9D0C4] bg-[#F3EEE5] p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-sans text-[#18324A]">
                      {selectedArea
                        ? `Sector Scope: ${selectedArea.name} (${selectedArea.taluka})`
                        : `District Scope: ${activeTaluka}`}
                    </span>
                    {selectedArea && (
                      <button
                        onClick={() => onSelectRiskArea(null)}
                        className="text-[11px] font-mono text-[#654536] hover:underline cursor-pointer"
                      >
                        View All Talukas ×
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] font-sans text-[#68747B] mt-1">
                    Demographic exposure and access vulnerability records mapped to identified hazard sectors.
                  </p>
                </div>

                {/* Aggregate Exposure Metrics */}
                <div className="grid grid-cols-2 gap-2 border border-[#D9D0C4] bg-[#FAF8F3] p-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#68747B]">
                      Exposed Population
                    </span>
                    <div className="text-lg font-serif font-bold text-[#18324A]">
                      {totalExposedPopulation.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#68747B]">Across {displaySettlements.length} settlement(s)</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#68747B]">
                      Exposed Households
                    </span>
                    <div className="text-lg font-serif font-bold text-[#18324A]">
                      {totalExposedHouseholds.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#68747B]">Habitation units</span>
                  </div>
                </div>

                {/* Settlement List */}
                <div className="space-y-2.5">
                  {displaySettlements.length === 0 ? (
                    <div className="border border-[#D9D0C4] bg-[#FAF8F3] p-4 text-center text-xs text-[#68747B] italic">
                      No settlement records found for this scope.
                    </div>
                  ) : (
                    displaySettlements.map((s) => {
                      const parentArea = PROTOTYPE_RISK_AREAS.find((a) => a.id === s.riskAreaId);
                      const relatedRoads = PROTOTYPE_ROADS.filter((r) => r.riskAreaId === s.riskAreaId);

                      return (
                        <div 
                          key={s.id}
                          className="border border-[#D9D0C4] bg-[#FAF8F3] p-3 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-serif font-bold text-sm text-[#18324A]">{s.name}</span>
                            <Badge variant={s.impactLevel}>{s.impactLevel}</Badge>
                          </div>

                          <div className="flex flex-wrap items-center justify-between text-xs font-sans text-[#68747B] border-b border-[#D9D0C4]/50 pb-1.5 gap-y-1">
                            <span>Taluka: <strong className="text-[#273038]">{s.taluka}</strong></span>
                            <span className="font-mono">
                              Pop: <strong className="text-[#18324A]">{s.population.toLocaleString()}</strong> ({s.affectedHouseholds.toLocaleString()} HH)
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono text-[#68747B]">
                            <span>Risk Sector: <strong className="text-[#273038]">{parentArea?.name ?? s.riskAreaId}</strong></span>
                            <span>{s.latitude.toFixed(4)}°N, {s.longitude.toFixed(4)}°E</span>
                          </div>

                          <p className="text-xs font-sans text-[#654536] border-t border-[#D9D0C4]/60 pt-1.5 italic">
                            {s.vulnerabilityContext}
                          </p>

                          {/* Associated Road Link Preview */}
                          {relatedRoads.length > 0 ? (
                            <div className="border-t border-[#D9D0C4]/60 pt-1.5 space-y-1">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-[#68747B]">
                                Transit Exposure ({relatedRoads.length} route{relatedRoads.length !== 1 ? 's' : ''}):
                              </span>
                              <div className="space-y-1">
                                {relatedRoads.map((road) => (
                                  <div key={road.id} className="flex items-center justify-between text-[11px] font-sans">
                                    <span className="text-[#18324A] truncate max-w-[200px]">{road.name}</span>
                                    <span
                                      className={`font-mono text-[9px] uppercase px-1 py-0.2 border font-bold ${
                                        road.status === 'CONFIRMED BLOCKED'
                                          ? 'text-[#B66F55] border-[#B66F55]'
                                          : road.status === 'AT RISK'
                                          ? 'text-[#8A624E] border-[#8A624E]'
                                          : 'text-[#557A95] border-[#557A95]'
                                      }`}
                                    >
                                      {road.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="border-t border-[#D9D0C4]/60 pt-1.5 text-[11px] text-[#68747B] font-mono">
                              Transit: No road-risk data recorded for this area.
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* ── MILESTONE 4: RESPONSE PRIORITY QUEUE TAB ── */}
            {activeTab === 'priority' && (
              <PriorityQueue
                items={PROTOTYPE_PRIORITY_ITEMS}
                selectedRiskAreaId={selectedRiskAreaId}
                onSelectRiskArea={onSelectRiskArea}
                activeTaluka={activeTaluka}
              />
            )}
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
          <Button
            variant={activeTab === 'priority' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('priority')}
          >
            Priority Queue
          </Button>
        </div>
      </div>
    </div>
  );
};
