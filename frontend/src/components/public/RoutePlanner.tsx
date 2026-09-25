'use client';

import React, { useState } from 'react';
import { RouteOption } from '@/types/prototype';
import { PREDEFINED_LOCATIONS, PROTOTYPE_ROUTES } from '@/data/prototype';

interface RoutePlannerProps {
  onRouteCalculated: (route: RouteOption | null) => void;
  activeRoute: RouteOption | null;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  onRouteCalculated,
  activeRoute,
}) => {
  const [fromLoc, setFromLoc] = useState<string>('pune');
  const [toLoc, setToLoc] = useState<string>('mulshi');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const handleCalculateRoute = () => {
    setIsCalculating(true);

    // Simulate route calculation logic
    setTimeout(() => {
      // Find matching route or fallback to default
      const key = `${fromLoc}-${toLoc}`;
      const reverseKey = `${toLoc}-${fromLoc}`;

      const found = PROTOTYPE_ROUTES.find(
        (r) => r.id === key || r.id === reverseKey
      ) ?? PROTOTYPE_ROUTES[0];

      onRouteCalculated(found);
      setIsCalculating(false);
    }, 450);
  };

  const handleClearRoute = () => {
    onRouteCalculated(null);
  };

  return (
    <div className="bg-[#FAF8F3] border border-[#D9D0C4] p-4 text-[#273038] shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-[#D9D0C4]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-[#18324A]" />
          <h2 className="font-serif font-bold text-sm tracking-tight text-[#18324A] uppercase">
            Find an Accessible Route
          </h2>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#D9D0C4] bg-[#F3EEE5] text-[#654536] uppercase">
          Dynamic GIS
        </span>
      </div>

      <div className="mt-3.5 space-y-3">
        {/* FROM */}
        <div>
          <label htmlFor="from-location" className="block text-[11px] font-mono uppercase tracking-wider text-[#68747B] mb-1">
            FROM (Origin)
          </label>
          <select
            id="from-location"
            value={fromLoc}
            onChange={(e) => setFromLoc(e.target.value)}
            className="w-full bg-[#FAF8F3] border border-[#D9D0C4] px-3 py-2 text-xs font-sans text-[#273038] focus:border-[#18324A] focus:outline-hidden"
          >
            {PREDEFINED_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id} disabled={loc.id === toLoc}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* TO */}
        <div>
          <label htmlFor="to-location" className="block text-[11px] font-mono uppercase tracking-wider text-[#68747B] mb-1">
            TO (Destination)
          </label>
          <select
            id="to-location"
            value={toLoc}
            onChange={(e) => setToLoc(e.target.value)}
            className="w-full bg-[#FAF8F3] border border-[#D9D0C4] px-3 py-2 text-xs font-sans text-[#273038] focus:border-[#18324A] focus:outline-hidden"
          >
            {PREDEFINED_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id} disabled={loc.id === fromLoc}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Button */}
        <div className="pt-1 flex gap-2">
          <button
            type="button"
            onClick={handleCalculateRoute}
            disabled={isCalculating}
            className="flex-1 bg-[#18324A] hover:bg-[#273038] text-[#FAF8F3] font-mono text-xs font-semibold py-2.5 px-3 uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-60"
          >
            {isCalculating ? 'Computing Hazard Surface...' : 'Find Accessible Route'}
          </button>
          {activeRoute && (
            <button
              type="button"
              onClick={handleClearRoute}
              className="border border-[#D9D0C4] hover:bg-[#F3EEE5] text-[#654536] font-mono text-xs px-2.5 cursor-pointer"
              title="Clear Route"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Simulated Route Result Box */}
      {activeRoute && (
        <div className="mt-4 pt-3.5 border-t border-[#D9D0C4] bg-[#F3EEE5]/60 p-3 border border-[#D9D0C4]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#18324A]">
              Recommended Accessible Route
            </span>
            <span className="text-[10px] font-mono text-[#557A95]">Simulated</span>
          </div>

          <div className="mt-1 font-serif font-bold text-sm text-[#18324A]">
            {activeRoute.fromName} → {activeRoute.toName}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-[#FAF8F3] p-1.5 border border-[#D9D0C4]/80">
              <span className="text-[10px] text-[#68747B] block">DISTANCE</span>
              <span className="font-bold text-[#18324A]">{activeRoute.distanceKm} km</span>
            </div>
            <div className="bg-[#FAF8F3] p-1.5 border border-[#D9D0C4]/80">
              <span className="text-[10px] text-[#68747B] block">EST. DURATION</span>
              <span className="font-bold text-[#18324A]">
                ~{Math.floor(activeRoute.durationMinutes / 60)}h {activeRoute.durationMinutes % 60}m
              </span>
            </div>
          </div>

          {/* Warnings & Avoided Disruption summary */}
          <div className="mt-2.5 space-y-1 text-[11px] font-sans">
            <div className="flex items-start gap-1.5 text-[#8A624E]">
              <span className="font-bold">⚠</span>
              <span>{activeRoute.atRiskSegmentsCount} at-risk segments monitored</span>
            </div>
            <div className="flex items-start gap-1.5 text-[#18324A]">
              <span className="text-[#557A95] font-bold">✓</span>
              <span>{activeRoute.disruptedSegmentsAvoidedCount} disrupted segment avoided</span>
            </div>
            <div className="text-[10px] text-[#68747B] italic mt-1 pt-1 border-t border-[#D9D0C4]/60">
              {activeRoute.routeSummary}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
