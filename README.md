# Team CafeTerminal — PCCOE HackMatrix 5.0

## Overview

Team CafeTerminal's project for PCCOE HackMatrix 5.0 is a disaster-response intelligence platform designed to connect environmental hazard warnings with affected settlements and road network accessibility. By linking rainfall observations, terrain-derived flood susceptibility, settlement populations, and road vulnerabilities, the platform aims to help emergency responders prioritize timely intervention during severe flood events.

## Current Project Status

**Repository foundation / initialization**

No application functionality or live services have been implemented at this stage. All components are being built incrementally.

## Round-1 Scope

The Round-1 prototype focuses on establishing a functional vertical slice for a single district and primary hazard:

- **Geographic Area:** Pune District, Maharashtra
- **Primary Hazard:** Flooding
- **Environmental Data:** Rainfall input (live/forecast or clearly labeled replayed historical data) and SRTM elevation/terrain data
- **Hazard Scoring:** Initial composite flood-hazard scoring combining rainfall intensity, terrain susceptibility, and proximity to known flood zones
- **Settlement Impact:** Boundary and population-weighted impact assessment for settlements across Pune District
- **Road Accessibility:** First-pass road risk classification intersecting OpenStreetMap (OSM) road networks with hazard zones
- **Response Prioritization:** Prioritized ranking of affected settlements factoring in impact and access isolation
- **Responder Dashboard:** A map interface displaying hazard layers, affected settlements, road risk, and prioritization details

## Planned System Flow

```text
Environmental & Geospatial Data Ingestion (Rainfall, SRTM, OSM, Census/Boundaries)
   ↓
Data Normalization & Spatial Preprocessing
   ↓
Flood Hazard Calculation (Terrain susceptibility + Rainfall intensity)
   ↓
Settlement Impact Assessment (Population-weighted exposure)
   ↓
Road Network Risk Analysis (Intersection of access routes with hazard zones)
   ↓
Response Prioritization Scoring (Impact × Isolation factor)
   ↓
Flask REST API
   ↓
Interactive Map Dashboard (Leaflet / Web Interface)
```

## Initial Planned Technology Direction

- **Backend:** Python / Flask
- **Geospatial Processing:** GeoPandas / Shapely / Rasterio / GDAL
- **Frontend:** React / Next.js
- **Mapping Layer:** Leaflet (or MapLibre)
- **Data Sources:** Open-Meteo, SRTM, OpenStreetMap, Census/LGD/WorldPop (documented as integrated)

## Repository Structure

```text
Team-CafeTerminal-HM50049/
│
├── backend/            # Backend service, API routes, and scoring engines
├── frontend/           # Web client and map dashboard
├── data/
│   ├── raw/            # Unprocessed environmental and spatial datasets
│   ├── processed/      # Normalized, projected, and cleaned layers
│   └── sample/         # Small reference/test subsets for local runs
├── notebooks/          # Exploratory data analysis and threshold experiments
├── tests/              # Automated unit and integration tests
├── docs/               # Architecture, algorithm notes, and tracking docs
│   ├── architecture.md
│   ├── data-sources.md
│   ├── algorithms.md
│   ├── development-log.md
│   ├── prototype.md
│   └── testing.md
├── screenshots/        # Milestone captures and interface progression
├── .gitignore          # Repository exclusion rules
├── .env.example        # Environment variable template
└── README.md           # Project documentation
```

## Incremental Development Note

This repository is developed in disciplined, verifiable milestones following feature branches and incremental commits. Features, APIs, models, and interfaces are documented and integrated step-by-step.

## Data Sources and Algorithms

Data sources and algorithmic formulations are subject to validation and will be documented in `docs/data-sources.md` and `docs/algorithms.md` as they are finalized and integrated.

## Screenshots and Demo

*(Placeholder — screenshots and demo links will be added as prototype milestones are completed).*
