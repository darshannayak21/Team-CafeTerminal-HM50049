"""Basic test suite for normalization utility, hazard contracts, and health route."""

import unittest

from backend.app import create_app
from backend.config import TestingConfig
from backend.models.schemas import HazardInput, HazardOutput, Location
from backend.services.hazard_engine import calculate_hazard_score
from backend.utils.normalization import normalize


class TestNormalizationUtility(unittest.TestCase):
    """Unit tests for the min-max normalization utility."""

    def test_normalize_standard_value(self):
        """Normal values within bounds are scaled correctly to [0.0, 1.0]."""
        result = normalize(value=50.0, minimum=0.0, maximum=100.0)
        self.assertAlmostEqual(result, 0.5)

    def test_normalize_minimum_boundary(self):
        """A value equal to the minimum maps to 0.0."""
        result = normalize(value=10.0, minimum=10.0, maximum=50.0)
        self.assertAlmostEqual(result, 0.0)

    def test_normalize_maximum_boundary(self):
        """A value equal to the maximum maps to 1.0."""
        result = normalize(value=50.0, minimum=10.0, maximum=50.0)
        self.assertAlmostEqual(result, 1.0)

    def test_normalize_clipping_below_minimum(self):
        """Values below the minimum are clamped to 0.0 when clip=True."""
        result = normalize(value=-15.0, minimum=0.0, maximum=100.0, clip=True)
        self.assertAlmostEqual(result, 0.0)

    def test_normalize_clipping_above_maximum(self):
        """Values above the maximum are clamped to 1.0 when clip=True."""
        result = normalize(value=150.0, minimum=0.0, maximum=100.0, clip=True)
        self.assertAlmostEqual(result, 1.0)

    def test_normalize_unclipped(self):
        """Values outside bounds are not clamped when clip=False."""
        result = normalize(value=150.0, minimum=0.0, maximum=100.0, clip=False)
        self.assertAlmostEqual(result, 1.5)

    def test_normalize_zero_range_division_prevention(self):
        """When minimum == maximum, avoids division by zero and returns default."""
        result = normalize(value=25.0, minimum=25.0, maximum=25.0)
        self.assertAlmostEqual(result, 0.0)

    def test_normalize_invalid_range_raises_value_error(self):
        """When minimum > maximum, raises a ValueError."""
        with self.assertRaises(ValueError):
            normalize(value=10.0, minimum=100.0, maximum=50.0)


class TestHazardDataContract(unittest.TestCase):
    """Unit tests for the Hazard data contracts and schemas."""

    def test_location_contract(self):
        """Location contract accurately stores and serializes coordinates."""
        loc = Location(lat=18.5204, lon=73.8567)
        expected = {"lat": 18.5204, "lon": 73.8567}
        self.assertEqual(loc.to_dict(), expected)

        restored = Location.from_dict(expected)
        self.assertEqual(restored.lat, 18.5204)
        self.assertEqual(restored.lon, 73.8567)

    def test_hazard_input_contract(self):
        """HazardInput schema adheres to the agreed input contract structure."""
        payload = {
            "location": {
                "lat": 18.5204,
                "lon": 73.8567,
            },
            "rainfall_1h": 42.5,
            "rainfall_24h": 118.2,
            "rainfall_72h": 201.4,
            "terrain_susceptibility": 0.71,
            "historical_flood_proximity": 0.82,
        }

        hazard_input = HazardInput.from_dict(payload)
        self.assertEqual(hazard_input.location.lat, 18.5204)
        self.assertEqual(hazard_input.location.lon, 73.8567)
        self.assertEqual(hazard_input.rainfall_1h, 42.5)
        self.assertEqual(hazard_input.rainfall_24h, 118.2)
        self.assertEqual(hazard_input.rainfall_72h, 201.4)
        self.assertEqual(hazard_input.terrain_susceptibility, 0.71)
        self.assertEqual(hazard_input.historical_flood_proximity, 0.82)

        # Verify exact round-trip serialization
        self.assertEqual(hazard_input.to_dict(), payload)

    def test_hazard_output_contract(self):
        """HazardOutput schema adheres to the agreed output contract structure."""
        payload = {
            "hazard_score": 0.78,
            "risk_level": "HIGH",
            "evidence": [
                "high_72h_rainfall",
                "high_terrain_susceptibility",
                "near_historical_flood_zone",
            ],
        }

        hazard_output = HazardOutput.from_dict(payload)
        self.assertEqual(hazard_output.hazard_score, 0.78)
        self.assertEqual(hazard_output.risk_level, "HIGH")
        self.assertEqual(len(hazard_output.evidence), 3)
        self.assertIn("high_72h_rainfall", hazard_output.evidence)

        # Verify exact round-trip serialization
        self.assertEqual(hazard_output.to_dict(), payload)

    def test_hazard_engine_raises_not_implemented(self):
        """Hazard engine interface raises NotImplementedError (no fake logic)."""
        hazard_input = HazardInput(
            location=Location(lat=18.5204, lon=73.8567),
            rainfall_1h=42.5,
            rainfall_24h=118.2,
            rainfall_72h=201.4,
            terrain_susceptibility=0.71,
            historical_flood_proximity=0.82,
        )

        with self.assertRaises(NotImplementedError):
            calculate_hazard_score(hazard_input)


class TestHealthEndpoint(unittest.TestCase):
    """Test suite for the minimal Flask health route."""

    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()

    def test_health_check_returns_ok(self):
        """GET /api/health should return 200 with {'status': 'ok'}."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})


if __name__ == "__main__":
    unittest.main()
