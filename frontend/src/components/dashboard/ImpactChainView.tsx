import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { EvidenceList } from '@/components/dashboard/EvidenceList';
import { AffectedSettlement } from '@/types/settlement';
import { RoadRiskItem, RoadStatus } from '@/types/road';
import { RiskArea } from '@/types/hazard';

interface ImpactChainViewProps {
  area: RiskArea;
  settlements: AffectedSettlement[];
  roads: RoadRiskItem[];
}

// Road status → visual indicator color matching editorial palette
const ROAD_STATUS_COLOUR: Record<RoadStatus, string> = {
  'CONFIRMED BLOCKED': '#B66F55',
  'AT RISK': '#8A624E',
  'MONITORING': '#557A95',
};

export const ImpactChainView: React.FC<ImpactChainViewProps> = ({
  area,
  settlements,
  roads,
}) => {
  // Aggregate statistics for Step 4
  const totalPopulation = settlements.reduce((acc, s) => acc + s.population, 0);
  const totalHouseholds = settlements.reduce((acc, s) => acc + s.affectedHouseholds, 0);
  const confirmedBlockedCount = roads.filter((r) => r.status === 'CONFIRMED BLOCKED').length;
  const atRiskCount = roads.filter((r) => r.status === 'AT RISK').length;

  return (
    <div className="space-y-0 font-sans text-xs text-[#273038]">
      {/* ── STEP 1 : Risk Area ────────────────────────────────── */}
      <section aria-label="Step 1: Risk area summary">
        <div className="flex items-center gap-2 px-3.5 pt-3 pb-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#68747B]">
            01 / Risk Area
          </span>
          <div className="flex-1 border-t border-[#D9D0C4]" aria-hidden="true" />
        </div>
        <div className="px-3.5 pb-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-serif font-bold text-sm text-[#18324A]">{area.name}</span>
            <Badge variant={area.riskLevel}>{area.riskLevel}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[#68747B] font-mono">
            <span>Taluka: <strong className="text-[#273038]">{area.taluka}</strong></span>
            <span>Area: <strong className="text-[#273038]">{area.areaKm2} km²</strong></span>
            <span>Hazard Score: <strong className="text-[#18324A]">{area.hazardScore.toFixed(2)}</strong></span>
          </div>
          <p className="text-[11px] text-[#654536] italic leading-snug">{area.summary}</p>
        </div>
      </section>

      <div className="mx-3.5 border-t border-[#D9D0C4]" aria-hidden="true" />

      {/* ── STEP 2 : Evidence ─────────────────────────────────── */}
      <section aria-label="Step 2: Hazard evidence">
        <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#68747B]">
            02 / Evidence
          </span>
          <div className="flex-1 border-t border-[#D9D0C4]" aria-hidden="true" />
        </div>
        <div className="px-3.5 pb-2.5">
          <EvidenceList evidence={area.evidence} />
        </div>
      </section>

      <div className="mx-3.5 border-t border-[#D9D0C4]" aria-hidden="true" />

      {/* ── STEP 3 : Affected Settlements ─────────────────────── */}
      <section aria-label="Step 3: Affected settlements">
        <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#68747B]">
            03 / Affected Settlements ({settlements.length})
          </span>
          <div className="flex-1 border-t border-[#D9D0C4]" aria-hidden="true" />
        </div>

        {settlements.length === 0 ? (
          <p className="px-3.5 pb-2.5 text-[11px] text-[#68747B] italic">
            No settlement fixture records linked to this risk area.
          </p>
        ) : (
          <div className="px-3.5 pb-2.5 space-y-2">
            {settlements.map((s) => (
              <div
                key={s.id}
                className="border border-[#D9D0C4] bg-[#FAF8F3] p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif font-bold text-[13px] text-[#18324A] leading-tight">
                    {s.name}
                  </span>
                  <Badge variant={s.impactLevel} size="sm">
                    {s.impactLevel}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-3 text-[11px] font-mono text-[#68747B]">
                  <span>Taluka: <strong className="text-[#273038]">{s.taluka}</strong></span>
                  <span>Pop: <strong className="text-[#18324A]">{s.population.toLocaleString()}</strong></span>
                  <span>HH: <strong className="text-[#18324A]">{s.affectedHouseholds.toLocaleString()}</strong></span>
                </div>

                <p className="text-[11px] text-[#654536] italic leading-snug border-t border-[#D9D0C4]/60 pt-1">
                  {s.vulnerabilityContext}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mx-3.5 border-t border-[#D9D0C4]" aria-hidden="true" />

      {/* ── STEP 4 : Population / Impact Summary ──────────────── */}
      <section aria-label="Step 4: Population and impact summary">
        <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#68747B]">
            04 / Population &amp; Exposure Impact
          </span>
          <div className="flex-1 border-t border-[#D9D0C4]" aria-hidden="true" />
        </div>
        <div className="px-3.5 pb-2.5">
          <div className="grid grid-cols-2 gap-2 border border-[#D9D0C4] bg-[#F3EEE5]/60 p-2.5">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#68747B]">
                Total Exposed Pop.
              </span>
              <div className="text-base font-serif font-bold text-[#18324A]">
                {totalPopulation > 0 ? totalPopulation.toLocaleString() : '0'}
              </div>
              <span className="text-[10px] text-[#68747B]">Across {settlements.length} settlement(s)</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#68747B]">
                Exposed Households
              </span>
              <div className="text-base font-serif font-bold text-[#18324A]">
                {totalHouseholds > 0 ? totalHouseholds.toLocaleString() : '0'}
              </div>
              <span className="text-[10px] text-[#68747B]">Primary habitation units</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-3.5 border-t border-[#D9D0C4]" aria-hidden="true" />

      {/* ── STEP 5 : Road Risk ────────────────────────────────── */}
      <section aria-label="Step 5: Road risk">
        <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#68747B]">
            05 / Road Risk ({roads.length} Segment{roads.length !== 1 ? 's' : ''})
          </span>
          <div className="flex-1 border-t border-[#D9D0C4]" aria-hidden="true" />
        </div>

        {/* Tactical status count pill */}
        <div className="px-3.5 pb-1.5 flex gap-2 text-[10px] font-mono">
          <span className="text-[#B66F55] font-bold">
            {confirmedBlockedCount} Blocked
          </span>
          <span className="text-[#68747B]">·</span>
          <span className="text-[#8A624E] font-bold">
            {atRiskCount} At Risk
          </span>
          <span className="text-[#68747B]">·</span>
          <span className="text-[#557A95]">
            {roads.length - confirmedBlockedCount - atRiskCount} Monitoring
          </span>
        </div>

        {roads.length === 0 ? (
          <p className="px-3.5 pb-3 text-[11px] text-[#68747B] italic">
            No road-risk fixture records linked to this risk area.
          </p>
        ) : (
          <div className="px-3.5 pb-3 space-y-2">
            {roads.map((road) => {
              const statusColour = ROAD_STATUS_COLOUR[road.status];
              return (
                <div
                  key={road.id}
                  className="border border-[#D9D0C4] bg-[#FAF8F3] p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans font-semibold text-[12px] text-[#18324A] leading-tight">
                      {road.name}
                    </span>
                    {/* Conservative road status badge */}
                    <span
                      className="font-mono text-[10px] uppercase px-1.5 py-0.5 border font-bold"
                      style={{
                        color: statusColour,
                        borderColor: statusColour,
                        backgroundColor: 'transparent',
                      }}
                    >
                      {road.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#273038] leading-snug">{road.riskReason}</p>

                  <p className="text-[10px] text-[#68747B] italic leading-snug border-t border-[#D9D0C4]/60 pt-1">
                    {road.operationalNote}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
