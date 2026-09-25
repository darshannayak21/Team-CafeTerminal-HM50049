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

    def test_hazard_output_with_component_scores(self):
        """HazardOutput properly stores, serializes, and deserializes component_scores."""
        payload = {
            "hazard_score": 0.85,
            "risk_level": "CRITICAL",
            "evidence": ["high_1h_rainfall", "high_terrain_susceptibility"],
            "component_scores": {
                "rainfall_1h": 0.9,
                "rainfall_24h": 0.8,
                "rainfall_72h": 0.7,
                "terrain_susceptibility": 0.95,
                "historical_flood_proximity": 0.85,
            },
        }
        output = HazardOutput.from_dict(payload)
        self.assertEqual(output.hazard_score, 0.85)
        self.assertEqual(output.risk_level, "CRITICAL")
        self.assertEqual(len(output.evidence), 2)
        self.assertEqual(output.component_scores["rainfall_1h"], 0.9)
        self.assertEqual(output.to_dict(), payload)


class TestHazardEngine(unittest.TestCase):
    """Unit tests for the deterministic hazard scoring engine and explainability logic."""

    def setUp(self):
        self.valid_location = Location(lat=18.5204, lon=73.8567)
        self.valid_input = HazardInput(
            location=self.valid_location,
            rainfall_1h=42.5,
            rainfall_24h=118.2,
            rainfall_72h=201.4,
            terrain_susceptibility=0.71,
            historical_flood_proximity=0.82,
        )

    def test_calculate_hazard_score_standard_execution(self):
        """Standard input evaluates deterministically to expected score, risk, and evidence."""
        output = calculate_hazard_score(self.valid_input)
        self.assertIsInstance(output, HazardOutput)
        self.assertAlmostEqual(output.hazard_score, 0.7931, places=4)
        self.assertEqual(output.risk_level, "HIGH")

        # Verify explainability evidence captures high-risk factors (>= 0.60)
        expected_evidence = [
            "high_1h_rainfall",
            "high_24h_rainfall",
            "high_72h_rainfall",
            "high_terrain_susceptibility",
            "near_historical_flood_zone",
        ]
        self.assertEqual(output.evidence, expected_evidence)

        # Verify component_scores breakdown
        self.assertEqual(len(output.component_scores), 5)
        self.assertAlmostEqual(output.component_scores["rainfall_1h"], 0.85, places=2)
        self.assertAlmostEqual(output.component_scores["rainfall_24h"], 0.788, places=2)
        self.assertAlmostEqual(output.component_scores["rainfall_72h"], 0.8056, places=2)
        self.assertAlmostEqual(output.component_scores["terrain_susceptibility"], 0.71, places=2)
        self.assertAlmostEqual(output.component_scores["historical_flood_proximity"], 0.82, places=2)

    def test_hazard_score_boundary_all_zeros(self):
        """Zero rainfall, minimum terrain and historical proximity yield hazard_score 0.0 and LOW risk."""
        zero_input = HazardInput(
            location=self.valid_location,
            rainfall_1h=0.0,
            rainfall_24h=0.0,
            rainfall_72h=0.0,
            terrain_susceptibility=0.0,
            historical_flood_proximity=0.0,
        )
        output = calculate_hazard_score(zero_input)
        self.assertEqual(output.hazard_score, 0.0)
        self.assertEqual(output.risk_level, "LOW")
        self.assertEqual(output.evidence, [])
        for comp_score in output.component_scores.values():
            self.assertEqual(comp_score, 0.0)

    def test_hazard_score_boundary_all_maximums(self):
        """Values exceeding maximum bounds yield capped hazard_score 1.0 and CRITICAL risk."""
        max_input = HazardInput(
            location=self.valid_location,
            rainfall_1h=100.0,  # Exceeds max_1h_mm (50.0)
            rainfall_24h=300.0,  # Exceeds max_24h_mm (150.0)
            rainfall_72h=500.0,  # Exceeds max_72h_mm (250.0)
            terrain_susceptibility=1.0,
            historical_flood_proximity=1.0,
        )
        output = calculate_hazard_score(max_input)
        self.assertEqual(output.hazard_score, 1.0)
        self.assertEqual(output.risk_level, "CRITICAL")
        self.assertEqual(len(output.evidence), 5)
        for comp_score in output.component_scores.values():
            self.assertEqual(comp_score, 1.0)

    def test_hazard_score_deterministic_output(self):
        """Repeated evaluations of identical inputs produce bitwise identical results."""
        results = [calculate_hazard_score(self.valid_input) for _ in range(50)]
        first = results[0]
        for item in results[1:]:
            self.assertEqual(item.hazard_score, first.hazard_score)
            self.assertEqual(item.risk_level, first.risk_level)
            self.assertEqual(item.evidence, first.evidence)
            self.assertEqual(item.component_scores, first.component_scores)

    def test_explainability_selective_evidence_generation(self):
        """Only components meeting or exceeding evidence_threshold are flagged in evidence."""
        # Only rainfall_1h is high (45 mm -> 0.90 normalized), others are 0.0
        isolated_input = HazardInput(
            location=self.valid_location,
            rainfall_1h=45.0,
            rainfall_24h=0.0,
            rainfall_72h=0.0,
            terrain_susceptibility=0.1,
            historical_flood_proximity=0.1,
        )
        output = calculate_hazard_score(isolated_input, evidence_threshold=0.60)
        self.assertEqual(output.evidence, ["high_1h_rainfall"])
        self.assertEqual(output.component_scores["rainfall_1h"], 0.90)

    def test_risk_level_cutoffs(self):
        """Test qualitative risk categorization across tier boundaries."""
        from backend.services.hazard_engine import RiskThresholds, classify_risk_level

        thresholds = RiskThresholds(moderate_threshold=0.30, high_threshold=0.60, critical_threshold=0.80)
        self.assertEqual(classify_risk_level(0.0, thresholds), "LOW")
        self.assertEqual(classify_risk_level(0.2999, thresholds), "LOW")
        self.assertEqual(classify_risk_level(0.30, thresholds), "MODERATE")
        self.assertEqual(classify_risk_level(0.5999, thresholds), "MODERATE")
        self.assertEqual(classify_risk_level(0.60, thresholds), "HIGH")
        self.assertEqual(classify_risk_level(0.7999, thresholds), "HIGH")
        self.assertEqual(classify_risk_level(0.80, thresholds), "CRITICAL")
        self.assertEqual(classify_risk_level(1.0, thresholds), "CRITICAL")

    def test_custom_hazard_weights_and_thresholds(self):
        """Engine supports user-provided weights and custom risk thresholds."""
        from backend.services.hazard_engine import HazardWeights, RiskThresholds

        # Weights emphasizing short-term rainfall exclusively
        custom_weights = HazardWeights(
            weight_rainfall_1h=0.60,
            weight_rainfall_24h=0.10,
            weight_rainfall_72h=0.10,
            weight_terrain=0.10,
            weight_historical=0.10,
        )
        custom_thresholds = RiskThresholds(
            moderate_threshold=0.20,
            high_threshold=0.40,
            critical_threshold=0.70,
        )

        output = calculate_hazard_score(
            self.valid_input,
            weights=custom_weights,
            risk_thresholds=custom_thresholds,
        )
        self.assertIsInstance(output, HazardOutput)
        self.assertTrue(0.0 <= output.hazard_score <= 1.0)
        self.assertIn(output.risk_level, ("LOW", "MODERATE", "HIGH", "CRITICAL"))

    def test_invalid_hazard_weights_raise_value_error(self):
        """Weights that do not sum to 1.0 or contain negative values raise ValueError."""
        from backend.services.hazard_engine import HazardWeights

        with self.assertRaises(ValueError):
            HazardWeights(weight_rainfall_1h=0.5, weight_rainfall_24h=0.1)  # sum != 1.0

        with self.assertRaises(ValueError):
            HazardWeights(
                weight_rainfall_1h=-0.2,
                weight_rainfall_24h=0.4,
                weight_rainfall_72h=0.3,
                weight_terrain=0.3,
                weight_historical=0.2,
            )

    def test_invalid_risk_thresholds_raise_value_error(self):
        """Non-monotonic risk thresholds raise ValueError."""
        from backend.services.hazard_engine import RiskThresholds

        with self.assertRaises(ValueError):
            RiskThresholds(moderate_threshold=0.70, high_threshold=0.40, critical_threshold=0.90)

    def test_hazard_validation_missing_input_raises_value_error(self):
        """Passing None or non-HazardInput raises ValueError."""
        with self.assertRaises(ValueError):
            calculate_hazard_score(None)  # type: ignore

        with self.assertRaises(ValueError):
            calculate_hazard_score({"location": {"lat": 18.52, "lon": 73.86}})  # type: ignore

    def test_hazard_validation_negative_rainfall_raises_value_error(self):
        """Negative rainfall inputs raise ValueError without silent conversion."""
        bad_input = HazardInput(
            location=self.valid_location,
            rainfall_1h=-5.0,
            rainfall_24h=10.0,
            rainfall_72h=20.0,
            terrain_susceptibility=0.5,
            historical_flood_proximity=0.5,
        )
        with self.assertRaises(ValueError) as ctx:
            calculate_hazard_score(bad_input)
        self.assertIn("cannot be negative", str(ctx.exception))

    def test_hazard_validation_out_of_bounds_terrain_raises_value_error(self):
        """Terrain susceptibility outside [0.0, 1.0] raises ValueError."""
        bad_input = HazardInput(
            location=self.valid_location,
            rainfall_1h=10.0,
            rainfall_24h=20.0,
            rainfall_72h=30.0,
            terrain_susceptibility=1.5,
            historical_flood_proximity=0.5,
        )
        with self.assertRaises(ValueError) as ctx:
            calculate_hazard_score(bad_input)
        self.assertIn("terrain_susceptibility", str(ctx.exception))

    def test_hazard_validation_out_of_bounds_historical_raises_value_error(self):
        """Historical flood proximity outside [0.0, 1.0] raises ValueError."""
        bad_input = HazardInput(
            location=self.valid_location,
            rainfall_1h=10.0,
            rainfall_24h=20.0,
            rainfall_72h=30.0,
            terrain_susceptibility=0.5,
            historical_flood_proximity=-0.2,
        )
        with self.assertRaises(ValueError) as ctx:
            calculate_hazard_score(bad_input)
        self.assertIn("historical_flood_proximity", str(ctx.exception))

    def test_hazard_validation_invalid_coordinates_raises_value_error(self):
        """Out-of-range location coordinates raise ValueError."""
        bad_loc = Location(lat=105.0, lon=73.8567)
        bad_input = HazardInput(
            location=bad_loc,
            rainfall_1h=10.0,
            rainfall_24h=20.0,
            rainfall_72h=30.0,
            terrain_susceptibility=0.5,
            historical_flood_proximity=0.5,
        )
        with self.assertRaises(ValueError) as ctx:
            calculate_hazard_score(bad_input)
        self.assertIn("latitude", str(ctx.exception).lower())


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
