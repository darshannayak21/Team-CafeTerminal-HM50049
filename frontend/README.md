# Frontend Dashboard — Team CafeTerminal (HackMatrix 5.0)

## Overview

This directory contains the Next.js (App Router, TypeScript) web client for the disaster-response intelligence platform. 

The console provides operational flood-hazard visibility and priority intelligence for emergency responders in Pune District, Maharashtra.

## Milestone Status: Milestone 1 — Frontend Foundation

This codebase represents **Milestone 1** of the incremental frontend implementation:
- **Visual Design System:** Restrained editorial / cartographic visual theme with custom palette (Deep Navy, Paper, Warm Cream, Charcoal, Terracotta, Muted Blue, and Dark Brown).
- **Layout Architecture:** Dedicated central map workspace stage with cartographic coordinate grid markers, scale rules, and a right-side operational intelligence details panel.
- **Component System:** Modular, accessible components across `layout/` (`Header`, `DistrictContextBar`, `DashboardGrid`), `ui/` (`Badge`, `Button`, `Card`, `DataField`), and `dashboard/` (`MapWorkspacePlaceholder`, `OperationalPanel`, `EvidenceList`).
- **Data Contracts & Fixtures:** Explicit TypeScript types (`types/hazard.ts`, `types/operational.ts`) and labeled local prototype fixture data (`data/fixtureData.ts`).

*Note: Live backend API integration, interactive Leaflet rendering, settlement risk extraction, and priority queue calculations are intentionally deferred to subsequent milestones.*

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
