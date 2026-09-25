"""Rainfall metrics extraction, accumulation, and normalization service.

This module processes parsed precipitation observations (from HourlyPrecipitationData
or numerical series) to compute deterministic 1h, 24h, and 72h rainfall statistics,
and provides standardized normalization utilities to scale physical measurements to [0.0, 1.0].
"""

from dataclasses import dataclass
import math
from typing import Dict, List, Optional, Sequence, Union

from backend.config import Config
from backend.models.schemas import HazardInput, HourlyPrecipitationData, Location, RainfallMetrics
from backend.utils.normalization import normalize


@dataclass(frozen=True)
class RainfallNormalizationConfig:
    """Configurable baseline thresholds for normalizing rainfall metrics to [0.0, 1.0].

    Attributes:
        min_1h_mm: Baseline minimum for 1h rainfall in mm (maps to 0.0).
        max_1h_mm: Ceiling maximum for 1h rainfall in mm (maps to 1.0).
        min_24h_mm: Baseline minimum for 24h rainfall in mm (maps to 0.0).
        max_24h_mm: Ceiling maximum for 24h rainfall in mm (maps to 1.0).
        min_72h_mm: Baseline minimum for 72h rainfall in mm (maps to 0.0).
        max_72h_mm: Ceiling maximum for 72h rainfall in mm (maps to 1.0).
    """
    min_1h_mm: float = Config.RAINFALL_1H_MIN_MM
    max_1h_mm: float = Config.RAINFALL_1H_MAX_MM
    min_24h_mm: float = Config.RAINFALL_24H_MIN_MM
    max_24h_mm: float = Config.RAINFALL_24H_MAX_MM
    min_72h_mm: float = Config.RAINFALL_72H_MIN_MM
    max_72h_mm: float = Config.RAINFALL_72H_MAX_MM

    def __post_init__(self) -> None:
        """Validate that all upper bounds strictly exceed lower bounds."""
        for window, min_val, max_val in [
            ("1h", self.min_1h_mm, self.max_1h_mm),
            ("24h", self.min_24h_mm, self.max_24h_mm),
            ("72h", self.min_72h_mm, self.max_72h_mm),
        ]:
            if min_val < 0.0:
                raise ValueError(f"Normalization minimum for {window} cannot be negative: {min_val}")
            if min_val >= max_val:
                raise ValueError(
                    f"Normalization minimum for {window} ({min_val}) must be strictly less than maximum ({max_val})."
                )


def validate_precipitation_series(series: Sequence[float], min_length: int = 1) -> None:
    """Validate that a precipitation series contains valid non-negative numbers and sufficient length.

    Args:
        series: Sequence of hourly precipitation measurements in mm.
        min_length: Minimum required observation count.

    Raises:
        ValueError: If series is empty, contains None/NaN/inf, contains negative values,
                    or has fewer elements than min_length.
    """
    if series is None:
        raise ValueError("Precipitation series cannot be None.")

    if not isinstance(series, (list, tuple)):
        raise ValueError(f"Precipitation series must be a list or tuple, got {type(series).__name__}.")

    if len(series) < min_length:
        raise ValueError(
            f"Precipitation series has insufficient observations: required at least {min_length}, got {len(series)}."
        )

    for idx, val in enumerate(series):
        if val is None or not isinstance(val, (int, float)):
            raise ValueError(f"Precipitation value at index {idx} must be a non-null number, got {val}.")
        if math.isnan(val) or math.isinf(val):
            raise ValueError(f"Precipitation value at index {idx} is invalid (NaN or Inf).")
        if val < 0.0:
            raise ValueError(f"Precipitation value at index {idx} cannot be negative: {val} mm.")


def _extract_series(data: Union[HourlyPrecipitationData, Sequence[float]]) -> List[float]:
    """Extract and validate the raw precipitation list from input data.

    Args:
        data: Either an HourlyPrecipitationData instance or a sequence of float precipitation values.

    Returns:
        List of verified float values.

    Raises:
        ValueError: If input format is invalid.
    """
    if isinstance(data, HourlyPrecipitationData):
        series = data.precipitation
    elif isinstance(data, (list, tuple)):
        series = list(data)
    else:
        raise ValueError(
            f"Expected HourlyPrecipitationData or Sequence[float], got {type(data).__name__}."
        )
    return series


def _resolve_end_index(series: List[float], end_index: Optional[int]) -> int:
    """Resolve and bounds-check the target ending index in the series.

    Args:
        series: The precipitation series list.
        end_index: Optional 0-based or negative index. Defaults to the last element (-1).

    Returns:
        Resolved non-negative index in range [0, len(series) - 1].

    Raises:
        IndexError: If end_index is out of bounds for the series.
    """
    if end_index is None:
        return len(series) - 1

    if not isinstance(end_index, int):
        raise ValueError(f"end_index must be an integer, got {type(end_index).__name__}.")

    n = len(series)
    resolved = end_index if end_index >= 0 else n + end_index

    if resolved < 0 or resolved >= n:
        raise IndexError(
            f"end_index {end_index} is out of bounds for precipitation series of length {n}."
        )

    return resolved


def calculate_1h_rainfall(
    data: Union[HourlyPrecipitationData, Sequence[float]],
    end_index: Optional[int] = None,
) -> float:
    """Extract the 1-hour rainfall observation at the specified index.

    Args:
        data: HourlyPrecipitationData or sequence of hourly rainfall in mm.
        end_index: Target index (defaults to the latest available observation).

    Returns:
        1-hour rainfall in mm, rounded to 2 decimal places.

    Raises:
        ValueError: If series is empty or contains invalid numbers.
        IndexError: If end_index is out of range.
    """
    series = _extract_series(data)
    validate_precipitation_series(series, min_length=1)
    resolved_idx = _resolve_end_index(series, end_index)
    return round(float(series[resolved_idx]), 2)


def calculate_24h_rainfall(
    data: Union[HourlyPrecipitationData, Sequence[float]],
    end_index: Optional[int] = None,
) -> float:
    """Calculate the 24-hour cumulative rainfall ending at the specified index.

    Args:
        data: HourlyPrecipitationData or sequence of hourly rainfall in mm.
        end_index: Target ending index (defaults to the latest available observation).

    Returns:
        Cumulative 24-hour rainfall in mm, rounded to 2 decimal places.

    Raises:
        ValueError: If series contains invalid data or fewer than 24 observations up to end_index.
        IndexError: If end_index is out of range.
    """
    series = _extract_series(data)
    validate_precipitation_series(series, min_length=1)
    resolved_idx = _resolve_end_index(series, end_index)

    if resolved_idx < 23:
        raise ValueError(
            f"Insufficient hourly data for 24h rainfall: required at least 24 observations up to index {resolved_idx}, found {resolved_idx + 1}."
        )

    window = series[resolved_idx - 23 : resolved_idx + 1]
    return round(float(math.fsum(window)), 2)


def calculate_72h_rainfall(
    data: Union[HourlyPrecipitationData, Sequence[float]],
    end_index: Optional[int] = None,
) -> float:
    """Calculate the 72-hour cumulative rainfall ending at the specified index.

    Args:
        data: HourlyPrecipitationData or sequence of hourly rainfall in mm.
        end_index: Target ending index (defaults to the latest available observation).

    Returns:
        Cumulative 72-hour rainfall in mm, rounded to 2 decimal places.

    Raises:
        ValueError: If series contains invalid data or fewer than 72 observations up to end_index.
        IndexError: If end_index is out of range.
    """
    series = _extract_series(data)
    validate_precipitation_series(series, min_length=1)
    resolved_idx = _resolve_end_index(series, end_index)

    if resolved_idx < 71:
        raise ValueError(
            f"Insufficient hourly data for 72h rainfall: required at least 72 observations up to index {resolved_idx}, found {resolved_idx + 1}."
        )

    window = series[resolved_idx - 71 : resolved_idx + 1]
    return round(float(math.fsum(window)), 2)


def calculate_rainfall_metrics(
    data: HourlyPrecipitationData,
    end_index: Optional[int] = None,
) -> RainfallMetrics:
    """Compute 1h, 24h, and 72h rainfall statistics from an HourlyPrecipitationData object.

    Args:
        data: Validated HourlyPrecipitationData observation contract.
        end_index: Target index (defaults to latest available observation).

    Returns:
        Structured RainfallMetrics contract.

    Raises:
        ValueError: If series data is missing, invalid, or contains fewer than 72 observations.
        IndexError: If end_index is out of range.
    """
    if not isinstance(data, HourlyPrecipitationData):
        raise ValueError(
            f"calculate_rainfall_metrics requires HourlyPrecipitationData, got {type(data).__name__}."
        )

    r_1h = calculate_1h_rainfall(data, end_index=end_index)
    r_24h = calculate_24h_rainfall(data, end_index=end_index)
    r_72h = calculate_72h_rainfall(data, end_index=end_index)

    return RainfallMetrics(
        rainfall_1h=r_1h,
        rainfall_24h=r_24h,
        rainfall_72h=r_72h,
    )


def normalize_rainfall_1h(
    rainfall_mm: float,
    config: Optional[RainfallNormalizationConfig] = None,
) -> float:
    """Normalize a 1-hour rainfall measurement into [0.0, 1.0]."""
    if rainfall_mm is None or not isinstance(rainfall_mm, (int, float)):
        raise ValueError("rainfall_mm must be a non-null number.")
    if rainfall_mm < 0.0:
        raise ValueError(f"Rainfall cannot be negative: {rainfall_mm}")

    cfg = config or RainfallNormalizationConfig()
    return round(normalize(rainfall_mm, cfg.min_1h_mm, cfg.max_1h_mm, clip=True), 4)


def normalize_rainfall_24h(
    rainfall_mm: float,
    config: Optional[RainfallNormalizationConfig] = None,
) -> float:
    """Normalize a 24-hour cumulative rainfall measurement into [0.0, 1.0]."""
    if rainfall_mm is None or not isinstance(rainfall_mm, (int, float)):
        raise ValueError("rainfall_mm must be a non-null number.")
    if rainfall_mm < 0.0:
        raise ValueError(f"Rainfall cannot be negative: {rainfall_mm}")

    cfg = config or RainfallNormalizationConfig()
    return round(normalize(rainfall_mm, cfg.min_24h_mm, cfg.max_24h_mm, clip=True), 4)


def normalize_rainfall_72h(
    rainfall_mm: float,
    config: Optional[RainfallNormalizationConfig] = None,
) -> float:
    """Normalize a 72-hour cumulative rainfall measurement into [0.0, 1.0]."""
    if rainfall_mm is None or not isinstance(rainfall_mm, (int, float)):
        raise ValueError("rainfall_mm must be a non-null number.")
    if rainfall_mm < 0.0:
        raise ValueError(f"Rainfall cannot be negative: {rainfall_mm}")

    cfg = config or RainfallNormalizationConfig()
    return round(normalize(rainfall_mm, cfg.min_72h_mm, cfg.max_72h_mm, clip=True), 4)


def normalize_rainfall_metrics(
    metrics: RainfallMetrics,
    config: Optional[RainfallNormalizationConfig] = None,
) -> Dict[str, float]:
    """Normalize all three rainfall metrics in RainfallMetrics to a [0.0, 1.0] scale.

    Args:
        metrics: RainfallMetrics instance containing physical measurements in mm.
        config: Optional custom normalization configuration.

    Returns:
        Dictionary mapping metric names to normalized scores in [0.0, 1.0].
    """
    if not isinstance(metrics, RainfallMetrics):
        raise ValueError(f"Expected RainfallMetrics, got {type(metrics).__name__}.")

    cfg = config or RainfallNormalizationConfig()
    return {
        "rainfall_1h": normalize_rainfall_1h(metrics.rainfall_1h, cfg),
        "rainfall_24h": normalize_rainfall_24h(metrics.rainfall_24h, cfg),
        "rainfall_72h": normalize_rainfall_72h(metrics.rainfall_72h, cfg),
    }


def create_hazard_input_from_weather(
    weather_data: HourlyPrecipitationData,
    terrain_susceptibility: float,
    historical_flood_proximity: float,
    end_index: Optional[int] = None,
) -> HazardInput:
    """Bridge weather observations and spatial factors into a validated HazardInput contract.

    Args:
        weather_data: Parsed HourlyPrecipitationData containing at least 72 observations.
        terrain_susceptibility: Normalized terrain factor [0.0 - 1.0].
        historical_flood_proximity: Normalized historical flood proximity factor [0.0 - 1.0].
        end_index: Optional observation target index (defaults to latest available).

    Returns:
        HazardInput instance ready for hazard engine evaluation.

    Raises:
        ValueError: If weather series has insufficient observations or factors are invalid.
    """
    metrics = calculate_rainfall_metrics(weather_data, end_index=end_index)

    hazard_input = HazardInput(
        location=Location(lat=weather_data.latitude, lon=weather_data.longitude),
        rainfall_1h=metrics.rainfall_1h,
        rainfall_24h=metrics.rainfall_24h,
        rainfall_72h=metrics.rainfall_72h,
        terrain_susceptibility=float(terrain_susceptibility),
        historical_flood_proximity=float(historical_flood_proximity),
    )
    hazard_input.validate()
    return hazard_input
