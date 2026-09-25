"""Hazard Engine Service.

This module implements the deterministic, explainable multi-factor flood hazard engine.
It computes a normalized composite hazard score [0.0 - 1.0], categorical risk levels,
contributing evidence factors, and component score breakdowns from validated HazardInput.
"""

from dataclasses import dataclass
import math
from typing import Dict, List, Optional

from backend.config import Config
from backend.models.schemas import HazardInput, HazardOutput
from backend.services.rainfall_service import (
    RainfallNormalizationConfig,
    normalize_rainfall_1h,
    normalize_rainfall_24h,
    normalize_rainfall_72h,
)


@dataclass(frozen=True)
class HazardWeights:
    """Configurable weights for the multi-factor composite hazard scoring formula.

    All weights must be non-negative and sum to 1.0.

    Attributes:
        weight_rainfall_1h: Short-term rainfall intensity weight (flash-flood trigger).
        weight_rainfall_24h: Intermediate 24h accumulation weight.
        weight_rainfall_72h: Prolonged 72h saturation index weight.
        weight_terrain: Terrain susceptibility weight (slope, elevation).
        weight_historical: Historical flood zone proximity weight.
    """
    weight_rainfall_1h: float = Config.HAZARD_WEIGHT_RAINFALL_1H
    weight_rainfall_24h: float = Config.HAZARD_WEIGHT_RAINFALL_24H
    weight_rainfall_72h: float = Config.HAZARD_WEIGHT_RAINFALL_72H
    weight_terrain: float = Config.HAZARD_WEIGHT_TERRAIN
    weight_historical: float = Config.HAZARD_WEIGHT_HISTORICAL

    def __post_init__(self) -> None:
        """Validate that all weights are non-negative and sum to 1.0."""
        weights = [
            self.weight_rainfall_1h,
            self.weight_rainfall_24h,
            self.weight_rainfall_72h,
            self.weight_terrain,
            self.weight_historical,
        ]
        for w in weights:
            if w < 0.0:
                raise ValueError(f"Hazard weight cannot be negative: {w}")
        total = math.fsum(weights)
        if not math.isclose(total, 1.0, rel_tol=1e-4, abs_tol=1e-4):
            raise ValueError(f"Hazard weights must sum to 1.0, got {total}")


@dataclass(frozen=True)
class RiskThresholds:
    """Configurable cutoffs for categorizing composite hazard scores into qualitative risk tiers.

    Attributes:
        moderate_threshold: Boundary where risk escalates from LOW to MODERATE.
        high_threshold: Boundary where risk escalates from MODERATE to HIGH.
        critical_threshold: Boundary where risk escalates from HIGH to CRITICAL.
    """
    moderate_threshold: float = Config.HAZARD_RISK_MODERATE_THRESHOLD
    high_threshold: float = Config.HAZARD_RISK_HIGH_THRESHOLD
    critical_threshold: float = Config.HAZARD_RISK_CRITICAL_THRESHOLD

    def __post_init__(self) -> None:
        """Validate monotonic ordering of risk thresholds within (0.0, 1.0]."""
        if not (0.0 < self.moderate_threshold < self.high_threshold < self.critical_threshold <= 1.0):
            raise ValueError(
                f"Invalid risk thresholds: must satisfy 0.0 < moderate ({self.moderate_threshold}) "
                f"< high ({self.high_threshold}) < critical ({self.critical_threshold}) <= 1.0."
            )


def classify_risk_level(hazard_score: float, thresholds: RiskThresholds) -> str:
    """Classify a normalized hazard score into a categorical risk tier.

    Tiers:
        - [0.0, moderate_threshold): 'LOW'
        - [moderate_threshold, high_threshold): 'MODERATE'
        - [high_threshold, critical_threshold): 'HIGH'
        - [critical_threshold, 1.0]: 'CRITICAL'

    Args:
        hazard_score: Computed composite hazard score in [0.0, 1.0].
        thresholds: RiskThresholds configuration instance.

    Returns:
        Qualitative tier label string.
    """
    if hazard_score < thresholds.moderate_threshold:
        return "LOW"
    elif hazard_score < thresholds.high_threshold:
        return "MODERATE"
    elif hazard_score < thresholds.critical_threshold:
        return "HIGH"
    return "CRITICAL"


def generate_hazard_evidence(
    component_scores: Dict[str, float],
    evidence_threshold: float = 0.60,
) -> List[str]:
    """Generate deterministic explainability evidence tags from component scores.

    Identifies primary contributing environmental and spatial indicators that meet
    or exceed the evidence threshold.

    Args:
        component_scores: Dictionary of normalized component factor scores in [0.0, 1.0].
        evidence_threshold: Threshold above which a component is considered a significant hazard factor.

    Returns:
        List of human- and machine-readable evidence tags.
    """
    evidence: List[str] = []

    # Check rainfall factors
    if component_scores.get("rainfall_1h", 0.0) >= evidence_threshold:
        evidence.append("high_1h_rainfall")
    if component_scores.get("rainfall_24h", 0.0) >= evidence_threshold:
        evidence.append("high_24h_rainfall")
    if component_scores.get("rainfall_72h", 0.0) >= evidence_threshold:
        evidence.append("high_72h_rainfall")

    # Check terrain susceptibility
    if component_scores.get("terrain_susceptibility", 0.0) >= evidence_threshold:
        evidence.append("high_terrain_susceptibility")

    # Check proximity to historical flood zones
    if component_scores.get("historical_flood_proximity", 0.0) >= evidence_threshold:
        evidence.append("near_historical_flood_zone")

    return evidence


def calculate_hazard_score(
    hazard_input: HazardInput,
    weights: Optional[HazardWeights] = None,
    normalization_config: Optional[RainfallNormalizationConfig] = None,
    risk_thresholds: Optional[RiskThresholds] = None,
    evidence_threshold: float = 0.60,
) -> HazardOutput:
    """Calculate the composite hazard score, risk tier, and explainability evidence for a location.

    Formula:
        hazard_score = (
            w_1h   * norm(rainfall_1h) +
            w_24h  * norm(rainfall_24h) +
            w_72h  * norm(rainfall_72h) +
            w_terr * terrain_susceptibility +
            w_hist * historical_flood_proximity
        )

    The calculation is entirely deterministic, transparent, and bounded within [0.0, 1.0].
    No non-deterministic models or LLMs are involved in numerical evaluation.

    Args:
        hazard_input: Validated HazardInput object containing location, rainfall, terrain,
                      and flood proximity observations.
        weights: Optional custom HazardWeights configuration.
        normalization_config: Optional custom RainfallNormalizationConfig.
        risk_thresholds: Optional custom RiskThresholds configuration.
        evidence_threshold: Contribution cutoff for evidence tagging (default 0.60).

    Returns:
        HazardOutput: Computed composite hazard_score (0.0 to 1.0),
                      risk_level ('LOW', 'MODERATE', 'HIGH', 'CRITICAL'),
                      evidence tags, and component_scores breakdown.

    Raises:
        ValueError: If hazard_input is None or fails validation constraints.
    """
    if hazard_input is None:
        raise ValueError("calculate_hazard_score requires a valid HazardInput object, got None.")

    if not isinstance(hazard_input, HazardInput):
        raise ValueError(
            f"Expected HazardInput instance, got {type(hazard_input).__name__}."
        )

    # Enforce strict input validation (no silent missing/zero coercion)
    hazard_input.validate()

    w = weights or HazardWeights()
    norm_cfg = normalization_config or RainfallNormalizationConfig()
    thresholds = risk_thresholds or RiskThresholds()

    # 1. Normalize physical rainfall inputs to [0.0, 1.0]
    norm_1h = normalize_rainfall_1h(hazard_input.rainfall_1h, norm_cfg)
    norm_24h = normalize_rainfall_24h(hazard_input.rainfall_24h, norm_cfg)
    norm_72h = normalize_rainfall_72h(hazard_input.rainfall_72h, norm_cfg)

    # 2. Extract already normalized terrain and historical indicators [0.0, 1.0]
    norm_terrain = float(hazard_input.terrain_susceptibility)
    norm_historical = float(hazard_input.historical_flood_proximity)

    component_scores: Dict[str, float] = {
        "rainfall_1h": norm_1h,
        "rainfall_24h": norm_24h,
        "rainfall_72h": norm_72h,
        "terrain_susceptibility": round(norm_terrain, 4),
        "historical_flood_proximity": round(norm_historical, 4),
    }

    # 3. Compute weighted linear composite hazard score
    raw_score = (
        w.weight_rainfall_1h * norm_1h
        + w.weight_rainfall_24h * norm_24h
        + w.weight_rainfall_72h * norm_72h
        + w.weight_terrain * norm_terrain
        + w.weight_historical * norm_historical
    )

    # 4. Strict boundary clamping to [0.0, 1.0]
    clamped_score = max(0.0, min(1.0, raw_score))
    hazard_score = round(clamped_score, 4)

    # 5. Categorize risk tier
    risk_level = classify_risk_level(hazard_score, thresholds)

    # 6. Generate explainability evidence
    evidence = generate_hazard_evidence(component_scores, evidence_threshold=evidence_threshold)

    return HazardOutput(
        hazard_score=hazard_score,
        risk_level=risk_level,
        evidence=evidence,
        component_scores=component_scores,
    )
