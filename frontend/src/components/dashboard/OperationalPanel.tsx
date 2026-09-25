'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataField } from '@/components/ui/DataField';
import { EvidenceList } from '@/components/dashboard/EvidenceList';
import { Button } from '@/components/ui/Button';
import {
  PROTOTYPE_HAZARD_ASSESSMENT,
  PROTOTYPE_SETTLEMENT_SAMPLES,
  PROTOTYPE_PRIORITY_SAMPLES,
  PROTOTYPE_NOTICE
} from '@/data/fixtureData';

interface OperationalPanelProps {
  activeTaluka: string;
}

export const OperationalPanel: React.FC<OperationalPanelProps> = ({ activeTaluka }) => {
  const [activeTab, setActiveTab] = useState<'hazard' | 'settlements' | 'priority'>('hazard');

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
            {/* Composite Hazard Card */}
            <Card variant="paper" borderAccent>
              <CardHeader
                title="Current Hazard Assessment"
                subtitle={`Evaluated sector: ${activeTaluka}`}
                badge={
                  <Badge variant={PROTOTYPE_HAZARD_ASSESSMENT.riskLevel}>
                    {PROTOTYPE_HAZARD_ASSESSMENT.riskLevel}
                  </Badge>
                }
              />
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#D9D0C4]">
                  <DataField
                    label="Composite Score"
                    value={PROTOTYPE_HAZARD_ASSESSMENT.hazardScore.toFixed(2)}
                    unit="/ 1.00"
                    detail="Weighted multi-factor score"
                  />
                  <DataField
                    label="Evaluation Datum"
                    value="07:15 UTC"
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
                        {PROTOTYPE_HAZARD_ASSESSMENT.componentScores.rainfall_1h.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#D9D0C4]/40">
                      <span className="text-[#273038] font-sans">Rainfall (24h accumulation):</span>
                      <span className="font-semibold text-[#18324A]">
                        {PROTOTYPE_HAZARD_ASSESSMENT.componentScores.rainfall_24h.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#D9D0C4]/40">
                      <span className="text-[#273038] font-sans">Rainfall (72h saturation):</span>
                      <span className="font-semibold text-[#18324A]">
                        {PROTOTYPE_HAZARD_ASSESSMENT.componentScores.rainfall_72h.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#D9D0C4]/40">
                      <span className="text-[#273038] font-sans">Terrain Susceptibility (Slope):</span>
                      <span className="font-semibold text-[#18324A]">
                        {PROTOTYPE_HAZARD_ASSESSMENT.componentScores.terrain_susceptibility.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[#273038] font-sans">Historical Flood Channel Proximity:</span>
                      <span className="font-semibold text-[#18324A]">
                        {PROTOTYPE_HAZARD_ASSESSMENT.componentScores.historical_flood_proximity.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Explainability Evidence Card */}
            <Card variant="paper">
              <CardHeader
                title="Explainability & Evidence"
                subtitle="Deterministic threshold triggers"
              />
              <CardContent>
                <EvidenceList evidence={PROTOTYPE_HAZARD_ASSESSMENT.evidence} />
              </CardContent>
            </Card>

            {/* Road Vulnerability Placeholder Preview */}
            <Card variant="cream">
              <CardHeader
                title="Road Vulnerability (M4 Preview)"
                badge={<Badge variant="MUTED">Deferred</Badge>}
              />
              <CardContent>
                <p className="text-xs font-sans leading-relaxed text-[#654536] mb-2">
                  Road network hazard intersection (OSM road segments classified by flood exposure and culvert vulnerability)
                  is scheduled for Milestone 4.
                </p>
                <div className="text-[11px] font-sans text-[#68747B] border-t border-[#D9D0C4] pt-2 flex justify-between">
                  <span>Network Dataset: OSM Maharashtra</span>
                  <span className="font-mono">Engine: Planned</span>
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
          <Button variant="outline" size="sm">
            Refresh Fixture
          </Button>
          <Button variant="primary" size="sm">
            Operational Log
          </Button>
        </div>
      </div>
    </div>
  );
};
