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

## 2. WorldPop Gridded Population Data (Demographic Exposure)

- **Dataset / Product Name:** WorldPop Global 2000-2020 1km Population Counts (Unconstrained, Aggregated)
- **Dataset Version / Year:** 2020 (IND, v1)
- **File Name:** `ind_ppp_2020_1km_Aggregated.tif`
- **Source URL:** [https://data.worldpop.org/GIS/Population/Global_2000_2020_1km/2020/IND/ind_ppp_2020_1km_Aggregated.tif](https://data.worldpop.org/GIS/Population/Global_2000_2020_1km/2020/IND/ind_ppp_2020_1km_Aggregated.tif)
- **Acquisition Method:** Direct HTTPS retrieval outside of Git into `data/raw/worldpop/`.
- **Spatial Resolution:** 30 arc-seconds (~1 km at the equator).
- **Coordinate Reference System (CRS):** EPSG:4326 (WGS 84 geographic coordinates).
- **Format & Size:** GeoTIFF (.tif), 19,086,801 bytes (~18.2 MB).
- **Data Type:** Estimated absolute population count per grid cell (`ppp` = population per pixel, NOT population density `pd`).
- **NoData Value:** `-99999.0`
- **Geographic Coverage:** Full national extent of India (Lat: 6.75°N to 35.51°N, Lon: 68.18°E to 97.42°E), fully covering Pune District (approx. Lat 18.05°N–19.38°N, Lon 73.32°E–75.17°E).
- **Licensing:** Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Population Data Limitations:**
  - Modeled dasymetric estimates combining Census 2011 baselines, satellite covariates (built settlement extent, lights), and UN demographic growth projections to 2020.
  - Aggregated at 1km grid resolution; small village hamlets below 1km are smoothed across adjacent cells.
  - Reflects ambient residential distribution rather than dynamic real-time diurnal migration (workplace vs. residential hours).
- **Spatial Aggregation Method:**
  - Raster masking (`rasterio.mask.mask`) over polygon boundary vectors.
  - Automatic CRS reconciliation: input polygon geometries in differing coordinate systems are reprojected to the raster's native CRS before raster clipping.
  - NoData and NaN exclusion: cells with value `-99999.0` or invalid floats are excluded.
  - Aggregated metric: sum of valid pixel counts falling within the polygon boundary.
- **Settlement Impact Formula:**
  $$\text{settlement\_impact} = \text{hazard\_score} \times \text{population}$$

## 3. Administrative & Settlement Boundaries

- **Source 1: Local Government Directory (LGD) Subdistricts / Talukas:**
  - **Source Reference:** Ministry of Panchayati Raj Local Government Directory (LGD) via India Geodata / Census 2011 mappings.
  - **File:** `data/raw/boundaries/pune_talukas.geojson`
  - **Coverage:** All 14 administrative talukas of Pune District: Ambegaon, Baramati, Bhor, Daund, Indapur, Junnar, Khed, Maval, Mulshi, Purandar, Shirur, Rajgad (Velhe), Pune City, and Haveli.
  - **Attributes:** Canonical `name`, stable `id`, official `lgdCode`, `districtId`, and polygon coordinates (EPSG:4326).
- **Source 2: Pune Municipal Corporation (PMC) Administrative Wards:**
  - **Source Reference:** DataMeet Pune Spatial Data / Pune Municipal Corporation.
  - **File:** `data/raw/boundaries/pune_admin_wards.geojson`
  - **Coverage:** 15 official PMC administrative ward offices.
  - **Attributes:** Official ward office name, administrative ward polygons (EPSG:4326).

## 4. Real Data vs. Test Fixture Distinction

- **REAL DATA (Application Layer):**
  - Raw datasets: `data/raw/worldpop/ind_ppp_2020_1km_Aggregated.tif` (18.2 MB) and `data/raw/boundaries/pune_talukas.geojson`. These reside outside Git (enforced via `.gitignore`) and represent real, verified empirical datasets.
  - Processed dataset: `data/processed/pune_settlements.json` generated by spatial aggregation of WorldPop over LGD talukas, capturing 11,974,026 real residents across 14 talukas.
- **TEST FIXTURES (Automated Testing Layer):**
  - Synthetic rasters (5x5 grid cells with controlled values: 100.0, 200.0, NoData `-9999.0`) created in-memory/tempfile within unit tests (`tests/test_population_service.py`).
  - Synthetic boundary boxes and offline mock JSON structures.
  - **Crucial Rule:** Automated test suites run 100% offline with zero external network access and never depend on live WorldPop downloads.
