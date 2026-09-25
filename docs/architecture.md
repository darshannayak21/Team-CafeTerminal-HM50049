# System Architecture

## Target Architecture Flow

The backend system is designed around an incremental, decoupled data and scoring pipeline:

```text
Data Sources (Rainfall, SRTM, OSM, Boundaries)
    ↓
Data/Service Layer (Ingestion & Extraction)
    ↓
Normalization (Feature Scaling & Bound Clamping)
    ↓
Hazard Engine (Composite Scoring & Risk Classification)
    ↓
Settlement Impact (Exposure & Population Weighting)
    ↓
Road Risk (Accessibility & Network Vulnerability)
    ↓
Response Priority (Impact × Isolation Scoring)
    ↓
Confidence + Evidence (Provenance & Explanation Tags)
    ↓
Flask API (REST Endpoints)
    ↓
Frontend Dashboard (Interactive Map & Risk Summary)
```

## Implemented Backend Foundation (Current Status)

The foundation and contract layer are established with the following components:

- **Application Foundation (`backend/app.py` & `backend/config.py`):**
  - Application factory pattern (`create_app`) isolating configuration and routing.
  - Environment-based configuration profiles (`DevelopmentConfig`, `TestingConfig`, `ProductionConfig`).
  - Active monitoring endpoint: `GET /api/health` returning `{"status": "ok"}`.

- **Data Ingestion Service (`backend/services/weather_service.py`):**
  - Modular weather ingestion integrating Open-Meteo's forecast API using Python's standard `urllib` (no extraneous dependencies).
  - Explicit separation between HTTP fetching (`fetch_open_meteo_raw`) and structure parsing (`parse_open_meteo_response`).
  - Supports dynamic coordinates, configurable past-days (for 72h accumulation) and forecast-days windows.
  - Robust exception handling hierarchy (`WeatherServiceError`, `WeatherAPIError`, `WeatherParsingError`) returning actionable errors rather than silently manufacturing fake data.
  - Offline reference dataset maintained in `data/sample/open_meteo_pune_sample.json` for deterministic local testing.
  - *Distinction:* Functions purely as an ingestion/extraction layer; does not calculate hazard scores or risk categories.

- **Data Contracts (`backend/models/schemas.py`):**
  - `Location`: Geographic coordinate model (`lat`, `lon`).
  - `HourlyPrecipitationData`: Ingested rainfall time series contract containing observation coordinates, timestamps, hourly precipitation depths in mm, data source name, and ingestion timestamp.
  - `RainfallMetrics`: Aggregated precipitation metrics across 1h, 24h, and 72h observation windows.
  - `HazardInput`: Input contract defining observations (1h, 24h, 72h rainfall, terrain susceptibility, historical flood proximity) with strict boundary and coordinate validation.
  - `HazardOutput`: Output contract defining `hazard_score` (0.0–1.0), qualitative `risk_level` ('LOW', 'MODERATE', 'HIGH', 'CRITICAL'), `evidence` indicator tags, and normalized `component_scores` breakdown.

- **Normalization Utility (`backend/utils/normalization.py`):**
  - Reusable min-max normalization (`normalize`) with zero-range / division-by-zero protection and boundary clamping.

- **Rainfall Metrics Service (`backend/services/rainfall_service.py`):**
  - Aggregation engine operating directly on `HourlyPrecipitationData` or numeric series.
  - Extracts 1-hour rainfall intensity, 24-hour cumulative precipitation, and 72-hour cumulative precipitation.
  - Strict validation: rejects missing, NaN, negative, or insufficient time series data without silent zero-padding.
  - Standardized normalization utilities using explicit, configurable engineering baseline thresholds (`RainfallNormalizationConfig`).
  - Provides `create_hazard_input_from_weather` to bridge ingestion contracts directly to hazard evaluation.

- **Hazard Scoring Engine (`backend/services/hazard_engine.py`):**
  - Deterministic, multi-factor flood hazard engine implementing `calculate_hazard_score(hazard_input: HazardInput) -> HazardOutput`.
  - Transparent linear combination over 5 normalized factors: 1h rainfall, 24h rainfall, 72h rainfall, terrain susceptibility, and historical flood proximity.
  - Governed by explicit, configurable weights (`HazardWeights`) summing strictly to 1.0.
  - Categorizes composite hazard scores into qualitative risk tiers (`RiskThresholds`): `LOW`, `MODERATE`, `HIGH`, `CRITICAL`.
  - Generates deterministic explainability evidence tags and individual component score breakdowns.
  - Zero external API, database, or LLM dependencies for mathematical evaluation.

- **Population Aggregation Service (`backend/services/population_service.py`):**
  - Ingests official WorldPop gridded population GeoTIFF (`ind_ppp_2020_1km_Aggregated.tif`) and official Local Government Directory (LGD) subdistrict/taluka boundary GeoJSON (`pune_talukas.geojson`).
  - Spatial aggregation via `rasterio.mask.mask` and `shapely`: performs polygon geometry masking, reprojection to reconcile CRS differences, nodata filtering, and valid cell count summation.
  - Accounts for population counts (summing cell counts directly rather than surface density).
  - Robust raster verification (`verify_raster_dataset`) checking file existence, driver, CRS, bounds, nodata, and Pune District bounding box coverage.
  - Generates verified, pre-aggregated offline settlement datasets (`data/processed/pune_settlements.json`) containing all 14 official Pune talukas.

- **Settlement Impact Service (`backend/services/settlement_service.py`):**
  - Couples environmental hazard evaluation (`HazardOutput` or normalized score [0.0, 1.0]) with real demographic exposure:
    $$\text{settlement\_impact} = \text{hazard\_score} \times \text{population}$$
  - Functions for single-settlement evaluation, batch multi-settlement evaluation, and deterministic sorting (`sort_settlements_by_impact`) with secondary ID tie-breaking.
  - Zero LLM, non-deterministic, or arbitrary heuristics; strictly preserves original hazard scores without mutation.

- **Settlement Data Contracts (`backend/models/schemas.py`):**
  - `Settlement`: Represents an administrative or populated area with `settlement_id`, `name`, `latitude`, `longitude`, `population`, optional `taluka`, and optional boundary `geometry`. Strict validation rejects empty IDs, out-of-bounds coordinates, negative counts, or missing populations (no silent zero conversion).
  - `SettlementImpact`: Output contract encapsulating `settlement_id`, `settlement_name`, `population`, `hazard_score`, and computed `settlement_impact`.

*Note: Road accessibility intersections, OSRM routing, response prioritization, and frontend dashboard integration are intentionally deferred to subsequent milestones.*
