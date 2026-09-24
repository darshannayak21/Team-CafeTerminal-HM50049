"""Normalization utilities for scaling numerical values to a standard 0–1 range.

This module provides reusable normalization functions for scaling raw physical measurements
(such as rainfall depths, terrain elevation/slopes, and spatial proximities) into unit intervals [0.0, 1.0].
"""


def normalize(
    value: float,
    minimum: float,
    maximum: float,
    clip: bool = True,
    default_on_zero_range: float = 0.0,
) -> float:
    """Normalize a numerical value to a [0.0, 1.0] range using min-max scaling.

    Formula:
        normalized = (value - minimum) / (maximum - minimum)

    Expected Behavior:
        - When minimum < maximum: Computes linear proportion of `value` within [minimum, maximum].
        - When minimum == maximum (zero range / potential division-by-zero): Avoids division by zero
          and safely returns `default_on_zero_range` (defaults to 0.0).
        - When minimum > maximum: Raises ValueError because the upper bound must not be less than the lower bound.
        - When clip is True (default): Clamps output to ensure the returned value lies strictly within [0.0, 1.0],
          even if `value` falls below `minimum` or exceeds `maximum`.
        - When clip is False: Returns the unconstrained linear scale, permitting values < 0.0 or > 1.0.

    Args:
        value: The numerical value to be normalized.
        minimum: The baseline lower boundary (maps to 0.0).
        maximum: The threshold upper boundary (maps to 1.0).
        clip: If True, constrain result to [0.0, 1.0]. Defaults to True.
        default_on_zero_range: Value to return if minimum == maximum. Defaults to 0.0.

    Returns:
        float: Normalized representation of value in [0.0, 1.0].

    Raises:
        ValueError: If minimum > maximum.
    """
    if minimum > maximum:
        raise ValueError(
            f"Invalid normalization range: minimum ({minimum}) cannot be greater than maximum ({maximum})."
        )

    range_span = maximum - minimum
    if range_span == 0.0:
        return default_on_zero_range

    scaled = (value - minimum) / range_span

    if clip:
        if scaled < 0.0:
            return 0.0
        if scaled > 1.0:
            return 1.0

    return scaled
