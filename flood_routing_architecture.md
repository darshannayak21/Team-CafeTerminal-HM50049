# Flood-Aware Dynamic Routing — Architecture & Implementation Plan

## 1. Codebase Audit

### What Actually Exists

| Component | Status | Details |
|-----------|--------|---------|
| **Backend** | Flask 3.x, Python | Blueprint-based, SQLite via `rainguard.db` |
| **Database** | SQLite (138KB) | Tables: `reports`, `news`, `geocoding_cache`, `operational_metrics` |
| **Elevation data** | Real SRTM | `pune_elevation.npy` (100MB), `pune_elevation_merged.npy` (200MB), dual HGT tiles |
| **Rainfall** | Live | OpenWeatherMap API, 33 Pune stations, 5-min cache |
| **Weather** | Live | Open-Meteo API, hourly precipitation data |
| **Settlements** | Real | `pune_settlements.json` with WorldPop-aggregated populations |
| **Hazard engine** | Implemented | Weighted linear composite: rainfall (1h/24h/72h) + terrain + historical |
| **Road network** | Hardcoded only | 7 static `ROAD_NETWORK` entries in `priorities.py` — NOT a real graph |
| **Settlement priorities** | Implemented | `priorities.py` — taluka-profile-based, not live-data-driven |
| **Routing** | NOT implemented | Hardcoded waypoints in `routes.ts` (client), `page.tsx` has one static route |
| **OSRM** | NOT present | No integration, no reference in codebase |
| **Valhalla / GraphHopper** | NOT present | Not in requirements or config |
| **NetworkX** | NOT present | Not imported anywhere |
| **Map** | Leaflet.js | Full `MainHeroMap.tsx`, layers: routes, incidents, news, wards, talukas, WorldPop, radar |
| **AI / LLM** | Groq (live) | Hazard explanation, citizen report analysis (Qwen/Llama fallback) |
| **News ingestion** | Background worker | RSS feeds, LLM extraction, geocoding pipeline, deduplication |
| **Ground reports** | Live | POST/GET API, image upload, SHA256 dedup, LLM analysis |
| **Geocoding** | Implemented | Nominatim + local Pune gazetteer + SQLite cache |
| **Frontend** | Next.js 14 | Page.tsx (main), responder page, dispatch page |
| **SSE / WebSockets** | NOT implemented | Frontend polls every 4000ms |
| **Historical events** | Static JSON | `historical_events.json` — 9.2KB, used in replay route only |
| **Population** | WorldPop | Spatial aggregation via rasterio, Pune boundaries |

### What Is NOT Implemented (claimed vs actual)
- No real road graph (OSM or otherwise)
- No actual routing algorithm of any kind
- No flood-to-road-segment linkage
- No dynamic rerouting logic
- Road status is hardcoded Python lists — not updated by any live source
- Settlement hazard uses fixed TALUKA_PROFILES, not live weather data
- No OSRM, Valhalla, GraphHopper, or NetworkX

### Key Infrastructure Constraints
- Windows development machine
- SQLite (no PostGIS available)
- No Docker confirmed (no Dockerfile found)
- Groq API key present (free tier)
- OpenWeatherMap API key present (free tier — 60 calls/min)
- Open-Meteo is free, no key required

---

## 2. Routing Engine Evaluation

| Criterion | OSRM | Valhalla | GraphHopper | NetworkX+osmnx |
|-----------|------|----------|-------------|----------------|
| Runs on Windows without Docker | No | No (C++ build) | JVM required | Yes (pip install) |
| Flood cost customization | No (rebuild required) | Partial (costing JSON) | Partial (custom model) | Full Python control |
| Hard road exclusions | No per-edge blocking | Yes via avoid_locations | Yes via avoid | Yes, remove edges |
| OSM data integration | Native | Native | Native | Via osmnx |
| Pune district scale performance | Fast | Fast | Fast | Adequate (<500ms) |
| RAM at district scale | 2-4 GB | 1-2 GB | 512MB-1GB | 200-400MB |
| Python integration | REST API only | REST API only | REST API only | Native Python |
| Setup complexity on Windows | High | High | Medium | Low |
| Dynamic edge weight update | Rebuild required | Restart required | Restart required | In-memory, instant |
| Existing in codebase | None | None | None | None |
| License | BSD | MIT | Apache 2.0 | BSD |

### Decision: NetworkX + osmnx

**Rationale:**

1. **Feasibility**: NetworkX + osmnx is the only option installable on Windows with `pip` in minutes. Valhalla and GraphHopper require significant infrastructure (Docker, JVM) absent from this project.

2. **Dynamic hazard integration**: NetworkX allows instant in-memory edge attribute mutation — setting flood penalties or removing confirmed-closed edges — without server restart or graph rebuild. This is architecturally essential for live rerouting.

3. **osmnx compatibility**: osmnx fetches the live OpenStreetMap road network for Pune District, converting it directly to a directed NetworkX DiGraph with geometries, speeds, and travel times.

4. **Scale adequacy**: Pune district has approximately 50-70k road segments. Dijkstra/A* completes in under 500ms in Python at this scale.

5. **Single routing engine**: We do NOT combine multiple routing engines. NetworkX handles all routing. OSRM public demo API is used as an optional baseline comparison only, with graceful fallback to speed * length if unavailable.

6. **No replacement of existing systems**: The existing hazard engine, settlement service, geocoding service, and weather service are all preserved and extended.

---

## 3. Data Flow Diagram

```
External Sources:
  [Open-Meteo API]    [OpenWeatherMap]    [RSS News Feeds]    [Mobile App]
        |                   |                    |                  |
        v                   v                    v                  v
  [weather_service]  [rainfall route]    [news_service]    [reports route]
        |                   |                    |                  |
        v                   |                    v                  v
  [Open-Meteo       [33-station         [LLM geocoding]    [AI analysis]
   hourly precip]    readings]               |                  |
        |                   |                    v                  v
        |                   |             [news DB table]   [reports DB table]
        |                   |                    |                  |
        +-------------------+---------+----------+------------------+
                                      |
                              [road_hazard.py] <--- [elevation data .npy]
                                      |
                              Maps observations to road segments via
                              spatial proximity (Shapely nearest)
                                      |
                              [road_graph.py]
                              NetworkX DiGraph
                              (loaded from OSM via osmnx)
                                      |
                              Each edge gets:
                              - baseline travel time
                              - flood_penalty (0.0 - inf)
                              - accessibility status
                              - evidence list
                              - last_updated timestamp
                                      |
                              [routing_service.py]
                              Hazard-weighted Dijkstra
                              Hard exclusion of CONFIRMED_BLOCKED
                                      |
                              [/api/route endpoint]
                                      |
                        +-------------+--------------+
                        |                            |
              [route polyline]             [hazard evidence]
              [distance/duration]          [confidence score]
              [alternative routes]         [affected segments]
                        |
              [Frontend polls every 4s]
                        |
                [MainHeroMap.tsx]
                Route layer + hazard overlays
```

---

## 4. Road Risk Model

### Edge Cost Formula

```
EdgeCost(e, t) = BaseTravelTime(e) * (1 + FloodPenaltyFactor(e, t))

FloodPenaltyFactor(e, t) =
  w_rain * RainfallRisk(e, t)       -- w=0.30
+ w_elev * ElevationRisk(e)         -- w=0.20
+ w_inc  * IncidentRisk(e, t)       -- w=0.40
+ w_hist * HistoricalFloodRisk(e)   -- w=0.10
```

Each component is normalized to [0.0, 1.0]. The penalty factor scales BaseTravelTime upward.

### Hard Safety Constraints (not penalty, but exclusion)

- Edges with status `CONFIRMED_BLOCKED` are **removed** from the graph before Dijkstra runs.
- Ground reports with `incident_type IN (flood, road_closed, submerged, bridge_collapsed)` within 300m and under 2 hours old trigger `status = SUSPECT`.
- SUSPECT edges are penalized with factor 2.0 (doubles cost).
- CONFIRMED_BLOCKED edges are removed entirely.
- If no safe path exists after exclusion, return explicit error: "No verified safe route available."

### Evidence Tiers

| Tier | Criteria | Routing effect |
|------|----------|----------------|
| CONFIRMED_BLOCKED | Official report OR verified ground report + AI image confirmation | Edge removed |
| CONFIRMED_PASSABLE | Recent official re-opening report | Penalty cleared |
| SUSPECT | Unverified flood report <2h, OR rainfall >30mm/1h AND elevation <20th percentile | 2x penalty |
| ELEVATED_RISK | rainfall >15mm/1h OR elevation <30th percentile | 0.5x penalty |
| PASSABLE | No adverse evidence | No penalty |

### Staleness Policy

- Reports older than 4 hours: penalty decays linearly to 50%.
- Reports older than 24 hours: penalty cleared; status reverts to PASSABLE unless refreshed by new observation.
- A road is not permanently closed by an expired report, but it is not automatically re-opened either — it returns to PASSABLE.

### Confidence Calculation

```python
confidence = min(0.40 + num_independent_sources * 0.15, 0.95)
```

Where `num_independent_sources` counts: rainfall data, elevation data, ground reports (clustered — multiple within 500m = 1 source), news reports, official closures. This prevents duplicate reports from inflating confidence.

### Route Safety Classification

- **SAFE**: No SUSPECT or BLOCKED segments on route, at least one data source active.
- **LOWEST_RISK_AVAILABLE**: Some SUSPECT segments present, no BLOCKED, this is the safest available path.
- **NO_VERIFIED_SAFE_ROUTE**: All paths intersect BLOCKED or SUSPECT segments; explicit warning returned.

---

## 5. Settlement Impact Assessment

The existing `priorities.py` settlement impact system is extended (not replaced):

1. Connectivity assessment: For each settlement, find all OSM edges providing access. If all access edges are CONFIRMED_BLOCKED → settlement is ISOLATED.
2. Population exposure: `affected_population = hazard_score * population` (existing formula retained).
3. Priority score formula (existing formula retained with road isolation bonus):
   ```
   priority = base_hazard_score * log10(population) / 7.0
            + (0.35 if isolated)
            + (0.20 if risk == CRITICAL)
            + (0.10 if risk == HIGH)
   ```
4. Each settlement result includes: evidence list, data source times, confidence, accessible_road_count, blocked_road_count.

---

## 6. Dynamic Rerouting

Since there is no persistent WebSocket infrastructure, rerouting works through the existing 4-second poll cycle:

1. A new ground report or news article is ingested.
2. `road_hazard.py` updates affected edge states in the in-memory graph.
3. The route state is checked: if active route intersects a newly-blocked edge, a reroute flag is set.
4. Next time frontend polls `/api/route` with the same origin/destination, the response includes `rerouted: true` and `reroute_reason: "Road blocked by new report"`.
5. Frontend displays the reroute notification.

Update frequency is bounded by: data source latency (OpenWeatherMap 5-min cache, ground reports near-instant), poll interval (4s), and route recalculation time (<500ms).

---

## 7. Implementation Plan

### Phase 1: Backend Road Graph and Routing (Core)
- `backend/requirements.txt` — add networkx, osmnx
- `backend/services/road_graph.py` — OSM graph loader, pickle cache, hazard edge updater
- `backend/services/routing_service.py` — hazard-weighted Dijkstra, route builder, evidence collector
- `backend/routes/routing.py` — `/api/route`, `/api/route/road-status`, `/api/route/hazard-segments`
- `backend/services/db.py` — add `road_segment_state` table for persistence

### Phase 2: Road Hazard Processor
- `backend/services/road_hazard.py` — spatial matching (reports/news → nearest edges), rainfall→edge scorer, staleness decay

### Phase 3: Frontend Integration
- `frontend/src/app/page.tsx` — add route planner state, real API calls
- `frontend/src/components/map/MainHeroMap.tsx` — hazard-aware route display
- `frontend/src/types/prototype.ts` — extend RouteOption type

### Phase 4: Tests
- `tests/test_routing.py` — 10 scenario tests covering all required cases

### Dependencies Added
```
networkx>=3.2
osmnx>=1.9.0
```

---

## 8. Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| No PostGIS | Spatial queries slower at scale | Shapely is adequate for Pune district |
| No WebSocket push | Rerouting notified on next poll (4s delay) | Acceptable for emergency response timescale |
| SRTM 30m resolution | Cannot resolve individual drainage channels | Used only as risk factor, not flood depth |
| Rainfall station interpolation: nearest-station only | Uncertainty between stations | Documented in evidence output |
| OSM graph may miss private roads | Some access routes not modeled | Out-of-scope; use official road data if available |
| Historical flood data: 9 events | Very limited calibration | Labeled as heuristic, not calibrated probability |
| osmnx downloads ~50MB of OSM data on first run | First startup is slow | Graph cached to pickle file after first download |
