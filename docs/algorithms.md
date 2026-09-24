# Algorithms and Intelligence

## Normalization Utility (`backend/utils/normalization.py`)

Feature scaling is handled by a standard min-max normalization routine designed to scale physical environmental observations into a bounded unit interval $[0.0, 1.0]$:

$$\text{normalized} = \frac{\text{value} - \text{minimum}}{\text{maximum} - \text{minimum}}$$

### Algorithmic Safeguards:
- **Zero-Range Protection:** When $\text{minimum} == \text{maximum}$, division-by-zero is avoided and a configurable baseline (default `0.0`) is returned.
- **Boundary Clamping:** Outliers exceeding specified bounds are clamped to $[0.0, 1.0]$ when `clip=True`.
- **Validation:** Enforces that $\text{minimum} \le \text{maximum}$, raising a `ValueError` otherwise.

## Hazard Engine Interface (`backend/services/hazard_engine.py`)

The hazard engine interface is defined via `calculate_hazard_score(hazard_input: HazardInput) -> HazardOutput`.

### Planned Model Inputs:
1. **Rainfall Intensity (`rainfall_1h`):** Short-duration precipitation rate in mm/h.
2. **Cumulative Precipitation (`rainfall_24h`, `rainfall_72h`):** Multi-day ground saturation indicators.
3. **Terrain Susceptibility (`terrain_susceptibility`):** Normalized factor derived from digital elevation models (slope, low-lying sinks).
4. **Historical Flood Proximity (`historical_flood_proximity`):** Proximity factor to past verified flood events.

*Status: The composite scoring weights, threshold calibration, and evidence tagging algorithms have not yet been implemented. No mock or fabricated scoring logic is active.*
