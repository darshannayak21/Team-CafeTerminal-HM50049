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
  - `HazardInput`: Conceptual input contract defining observations (1h, 24h, 72h rainfall, terrain susceptibility, historical flood proximity).
  - `HazardOutput`: Output contract defining `hazard_score` (0.0–1.0), `risk_level` (categorical), and `evidence` factors.

- **Normalization Utility (`backend/utils/normalization.py`):**
  - Reusable min-max normalization (`normalize`) with zero-range / division-by-zero protection and boundary clamping.

- **Service Interface (`backend/services/hazard_engine.py`):**
  - Defined `calculate_hazard_score(hazard_input: HazardInput) -> HazardOutput` interface stub.
  - Explicitly raises `NotImplementedError` pending algorithmic calibration.

*Note: Settlement impact analysis, road accessibility intersections, response prioritization, and frontend dashboard integration are intentionally deferred to subsequent milestones.*
