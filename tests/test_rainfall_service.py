"""Unit tests for rainfall metrics calculation, aggregation, and normalization service."""

import json
import math
import os
import unittest

from backend.models.schemas import HourlyPrecipitationData, Location, RainfallMetrics
from backend.services.rainfall_service import (
    RainfallNormalizationConfig,
    calculate_1h_rainfall,
    calculate_24h_rainfall,
    calculate_72h_rainfall,
    calculate_rainfall_metrics,
    create_hazard_input_from_weather,
    normalize_rainfall_1h,
    normalize_rainfall_24h,
    normalize_rainfall_72h,
    normalize_rainfall_metrics,
    validate_precipitation_series,
)
from backend.services.hazard_engine import calculate_hazard_score


class TestRainfallCalculations(unittest.TestCase):
    """Unit tests for 1h, 24h, and 72h rainfall calculations."""

    def setUp(self):
        # 72 hours of synthetic predictable rainfall: 1.0 mm for first 24h, 2.0 mm for next 24h, 3.0 mm for last 24h
        self.series_72 = [1.0] * 24 + [2.0] * 24 + [3.0] * 24
        self.timestamps_72 = [f"2026-09-01T{h:02d}:00" for h in range(72)]
        self.weather_72 = HourlyPrecipitationData(
            latitude=18.5204,
            longitude=73.8567,
            timestamps=self.timestamps_72,
            precipitation=self.series_72,
        )

    def test_calculate_1h_rainfall_default_latest(self):
        """calculate_1h_rainfall returns the latest observation when end_index is None."""
        val = calculate_1h_rainfall(self.series_72)
        self.assertEqual(val, 3.0)

        # Also works directly with HourlyPrecipitationData
        val_from_obj = calculate_1h_rainfall(self.weather_72)
        self.assertEqual(val_from_obj, 3.0)

    def test_calculate_1h_rainfall_specific_index(self):
        """calculate_1h_rainfall returns the correct observation at an explicit index."""
        # Index 10 is in the first 24h block (1.0 mm)
        self.assertEqual(calculate_1h_rainfall(self.series_72, end_index=10), 1.0)
        # Index 30 is in the second 24h block (2.0 mm)
        self.assertEqual(calculate_1h_rainfall(self.series_72, end_index=30), 2.0)
        # Negative index (-1 is last element)
        self.assertEqual(calculate_1h_rainfall(self.series_72, end_index=-1), 3.0)

    def test_calculate_1h_rainfall_single_element_series(self):
        """calculate_1h_rainfall operates successfully on a 1-element series."""
        self.assertEqual(calculate_1h_rainfall([12.5]), 12.5)

    def test_calculate_24h_rainfall_exact_24_hours(self):
        """calculate_24h_rainfall calculates exact cumulative sum for 24-element series."""
        series_24 = [2.5] * 24
        result = calculate_24h_rainfall(series_24)
        self.assertAlmostEqual(result, 60.0, places=2)

    def test_calculate_24h_rainfall_sub_window(self):
        """calculate_24h_rainfall correctly sums the trailing 24 hours up to end_index."""
        # Last 24 hours of series_72 are all 3.0 mm (24 * 3.0 = 72.0 mm)
        result_latest = calculate_24h_rainfall(self.series_72)
        self.assertAlmostEqual(result_latest, 72.0, places=2)

        # Ending at index 47 (second block of 24 elements, all 2.0 mm -> 48.0 mm)
        result_mid = calculate_24h_rainfall(self.series_72, end_index=47)
        self.assertAlmostEqual(result_mid, 48.0, places=2)

        # Ending at index 23 (first block of 24 elements, all 1.0 mm -> 24.0 mm)
        result_first = calculate_24h_rainfall(self.series_72, end_index=23)
        self.assertAlmostEqual(result_first, 24.0, places=2)

    def test_calculate_72h_rainfall_exact_72_hours(self):
        """calculate_72h_rainfall correctly accumulates full 72-hour window."""
        # Sum is (24*1.0) + (24*2.0) + (24*3.0) = 24 + 48 + 72 = 144.0 mm
        result = calculate_72h_rainfall(self.series_72)
        self.assertAlmostEqual(result, 144.0, places=2)

        result_obj = calculate_72h_rainfall(self.weather_72)
        self.assertAlmostEqual(result_obj, 144.0, places=2)

    def test_calculate_rainfall_metrics_contract(self):
        """calculate_rainfall_metrics bundles 1h, 24h, and 72h into RainfallMetrics."""
        metrics = calculate_rainfall_metrics(self.weather_72)
        self.assertIsInstance(metrics, RainfallMetrics)
        self.assertEqual(metrics.rainfall_1h, 3.0)
        self.assertAlmostEqual(metrics.rainfall_24h, 72.0, places=2)
        self.assertAlmostEqual(metrics.rainfall_72h, 144.0, places=2)

        # Round-trip dictionary serialization
        metrics_dict = metrics.to_dict()
        restored = RainfallMetrics.from_dict(metrics_dict)
        self.assertEqual(restored.rainfall_1h, metrics.rainfall_1h)
        self.assertEqual(restored.rainfall_24h, metrics.rainfall_24h)
        self.assertEqual(restored.rainfall_72h, metrics.rainfall_72h)


class TestRainfallValidationAndErrors(unittest.TestCase):
    """Test validation and strict rejection of invalid or insufficient rainfall data."""

    def test_empty_series_raises_value_error(self):
        """Empty series raises ValueError without silent coercion."""
        with self.assertRaises(ValueError):
            validate_precipitation_series([])
        with self.assertRaises(ValueError):
            calculate_1h_rainfall([])
        with self.assertRaises(ValueError):
            calculate_24h_rainfall([])
        with self.assertRaises(ValueError):
            calculate_72h_rainfall([])

    def test_insufficient_data_for_24h_raises_value_error(self):
        """Series with fewer than 24 hours raises ValueError (no silent zero assumption)."""
        short_series = [1.0] * 20
        with self.assertRaises(ValueError) as ctx:
            calculate_24h_rainfall(short_series)
        self.assertIn("Insufficient hourly data for 24h", str(ctx.exception))
        self.assertIn("found 20", str(ctx.exception))

    def test_insufficient_data_for_72h_raises_value_error(self):
        """Series with fewer than 72 hours raises ValueError (no silent zero assumption)."""
        medium_series = [1.0] * 48
        with self.assertRaises(ValueError) as ctx:
            calculate_72h_rainfall(medium_series)
        self.assertIn("Insufficient hourly data for 72h", str(ctx.exception))
        self.assertIn("found 48", str(ctx.exception))

    def test_end_index_with_insufficient_preceding_observations_raises_value_error(self):
        """Targeting an early index without enough preceding hours raises ValueError."""
        series_72 = [1.0] * 72
        # Target index 10 has only 11 preceding observations (0 to 10), insufficient for 24h
        with self.assertRaises(ValueError) as ctx:
            calculate_24h_rainfall(series_72, end_index=10)
        self.assertIn("required at least 24 observations", str(ctx.exception))

    def test_negative_precipitation_raises_value_error(self):
        """Negative precipitation values raise ValueError."""
        bad_series = [1.0, -0.5, 2.0]
        with self.assertRaises(ValueError) as ctx:
            calculate_1h_rainfall(bad_series)
        self.assertIn("cannot be negative", str(ctx.exception))

    def test_none_or_nan_precipitation_raises_value_error(self):
        """None or NaN values in precipitation raise ValueError."""
        with self.assertRaises(ValueError):
            validate_precipitation_series([1.0, None, 2.0])  # type: ignore
        with self.assertRaises(ValueError):
            validate_precipitation_series([1.0, float("nan"), 2.0])

    def test_out_of_bounds_end_index_raises_index_error(self):
        """Out of bounds index raises IndexError."""
        series = [1.0, 2.0, 3.0]
        with self.assertRaises(IndexError):
            calculate_1h_rainfall(series, end_index=10)
        with self.assertRaises(IndexError):
            calculate_1h_rainfall(series, end_index=-10)

    def test_invalid_normalization_config_raises_value_error(self):
        """Config with min >= max or min < 0 raises ValueError."""
        with self.assertRaises(ValueError):
            RainfallNormalizationConfig(min_1h_mm=60.0, max_1h_mm=50.0)
        with self.assertRaises(ValueError):
            RainfallNormalizationConfig(min_1h_mm=-1.0)


class TestRainfallNormalization(unittest.TestCase):
    """Unit tests for scaling rainfall depths into normalized [0.0, 1.0] scores."""

    def setUp(self):
        self.config = RainfallNormalizationConfig(
            min_1h_mm=0.0,
            max_1h_mm=50.0,
            min_24h_mm=0.0,
            max_24h_mm=150.0,
            min_72h_mm=0.0,
            max_72h_mm=250.0,
        )

    def test_normalize_zero_rainfall(self):
        """0.0 mm rainfall maps to 0.0."""
        self.assertEqual(normalize_rainfall_1h(0.0, self.config), 0.0)
        self.assertEqual(normalize_rainfall_24h(0.0, self.config), 0.0)
        self.assertEqual(normalize_rainfall_72h(0.0, self.config), 0.0)

    def test_normalize_maximum_ceiling_rainfall(self):
        """Rainfall equal to max threshold maps to 1.0."""
        self.assertEqual(normalize_rainfall_1h(50.0, self.config), 1.0)
        self.assertEqual(normalize_rainfall_24h(150.0, self.config), 1.0)
        self.assertEqual(normalize_rainfall_72h(250.0, self.config), 1.0)

    def test_normalize_intermediate_rainfall(self):
        """Rainfall between min and max scales linearly."""
        self.assertAlmostEqual(normalize_rainfall_1h(25.0, self.config), 0.5, places=4)
        self.assertAlmostEqual(normalize_rainfall_24h(75.0, self.config), 0.5, places=4)
        self.assertAlmostEqual(normalize_rainfall_72h(125.0, self.config), 0.5, places=4)

    def test_normalize_exceeding_ceiling_clamped(self):
        """Rainfall exceeding max threshold is safely clamped to 1.0."""
        self.assertEqual(normalize_rainfall_1h(120.0, self.config), 1.0)
        self.assertEqual(normalize_rainfall_24h(300.0, self.config), 1.0)
        self.assertEqual(normalize_rainfall_72h(600.0, self.config), 1.0)

    def test_normalize_negative_rainfall_raises_value_error(self):
        """Negative rainfall input to normalization raises ValueError."""
        with self.assertRaises(ValueError):
            normalize_rainfall_1h(-5.0, self.config)

    def test_normalize_rainfall_metrics_dict(self):
        """normalize_rainfall_metrics normalizes all three metrics in a RainfallMetrics object."""
        metrics = RainfallMetrics(rainfall_1h=25.0, rainfall_24h=75.0, rainfall_72h=125.0)
        normalized = normalize_rainfall_metrics(metrics, self.config)
        self.assertEqual(normalized["rainfall_1h"], 0.5)
        self.assertEqual(normalized["rainfall_24h"], 0.5)
        self.assertEqual(normalized["rainfall_72h"], 0.5)


class TestRainfallServiceDeterministicOutput(unittest.TestCase):
    """Test that all calculation and normalization outputs are deterministic."""

    def test_determinism_across_multiple_iterations(self):
        series = [1.2, 0.4, 3.8, 14.5] * 20  # 80 observations
        first_1h = calculate_1h_rainfall(series)
        first_24h = calculate_24h_rainfall(series)
        first_72h = calculate_72h_rainfall(series)

        for _ in range(50):
            self.assertEqual(calculate_1h_rainfall(series), first_1h)
            self.assertEqual(calculate_24h_rainfall(series), first_24h)
            self.assertEqual(calculate_72h_rainfall(series), first_72h)


class TestSampleDataIntegration(unittest.TestCase):
    """Integration test with reference sample Open-Meteo Pune data."""

    def setUp(self):
        sample_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "data",
            "sample",
            "open_meteo_pune_sample.json",
        )
        with open(sample_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        from backend.services.weather_service import parse_open_meteo_response
        self.weather_data = parse_open_meteo_response(raw)

    def test_pune_sample_1h_and_24h_calculations(self):
        """Pune sample contains 48 hours: 1h and 24h succeed."""
        val_1h = calculate_1h_rainfall(self.weather_data)
        self.assertIsInstance(val_1h, float)
        self.assertEqual(val_1h, self.weather_data.precipitation[-1])

        val_24h = calculate_24h_rainfall(self.weather_data)
        self.assertIsInstance(val_24h, float)
        expected_24h = round(math.fsum(self.weather_data.precipitation[-24:]), 2)
        self.assertEqual(val_24h, expected_24h)

    def test_pune_sample_72h_calculation_raises_value_error(self):
        """Pune sample has 48 hours; calculating 72h strictly raises ValueError (no silent zero padding)."""
        with self.assertRaises(ValueError) as ctx:
            calculate_72h_rainfall(self.weather_data)
        self.assertIn("Insufficient hourly data for 72h rainfall", str(ctx.exception))
        self.assertIn("found 48", str(ctx.exception))

    def test_create_hazard_input_from_weather_end_to_end(self):
        """Extended weather dataset can be bridged to HazardInput and evaluated by hazard engine."""
        # Extend sample precipitation to 72 hours by prepending 24 hours of 0.0 mm
        extended_series = [0.0] * 24 + self.weather_data.precipitation
        extended_timestamps = [f"2026-09-21T{h:02d}:00" for h in range(24)] + self.weather_data.timestamps
        extended_data = HourlyPrecipitationData(
            latitude=self.weather_data.latitude,
            longitude=self.weather_data.longitude,
            timestamps=extended_timestamps,
            precipitation=extended_series,
        )

        hazard_input = create_hazard_input_from_weather(
            weather_data=extended_data,
            terrain_susceptibility=0.65,
            historical_flood_proximity=0.75,
        )
        self.assertEqual(hazard_input.location.lat, 18.52)
        self.assertEqual(hazard_input.location.lon, 73.86)
        self.assertAlmostEqual(hazard_input.rainfall_1h, 0.0)
        self.assertAlmostEqual(hazard_input.terrain_susceptibility, 0.65)
        self.assertAlmostEqual(hazard_input.historical_flood_proximity, 0.75)

        # Run through hazard engine
        output = calculate_hazard_score(hazard_input)
        self.assertTrue(0.0 <= output.hazard_score <= 1.0)
        self.assertIn(output.risk_level, ("LOW", "MODERATE", "HIGH", "CRITICAL"))
        self.assertIn("rainfall_1h", output.component_scores)


if __name__ == "__main__":
    unittest.main()
