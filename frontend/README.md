# Frontend Dashboard — Team CafeTerminal (HackMatrix 5.0)

## Overview

This directory contains the Next.js (App Router, TypeScript) web client for the disaster-response intelligence platform. 

The console provides operational flood-hazard visibility and priority intelligence for emergency responders in Pune District, Maharashtra.

## Milestone Status: Milestone 2 — Interactive Risk Map & Area Selection

This codebase incorporates **Milestone 2** on top of the established Milestone 1 foundation:
- **Interactive Map:** Leaflet-based dynamic geospatial map centered on Pune District (`18.5204° N, 73.8567° E`) rendered client-side (`ssr: false`) to avoid hydration errors.
- **Risk Area Polygons:** Prototype polygon overlays across Pune District (Mula-Mutha Confluence Basin, Khadakwasla Dam Spillway, Mulshi Catchment Valley, Pawana River Lowland, Kukadi Northern Floodplain) visually color-coded according to risk tiers (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`).
- **Interactive Selection:** Clicking any risk polygon highlights its boundaries, centers the view, and updates the right-side operational panel with localized composite hazard scoring, component factors, and deterministic evidence triggers.
- **Map Legend & Controls:** Cartographic map legend, zoom controls, scale rule, and sector quick-selector.
- **Data Contracts & Fixtures:** Explicit `RiskArea` TypeScript contracts (`types/hazard.ts`) with strictly labeled local fixture data (`data/fixtureData.ts`).

*Note: Settlement impact buffering, road network risk classification, and automated priority queue ranking are scheduled for Milestones 3, 4, and 5.*

## Getting Started

From this directory:

```bash
# Run local development server
npm run dev

# Run production build & TypeScript validation
npm run build

# Run linting check
npm run lint
```
