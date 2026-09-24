"""Hazard Engine Service Interface.

This module establishes the interface and contract for the composite flood hazard engine.
The scoring algorithm, feature weights, and risk classification logic will be implemented
in upcoming development milestones.
"""

from backend.models.schemas import HazardInput, HazardOutput


def calculate_hazard_score(hazard_input: HazardInput) -> HazardOutput:
    """Calculate the composite hazard score and risk classification for a given location.

    NOTE: This is a placeholder interface definition. Algorithmic scoring logic is NOT
    implemented in this milestone.

    The future hazard model will consider:
        1. Rainfall Intensity (rainfall_1h): Captures rapid flash-flood trigger conditions.
        2. Cumulative Rainfall (rainfall_24h & rainfall_72h): Evaluates sustained ground saturation.
        3. Terrain Susceptibility (terrain_susceptibility): Accounts for SRTM elevation, slope, and catchment accumulation.
        4. Proximity to Historical Flood Zones (historical_flood_proximity): Incorporates empirical past inundation evidence.

    Weights, thresholds, and evidence determination are intentionally deferred to avoid
    premature or fabricated algorithmic claims.

    Args:
        hazard_input: Validated HazardInput object containing location, rainfall, terrain,
                      and flood proximity observations.

    Returns:
        HazardOutput: Expected output containing composite hazard_score (0.0 to 1.0),
                      risk_level ('LOW', 'MODERATE', 'HIGH', 'CRITICAL'), and evidence tags.

    Raises:
        NotImplementedError: Raised because the scoring algorithm has not yet been implemented.
    """
    raise NotImplementedError(
        "The hazard scoring algorithm has not been implemented yet. "
        "This function defines the contract for future model integration."
    )
