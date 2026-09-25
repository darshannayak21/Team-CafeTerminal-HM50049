"""Settlement Impact Service.

Computes real population exposure impact from environmental hazard scoring:
    settlement_impact = hazard_score * population

This module is deterministic, contains zero LLM/statistical heuristics,
and strictly preserves the underlying hazard-engine calculation contracts.
"""

from typing import Dict, List, Union
import math

from backend.models.schemas import HazardOutput, Settlement, SettlementImpact


def calculate_settlement_impact(
    settlement: Settlement,
    hazard_score_or_output: Union[float, int, HazardOutput],
) -> SettlementImpact:
    """Calculate the settlement impact for a single settlement.

    Formula:
        settlement_impact = hazard_score * population

    Args:
        settlement: Validated Settlement instance with real population count.
        hazard_score_or_output: Normalized hazard score [0.0, 1.0] or HazardOutput instance.

    Returns:
        SettlementImpact instance.

    Raises:
        ValueError: If settlement is invalid, hazard score is non-numeric,
                    outside [0.0, 1.0], or NaN.
    """
    if settlement is None or not isinstance(settlement, Settlement):
        raise ValueError("calculate_settlement_impact requires a valid Settlement instance.")
    settlement.validate()

    if isinstance(hazard_score_or_output, HazardOutput):
        score = hazard_score_or_output.hazard_score
    elif isinstance(hazard_score_or_output, (int, float)):
        score = float(hazard_score_or_output)
    else:
        raise ValueError(
            f"Hazard score must be a number or HazardOutput, got {type(hazard_score_or_output).__name__}."
        )

    if math.isnan(score) or math.isinf(score):
        raise ValueError(f"Hazard score cannot be NaN or infinite: {score}")

    if not (0.0 <= score <= 1.0):
        raise ValueError(f"Hazard score must be within [0.0, 1.0], got {score}")

    impact_val = score * settlement.population

    impact = SettlementImpact(
        settlement_id=settlement.settlement_id,
        settlement_name=settlement.name,
        population=settlement.population,
        hazard_score=score,
        settlement_impact=impact_val,
        taluka=settlement.taluka,
    )
    impact.validate()
    return impact


def calculate_settlements_impact(
    settlements: List[Settlement],
    hazard: Union[float, int, HazardOutput, Dict[str, Union[float, int, HazardOutput]]],
) -> List[SettlementImpact]:
    """Calculate settlement impact for a collection of settlements.

    Supports either a uniform hazard evaluation applied across all settlements,
    or a per-settlement mapping keyed by `settlement_id`.

    Args:
        settlements: List of Settlement instances.
        hazard: Uniform hazard score / HazardOutput, or dict mapping settlement_id -> hazard.

    Returns:
        List of computed SettlementImpact instances in original order.

    Raises:
        ValueError: If settlements is empty, contains non-Settlement items,
                    or if a settlement_id is missing from a per-settlement hazard map.
    """
    if not isinstance(settlements, list):
        raise ValueError("Settlements must be provided as a list.")

    results: List[SettlementImpact] = []
    if isinstance(hazard, dict):
        for s in settlements:
            if s.settlement_id not in hazard:
                raise ValueError(
                    f"Settlement '{s.settlement_id}' has no matching hazard entry in the hazard map."
                )
            results.append(calculate_settlement_impact(s, hazard[s.settlement_id]))
    else:
        for s in settlements:
            results.append(calculate_settlement_impact(s, hazard))

    return results


def sort_settlements_by_impact(
    impacts: List[SettlementImpact],
    descending: bool = True,
) -> List[SettlementImpact]:
    """Sort settlements deterministically by settlement impact score.

    Uses `settlement_id` as a secondary tie-breaker to guarantee 100% deterministic
    ordering across repeated executions.

    Args:
        impacts: List of SettlementImpact instances.
        descending: If True (default), sorts from highest impact to lowest.

    Returns:
        New list of sorted SettlementImpact instances.
    """
    if not isinstance(impacts, list):
        raise ValueError("Impacts must be provided as a list.")

    for item in impacts:
        if not isinstance(item, SettlementImpact):
            raise ValueError("All items in impacts list must be SettlementImpact instances.")

    if descending:
        return sorted(impacts, key=lambda x: (-x.settlement_impact, x.settlement_id))
    return sorted(impacts, key=lambda x: (x.settlement_impact, x.settlement_id))


def load_settlements_from_file(file_path: str) -> List[Settlement]:
    """Load and validate settlement objects from a JSON file.

    Args:
        file_path: Path to settlements JSON file (e.g. data/processed/pune_settlements.json).

    Returns:
        List of validated Settlement instances.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If file is malformed or records fail schema validation.
    """
    import json
    import os

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Settlements file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    raw_list = data.get("settlements") if isinstance(data, dict) and "settlements" in data else data
    if not isinstance(raw_list, list):
        raise ValueError(f"Expected a list of settlements in '{file_path}'.")

    settlements = [Settlement.from_dict(item) for item in raw_list]
    return settlements
