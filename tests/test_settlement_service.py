"""Unit tests for settlement data models and deterministic impact calculations."""

import unittest
from backend.models.schemas import HazardOutput, Location, Settlement, SettlementImpact
from backend.services.settlement_service import (
    calculate_settlement_impact,
    calculate_settlements_impact,
    sort_settlements_by_impact,
)


class TestSettlementModelValidation(unittest.TestCase):
    """Test suite for Settlement schema instantiation and validation."""

    def test_01_valid_settlement_creation(self):
        """1. Valid settlement creation succeeds with properly typed attributes."""
        settlement = Settlement(
            settlement_id="pune-haveli",
            name="Haveli",
            latitude=18.5204,
            longitude=73.8567,
            population=243500.0,
            taluka="Haveli",
        )
        settlement.validate()
        self.assertEqual(settlement.settlement_id, "pune-haveli")
        self.assertEqual(settlement.name, "Haveli")
        self.assertEqual(settlement.latitude, 18.5204)
        self.assertEqual(settlement.longitude, 73.8567)
        self.assertEqual(settlement.population, 243500.0)
        self.assertEqual(settlement.taluka, "Haveli")

    def test_02_invalid_coordinates_latitude(self):
        """2. Invalid coordinates (lat > 90 or < -90) raise ValueError."""
        settlement_high = Settlement(
            settlement_id="s1", name="North", latitude=91.0, longitude=73.8, population=100.0
        )
        with self.assertRaises(ValueError) as ctx:
            settlement_high.validate()
        self.assertIn("Latitude must be between -90.0 and 90.0", str(ctx.exception))

        settlement_low = Settlement(
            settlement_id="s1", name="South", latitude=-90.5, longitude=73.8, population=100.0
        )
        with self.assertRaises(ValueError):
            settlement_low.validate()

    def test_02b_invalid_coordinates_longitude(self):
        """2b. Invalid coordinates (lon > 180 or < -180) raise ValueError."""
        settlement_east = Settlement(
            settlement_id="s1", name="East", latitude=18.5, longitude=180.1, population=100.0
        )
        with self.assertRaises(ValueError) as ctx:
            settlement_east.validate()
        self.assertIn("Longitude must be between -180.0 and 180.0", str(ctx.exception))

        settlement_west = Settlement(
            settlement_id="s1", name="West", latitude=18.5, longitude=-185.0, population=100.0
        )
        with self.assertRaises(ValueError):
            settlement_west.validate()

    def test_03_empty_settlement_id_or_name(self):
        """3. Empty settlement ID or name is rejected."""
        with self.assertRaises(ValueError):
            Settlement(settlement_id="", name="ValidName", latitude=18.5, longitude=73.8, population=100.0).validate()

        with self.assertRaises(ValueError):
            Settlement(settlement_id="   ", name="ValidName", latitude=18.5, longitude=73.8, population=100.0).validate()

        with self.assertRaises(ValueError):
            Settlement(settlement_id="s1", name="", latitude=18.5, longitude=73.8, population=100.0).validate()

        with self.assertRaises(ValueError):
            Settlement(settlement_id="s1", name="   ", latitude=18.5, longitude=73.8, population=100.0).validate()

    def test_04_negative_population_rejected(self):
        """4. Negative population raises ValueError."""
        settlement = Settlement(
            settlement_id="s1", name="Negative", latitude=18.5, longitude=73.8, population=-1.0
        )
        with self.assertRaises(ValueError) as ctx:
            settlement.validate()
        self.assertIn("cannot be negative", str(ctx.exception))

    def test_05_missing_population_rejected_no_silent_zero(self):
        """5. Missing or None population raises ValueError without silent coercion to 0."""
        settlement = Settlement(
            settlement_id="s1", name="MissingPop", latitude=18.5, longitude=73.8, population=None  # type: ignore
        )
        with self.assertRaises(ValueError) as ctx:
            settlement.validate()
        self.assertIn("Missing population must not silently become zero", str(ctx.exception))

        with self.assertRaises(ValueError):
            Settlement.from_dict({
                "settlement_id": "s1",
                "name": "MissingInDict",
                "latitude": 18.5,
                "longitude": 73.8,
                "population": None,
            })

    def test_serialization_round_trip(self):
        """Settlement to_dict and from_dict preserve integrity."""
        original = Settlement(
            settlement_id="pune-mulshi",
            name="Mulshi",
            latitude=18.51,
            longitude=73.53,
            population=15200.0,
            taluka="Mulshi",
        )
        data = original.to_dict()
        reconstituted = Settlement.from_dict(data)
        self.assertEqual(original, reconstituted)


class TestSettlementImpactCalculation(unittest.TestCase):
    """Test suite for settlement impact calculation and ranking logic."""

    def setUp(self):
        self.sample_settlement = Settlement(
            settlement_id="pune-haveli",
            name="Haveli",
            latitude=18.5204,
            longitude=73.8567,
            population=10000.0,
            taluka="Haveli",
        )

    def test_06_valid_hazard_score(self):
        """6. Valid hazard score in [0.0, 1.0] calculates expected impact."""
        impact = calculate_settlement_impact(self.sample_settlement, 0.5)
        self.assertEqual(impact.hazard_score, 0.5)
        self.assertEqual(impact.population, 10000.0)
        self.assertEqual(impact.settlement_impact, 5000.0)

    def test_07_hazard_score_less_than_zero_rejected(self):
        """7. Hazard score < 0.0 is strictly rejected."""
        with self.assertRaises(ValueError) as ctx:
            calculate_settlement_impact(self.sample_settlement, -0.01)
        self.assertIn("must be within [0.0, 1.0]", str(ctx.exception))

    def test_08_hazard_score_greater_than_one_rejected(self):
        """8. Hazard score > 1.0 is strictly rejected."""
        with self.assertRaises(ValueError) as ctx:
            calculate_settlement_impact(self.sample_settlement, 1.01)
        self.assertIn("must be within [0.0, 1.0]", str(ctx.exception))

    def test_09_zero_population_impact(self):
        """9. Zero population yields zero impact without error."""
        zero_pop_settlement = Settlement(
            settlement_id="uninhabited",
            name="Forest Reserve",
            latitude=18.5,
            longitude=73.5,
            population=0.0,
        )
        impact = calculate_settlement_impact(zero_pop_settlement, 0.85)
        self.assertEqual(impact.population, 0.0)
        self.assertEqual(impact.settlement_impact, 0.0)

    def test_10_zero_hazard_score(self):
        """10. Zero hazard score yields zero impact."""
        impact = calculate_settlement_impact(self.sample_settlement, 0.0)
        self.assertEqual(impact.hazard_score, 0.0)
        self.assertEqual(impact.settlement_impact, 0.0)

    def test_11_hazard_score_equal_one(self):
        """11. Hazard score = 1.0 yields settlement_impact == population."""
        impact = calculate_settlement_impact(self.sample_settlement, 1.0)
        self.assertEqual(impact.hazard_score, 1.0)
        self.assertEqual(impact.settlement_impact, 10000.0)

    def test_12_correct_settlement_impact_calculation(self):
        """12. Verified settlement_impact = hazard_score * population calculation."""
        settlement = Settlement(
            settlement_id="pune-maval",
            name="Maval",
            latitude=18.70,
            longitude=73.73,
            population=54321.0,
            taluka="Maval",
        )
        hazard_score = 0.654
        impact = calculate_settlement_impact(settlement, hazard_score)
        expected = 0.654 * 54321.0
        self.assertAlmostEqual(impact.settlement_impact, expected, places=5)
        self.assertEqual(impact.settlement_id, "pune-maval")
        self.assertEqual(impact.settlement_name, "Maval")
        self.assertEqual(impact.taluka, "Maval")

    def test_13_multiple_settlements_calculation(self):
        """13. Calculating impact across multiple settlements succeeds."""
        s1 = Settlement("s1", "Settlement 1", 18.1, 73.1, 1000.0)
        s2 = Settlement("s2", "Settlement 2", 18.2, 73.2, 2000.0)
        s3 = Settlement("s3", "Settlement 3", 18.3, 73.3, 3000.0)

        # Uniform hazard score
        impacts = calculate_settlements_impact([s1, s2, s3], 0.5)
        self.assertEqual(len(impacts), 3)
        self.assertEqual([i.settlement_impact for i in impacts], [500.0, 1000.0, 1500.0])

        # Per-settlement hazard dictionary
        hazard_map = {"s1": 0.2, "s2": 0.5, "s3": 0.8}
        impacts_mapped = calculate_settlements_impact([s1, s2, s3], hazard_map)
        self.assertEqual([i.settlement_impact for i in impacts_mapped], [200.0, 1000.0, 2400.0])

    def test_14_descending_impact_ordering(self):
        """14. Sorting orders settlements by impact descending with deterministic tie-breaking."""
        s1 = Settlement("s1", "Alpha", 18.1, 73.1, 1000.0)
        s2 = Settlement("s2", "Beta", 18.2, 73.2, 5000.0)
        s3 = Settlement("s3", "Gamma", 18.3, 73.3, 3000.0)
        s4 = Settlement("s4", "Delta", 18.4, 73.4, 3000.0)

        impacts = calculate_settlements_impact([s1, s2, s3, s4], 0.5)
        sorted_impacts = sort_settlements_by_impact(impacts, descending=True)

        # Expected order: s2 (2500), s3 (1500), s4 (1500, tiebreak by id s3 < s4), s1 (500)
        self.assertEqual([i.settlement_id for i in sorted_impacts], ["s2", "s3", "s4", "s1"])
        self.assertEqual([i.settlement_impact for i in sorted_impacts], [2500.0, 1500.0, 1500.0, 500.0])

    def test_15_deterministic_repeated_calculations(self):
        """15. Repeated execution yields identical numerical outputs and sorting."""
        settlements = [
            Settlement("s1", "Town A", 18.1, 73.1, 45210.0),
            Settlement("s2", "Town B", 18.2, 73.2, 89123.0),
            Settlement("s3", "Town C", 18.3, 73.3, 12450.0),
        ]
        run1 = sort_settlements_by_impact(calculate_settlements_impact(settlements, 0.725))
        run2 = sort_settlements_by_impact(calculate_settlements_impact(settlements, 0.725))
        for r1, r2 in zip(run1, run2):
            self.assertEqual(r1.settlement_id, r2.settlement_id)
            self.assertEqual(r1.settlement_impact, r2.settlement_impact)

    def test_16_hazard_output_integration(self):
        """16. Integration: HazardOutput object directly feeds into SettlementImpact calculation."""
        hazard_out = HazardOutput(
            hazard_score=0.74,
            risk_level="HIGH",
            evidence=["high_72h_rainfall", "near_historical_flood_zone"],
            component_scores={"rainfall_72h": 0.81, "historical_flood_proximity": 0.85},
        )
        settlement = Settlement(
            settlement_id="pune-mulshi",
            name="Mulshi Downstream Basin",
            latitude=18.515,
            longitude=73.535,
            population=4200.0,
            taluka="Mulshi",
        )
        impact = calculate_settlement_impact(settlement, hazard_out)
        self.assertEqual(impact.hazard_score, 0.74)
        self.assertEqual(impact.population, 4200.0)
        self.assertAlmostEqual(impact.settlement_impact, 0.74 * 4200.0, places=5)
        self.assertEqual(impact.settlement_name, "Mulshi Downstream Basin")


if __name__ == "__main__":
    unittest.main()
