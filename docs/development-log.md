# Development Log

## Project
Team CafeTerminal — HackMatrix 5.0

## Development Scope
Round 1 prototype for the PCCOE HackMatrix 5.0 problem statement.

## Log

### 2026-09-24 — Repository Initialization

- Created the initial project repository structure.
- Established separate areas for backend, frontend, data, experiments, tests, documentation, and screenshots.
- Defined the initial Round-1 development scope.
- Development will proceed incrementally through feature branches and meaningful commits.
- No application functionality has been implemented at this stage.

### 2026-09-25 — Backend Foundation and Data Contracts

- Initialized minimal Flask backend application structure with application factory pattern.
- Added clean configuration module (`backend/config.py`) supporting environment profiles without hardcoded secrets.
- Implemented and verified `GET /api/health` monitoring endpoint returning `{"status": "ok"}`.
- Defined hazard data contracts (`HazardInput`, `HazardOutput`, `Location`) in `backend/models/schemas.py`.
- Implemented reusable min-max normalization utility in `backend/utils/normalization.py` with division-by-zero protection.
- Created `backend/services/hazard_engine.py` interface stub with clear documentation of planned inputs, without mock scoring logic.
- Established automated test suite (`tests/test_hazard.py`) verifying normalization edge cases, schema serialization, interface contract, and health route.
- Defined minimal backend dependencies in `backend/requirements.txt` (Flask only).

### 2026-09-25 — Open-Meteo Weather Ingestion Service

- Implemented weather data ingestion service (`backend/services/weather_service.py`) using Python's standard library `urllib` (no additional external HTTP dependencies added).
- Added coordinate bounds validation (-90/90 lat, -180/180 lon) and parameter query builder supporting dynamic coordinates and configurable past/forecast day windows.
- Established clean separation between HTTP retrieval (`fetch_open_meteo_raw`) and JSON payload normalization (`parse_open_meteo_response`).
- Added structured exception handling hierarchy (`WeatherServiceError`, `WeatherAPIError`, `WeatherParsingError`) returning explicit failure details rather than mock data on failure.
- Defined `HourlyPrecipitationData` internal dataclass contract in `backend/models/schemas.py` with validation and serialization methods.
- Added offline reference fixture (`data/sample/open_meteo_pune_sample.json`) explicitly documented as sample/mock data for non-live testing.
- Created unit test suite (`tests/test_weather_service.py`) covering URL generation, coordinate checks, HTTP errors, parsing edge cases, sample file loading, and contract serialization with mocked HTTP.
- Extended `backend/config.py` with Open-Meteo endpoint configuration and timeout constants.
- Documented data source specifications in `docs/data-sources.md` and architecture integration in `docs/architecture.md`.
- Explicitly documented that this service acts as an ingestion pipeline and does NOT implement hazard scoring or risk classification.

### 2026-09-25 — Rainfall Metrics and Deterministic Hazard Engine Foundation

- Implemented rainfall metrics extraction service (`backend/services/rainfall_service.py`) operating over `HourlyPrecipitationData` and numerical time series.
- Added deterministic window calculations for 1-hour intensity, 24-hour cumulative precipitation, and 72-hour cumulative precipitation.
- Enforced strict validation: empty datasets, non-numeric values, negative rainfall, or insufficient series length (<24h for 24h, <72h for 72h) raise explicit `ValueError` rather than silently converting missing data to zero.
- Added configurable rainfall normalization utilities (`RainfallNormalizationConfig`) scaling physical precipitation depths to a bounded [0.0, 1.0] interval using min-max scaling and clipping.
- Defined `RainfallMetrics` schema contract and extended `HazardOutput` with normalized `component_scores` breakdown and backward-compatible serialization.
- Added strict physical and geographic boundary validation to `HazardInput` (`lat` in [-90, 90], `lon` in [-180, 180], non-negative rainfall, normalized terrain and historical flood factors in [0.0, 1.0]).
- Implemented `calculate_hazard_score` in `backend/services/hazard_engine.py`, replacing the previous `NotImplementedError` interface placeholder.
- Designed deterministic multi-factor scoring formula combining normalized 1h, 24h, 72h rainfall, terrain susceptibility, and historical flood proximity via explicit weights (`HazardWeights`) summing strictly to 1.0.
- Implemented qualitative risk categorization (`RiskThresholds`) mapping composite scores to 'LOW', 'MODERATE', 'HIGH', and 'CRITICAL' tiers.
- Built explainability evidence generation flagging contributing triggers (e.g. `high_1h_rainfall`, `high_72h_rainfall`, `high_terrain_susceptibility`, `near_historical_flood_zone`).
- Configured environment-driven constants in `backend/config.py` for rainfall normalization bounds, model weights, and risk classification thresholds.
- Created `tests/test_rainfall_service.py` and expanded `tests/test_hazard.py` with 39 new tests covering 1h/24h/72h metrics, normalization boundaries, edge cases, error conditions, determinism, and end-to-end weather-to-hazard integration.
- Strictly maintained scope discipline: no external dependencies, no database, no LLM for numerical decisions, and no unapproved integrations.

### 2026-09-25 — Milestone 4: Real Population Acquisition and Settlement Impact Service

- Investigated and acquired official WorldPop India 2020 1km population count raster (`ind_ppp_2020_1km_Aggregated.tif`, 18.2 MB, 30 arc-seconds resolution, EPSG:4326).
- Downloaded and verified raster integrity: confirmed dimensions (3508x3451), driver (GTiff), CRS (EPSG:4326), nodata (-99999.0), valid population range (1.12 to 43,626.86 per km² pixel), and full spatial coverage of Pune District.
- Acquired official Local Government Directory (LGD) subdistrict boundaries covering all 14 talukas of Pune District (`pune_talukas.geojson`) and Pune Municipal Corporation administrative wards (`pune_admin_wards.geojson`).
- Configured `.gitignore` to strictly exclude raw GeoTIFF rasters (`*.tif`) and raw data directories (`data/raw/`) from git tracking.
- Added necessary geospatial libraries deliberately to `backend/requirements.txt`: `rasterio` and `shapely`.
- Created `Settlement` and `SettlementImpact` schemas in `backend/models/schemas.py` with strict coordinate and population validation (missing or NaN population strictly raises `ValueError` rather than silently converting to zero).
- Implemented `backend/services/settlement_service.py` with deterministic settlement impact calculation:
  $$\text{settlement\_impact} = \text{hazard\_score} \times \text{population}$$
  Supporting single-settlement calculation, multi-settlement batch processing, deterministic descending sorting with tie-breaking, and offline file loading.
- Implemented `backend/services/population_service.py` performing spatial aggregation of WorldPop raster counts over boundary polygons using geometry masking, CRS reprojection, and nodata filtering.
- Generated offline processed dataset in `data/processed/pune_settlements.json` aggregating 11,974,026 real residents across all 14 official Pune talukas.
- Created unit tests in `tests/test_settlement_service.py` (18 tests) and `tests/test_population_service.py` (12 tests) using tiny controlled synthetic fixtures (5x5 grid cells, controlled NoData, CRS reprojections, validation boundaries) running completely offline without network dependence.
- Total test count expanded from 74 to 104 tests, with all 104 tests passing cleanly.

## Current Status

Backend foundation active, Open-Meteo weather ingestion service active, rainfall metrics extraction verified, deterministic hazard scoring engine verified, real WorldPop demographic raster acquired and verified, LGD administrative boundaries acquired, and deterministic settlement impact calculation engine fully implemented and tested. All 104 automated tests passing.

## Next Step

Implement road network ingestion and accessibility analysis (OSM highway extraction and risk intersection) to evaluate isolation and transit vulnerability for populated settlements.
