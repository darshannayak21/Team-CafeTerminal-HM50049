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

## Current Status

Backend foundation active, data contracts defined, and Open-Meteo hourly precipitation ingestion service implemented and tested. All 35 tests passing. Hazard engine remains an un-implemented interface stub.

## Next Step

Implement rainfall aggregation/preprocessing logic (extracting 1h intensity and 24h/72h cumulative depths from `HourlyPrecipitationData`) and prepare terrain susceptibility ingestion.
