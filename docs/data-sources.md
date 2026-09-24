# Data Sources

Data sources are documented here as they are evaluated, integrated, and verified.

## 1. Open-Meteo Forecast API (Rainfall & Weather Ingestion)

- **Source Name:** Open-Meteo Weather Forecast API
- **URL / Reference:** [https://api.open-meteo.com/v1/forecast](https://api.open-meteo.com/v1/forecast)
- **Purpose:** Ingestion of hourly precipitation time series to capture recent rainfall accumulation and short-term forecast for flood hazard assessment.
- **Relevant Fields:**
  - `latitude`, `longitude`: Observation/grid coordinates.
  - `hourly.time`: Chronological ISO-8601 hourly timestamps.
  - `hourly.precipitation`: Millimeters (mm) of precipitation per hour.
- **Geographic & Temporal Coverage:**
  - Global coverage (WMO and numerical weather prediction model aggregates).
  - Target Region: Pune District, Maharashtra, India.
  - Temporal Window: Configurable past observation window (default: 3 days / 72 hours for soil saturation tracking) and forecast window (default: 1 day / 24 hours).
- **Access & Authentication:**
  - Public API; no API key required for non-commercial and research usage.
  - Standard HTTP GET requests handled via standard library `urllib`.
- **Licensing & Usage Considerations:**
  - Open Database License (ODbL) / Creative Commons Attribution 4.0 International (CC BY 4.0).
  - Attribution required.
- **Ingestion Layer vs. Hazard Model:**
  - This service functions solely as an **ingestion and data extraction layer**. It transforms raw JSON responses into the clean internal contract [`HourlyPrecipitationData`](file:///c:/Users/PRIME/Desktop/Team-CafeTerminal-HM50049/backend/models/schemas.py#L148).
  - **It does NOT calculate hazard scores, weights, or risk levels.**
- **Live vs. Sample Data Distinction:**
  - **Live API Ingestion:** Fetched dynamically on-demand from `https://api.open-meteo.com/v1/forecast` via [`fetch_open_meteo_raw`](file:///c:/Users/PRIME/Desktop/Team-CafeTerminal-HM50049/backend/services/weather_service.py#L93).
  - **Sample / Replayed Data:** Static offline fixture located at [`data/sample/open_meteo_pune_sample.json`](file:///c:/Users/PRIME/Desktop/Team-CafeTerminal-HM50049/data/sample/open_meteo_pune_sample.json), explicitly labeled as `SAMPLE / MOCK DATA ONLY` for testing and deterministic validation without external network dependency.
