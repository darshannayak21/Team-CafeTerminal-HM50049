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

    setTimeout(() => {
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
    <div className="frosted-glass rounded-lg border border-hairline p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-hairline">
        <h2 className="text-[17px] font-semibold tracking-[-0.374px] text-ink">
          Accessible Route
        </h2>
        <span className="text-[10px] font-normal tracking-[-0.08px] px-2 py-1 bg-surface-pearl text-ink-muted-80 rounded-sm">
          Dynamic GIS
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="from-location" className="block text-[12px] font-normal tracking-[-0.12px] text-ink-muted-48 mb-1.5 uppercase">
            Origin
          </label>
          <select
            id="from-location"
            value={fromLoc}
            onChange={(e) => setFromLoc(e.target.value)}
            className="w-full bg-canvas border border-hairline rounded-sm px-3 py-2.5 text-[14px] text-ink focus:border-primary-focus focus:outline-none transition-colors"
          >
            {PREDEFINED_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id} disabled={loc.id === toLoc}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="to-location" className="block text-[12px] font-normal tracking-[-0.12px] text-ink-muted-48 mb-1.5 uppercase">
            Destination
          </label>
          <select
            id="to-location"
            value={toLoc}
            onChange={(e) => setToLoc(e.target.value)}
            className="w-full bg-canvas border border-hairline rounded-sm px-3 py-2.5 text-[14px] text-ink focus:border-primary-focus focus:outline-none transition-colors"
          >
            {PREDEFINED_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id} disabled={loc.id === fromLoc}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={handleCalculateRoute}
            disabled={isCalculating}
            className="flex-1 bg-primary text-on-primary text-[14px] font-normal rounded-pill px-[22px] py-[10px] hover:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
          >
            {isCalculating ? 'Computing...' : 'Find Route'}
          </button>
          {activeRoute && (
            <button
              type="button"
              onClick={handleClearRoute}
              className="bg-surface-pearl border border-hairline text-ink-muted-80 text-[14px] font-normal rounded-pill px-[18px] py-[10px] hover:scale-95 transition-transform"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {activeRoute && (
        <div className="mt-5 pt-4 border-t border-hairline animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-[-0.12px] text-primary">
              Recommended Route
            </span>
            <span className="text-[10px] font-normal text-ink-muted-48">Simulated</span>
          </div>

          <div className="mt-1.5 text-[17px] font-semibold tracking-[-0.374px] text-ink">
            {activeRoute.fromName} → {activeRoute.toName}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-canvas border border-hairline rounded-sm p-2.5">
              <span className="text-[10px] text-ink-muted-48 tracking-[-0.08px] block uppercase">Distance</span>
              <span className="text-[14px] font-semibold text-ink mt-0.5 block">{activeRoute.distanceKm} km</span>
            </div>
            <div className="bg-canvas border border-hairline rounded-sm p-2.5">
              <span className="text-[10px] text-ink-muted-48 tracking-[-0.08px] block uppercase">Est. Duration</span>
              <span className="text-[14px] font-semibold text-ink mt-0.5 block">
                ~{Math.floor(activeRoute.durationMinutes / 60)}h {activeRoute.durationMinutes % 60}m
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-[12px] leading-[1.4] font-normal text-ink-muted-80 tracking-[-0.12px]">
            <div className="flex items-start gap-2">
              <span className="text-primary font-semibold">⚠</span>
              <span>{activeRoute.atRiskSegmentsCount} at-risk segments monitored</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-semibold">✓</span>
              <span>{activeRoute.disruptedSegmentsAvoidedCount} disrupted segment avoided</span>
            </div>
            <div className="text-[12px] text-ink-muted-48 italic mt-2 pt-2 border-t border-divider-soft">
              {activeRoute.routeSummary}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
