"""Automated tests for population aggregation service and spatial raster processing.

All tests utilize tiny controlled synthetic raster fixtures or localized fixture files,
guaranteeing zero network dependency and rapid, deterministic execution.
"""

import json
import os
import tempfile
import unittest

import numpy as np
import rasterio
from rasterio.transform import from_bounds
from shapely.geometry import box, mapping, Point, Polygon

from backend.models.schemas import Settlement
from backend.services.population_service import (
    aggregate_polygon_population,
    load_and_aggregate_settlements,
    verify_raster_dataset,
)
from backend.services.settlement_service import load_settlements_from_file


class TestPopulationServiceControlledFixtures(unittest.TestCase):
    """Test suite for raster aggregation, nodata, and CRS transformation using tiny fixtures."""

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.raster_path = os.path.join(self.tmpdir.name, "synthetic_pop.tif")

        # 5x5 grid spanning lon [0, 5], lat [0, 5]
        # Each cell is 1.0 x 1.0 degree
        # Row 0: lat [4, 5], Row 1: lat [3, 4], etc.
        self.transform = from_bounds(0.0, 0.0, 5.0, 5.0, 5, 5)
        self.nodata = -9999.0
        self.grid_data = np.array([
            [100.0, 200.0, 300.0, 400.0, 500.0],
            [100.0, -9999.0, 300.0, 400.0, 500.0],  # Cell (row 1, col 1) is NoData
            [100.0, 200.0, 300.0, 400.0, 500.0],
            [100.0, 200.0, 300.0, 400.0, 500.0],
            [100.0, 200.0, 300.0, 400.0, 500.0],
        ], dtype=np.float32)

        with rasterio.open(
            self.raster_path,
            "w",
            driver="GTiff",
            height=5,
            width=5,
            count=1,
            dtype=rasterio.float32,
            crs="EPSG:4326",
            transform=self.transform,
            nodata=self.nodata,
        ) as dst:
            dst.write(self.grid_data, 1)

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_17_raster_population_aggregation(self):
        """17. Raster population aggregation sums valid population cells intersecting the polygon."""
        # Box covering rows 2-3, cols 2-3 => bounds [2.01, 1.01] to [3.99, 2.99]
        # Intersects 4 cells: (row 2 col 2: 300), (row 2 col 3: 400),
        #                     (row 3 col 2: 300), (row 3 col 3: 400)
        # Expected sum = 1400.0
        poly = box(2.01, 1.01, 3.99, 2.99)
        aggregated = aggregate_polygon_population(self.raster_path, poly, geom_crs="EPSG:4326")
        self.assertEqual(aggregated, 1400.0)

    def test_18_nodata_handling(self):
        """18. NoData cells (-9999.0) and negative values are strictly excluded from population sum."""
        # Box covering rows 0-1, cols 0-1 => bounds [0.01, 3.01] to [1.99, 4.99]
        # Intersects 4 cells: (row 0 col 0: 100), (row 0 col 1: 200),
        #                     (row 1 col 0: 100), (row 1 col 1: -9999 NoData)
        # Without nodata handling, sum would be negative (-9599.0).
        # Correct handling excludes nodata => 100 + 200 + 100 = 400.0
        poly = box(0.01, 3.01, 1.99, 4.99)
        aggregated = aggregate_polygon_population(self.raster_path, poly, geom_crs="EPSG:4326")
        self.assertEqual(aggregated, 400.0)

    def test_18b_nan_and_negative_filtering(self):
        """18b. NaN, infinite, and stray negative values are filtered out."""
        nan_raster_path = os.path.join(self.tmpdir.name, "nan_pop.tif")
        data_with_nans = np.array([
            [50.0, np.nan],
            [-10.0, 75.0],
        ], dtype=np.float32)
        transform = from_bounds(0.0, 0.0, 2.0, 2.0, 2, 2)
        with rasterio.open(
            nan_raster_path,
            "w",
            driver="GTiff",
            height=2,
            width=2,
            count=1,
            dtype=rasterio.float32,
            crs="EPSG:4326",
            transform=transform,
        ) as dst:
            dst.write(data_with_nans, 1)

        poly = box(0.01, 0.01, 1.99, 1.99)
        # Should sum only 50.0 and 75.0 (excluding NaN and negative -10.0)
        aggregated = aggregate_polygon_population(nan_raster_path, poly)
        self.assertEqual(aggregated, 125.0)

    def test_19_crs_mismatch_handling(self):
        """19. Geometries specified in a different CRS are properly reprojected before masking."""
        # Create a raster in Web Mercator EPSG:3857 around London/Greenwich (0, 0 in mercator)
        mercator_raster_path = os.path.join(self.tmpdir.name, "mercator_pop.tif")
        # Bounds in meters: [0, 0] to [100000, 100000]
        transform_m = from_bounds(0.0, 0.0, 100000.0, 100000.0, 2, 2)
        merc_data = np.array([
            [500.0, 500.0],
            [500.0, 500.0],
        ], dtype=np.float32)
        with rasterio.open(
            mercator_raster_path,
            "w",
            driver="GTiff",
            height=2,
            width=2,
            count=1,
            dtype=rasterio.float32,
            crs="EPSG:3857",
            transform=transform_m,
        ) as dst:
            dst.write(merc_data, 1)

        # Polygon given in EPSG:4326 (degrees): (0.1 deg lat, 0.1 deg lon is approx 11,000m)
        # Should overlap the bottom-left cell
        poly_4326 = box(0.05, 0.05, 0.40, 0.40)
        aggregated = aggregate_polygon_population(
            mercator_raster_path,
            poly_4326,
            geom_crs="EPSG:4326",
        )
        self.assertGreater(aggregated, 0.0)

    def test_non_overlapping_geometry_returns_zero(self):
        """Polygons located completely outside the raster bounds return 0.0 without crash."""
        poly_outside = box(100.0, 100.0, 105.0, 105.0)
        aggregated = aggregate_polygon_population(self.raster_path, poly_outside)
        self.assertEqual(aggregated, 0.0)

    def test_invalid_geometry_raises_value_error(self):
        """Empty or invalid geometry raises ValueError."""
        empty_poly = Polygon()
        with self.assertRaises(ValueError):
            aggregate_polygon_population(self.raster_path, empty_poly)

    def test_verify_raster_dataset_metadata(self):
        """verify_raster_dataset returns structured dictionary with bounds and dimensions."""
        meta = verify_raster_dataset(self.raster_path)
        self.assertEqual(meta["driver"], "GTiff")
        self.assertEqual(meta["width"], 5)
        self.assertEqual(meta["height"], 5)
        self.assertEqual(meta["crs"], "EPSG:4326")
        self.assertEqual(meta["nodata"], -9999.0)
        self.assertIn("bounds", meta)
        # Synthetic grid [0,5] does not cover Pune [18, 73]
        self.assertFalse(meta["pune_covered"])

    def test_verify_nonexistent_raster_raises_file_not_found(self):
        """verify_raster_dataset raises FileNotFoundError for missing paths."""
        with self.assertRaises(FileNotFoundError):
            verify_raster_dataset("nonexistent/path/raster.tif")


class TestFixtureAndProcessedDataLoading(unittest.TestCase):
    """Test suite for sample/fixture GeoJSON boundary parsing and processed settlement datasets."""

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_20_load_and_aggregate_synthetic_geojson(self):
        """20. Sample/fixture GeoJSON features are parsed and converted to valid Settlement models."""
        raster_path = os.path.join(self.tmpdir.name, "grid.tif")
        transform = from_bounds(73.0, 18.0, 75.0, 20.0, 4, 4)
        data = np.full((4, 4), 1000.0, dtype=np.float32)
        with rasterio.open(
            raster_path, "w", driver="GTiff", height=4, width=4, count=1,
            dtype=rasterio.float32, crs="EPSG:4326", transform=transform, nodata=-9999.0
        ) as dst:
            dst.write(data, 1)

        # Create a tiny controlled 2-feature GeoJSON fixture
        fixture_geojson = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
            "features": [
                {
                    "type": "Feature",
                    "properties": {"id": "set-1", "name": "Settlement Alpha", "taluka": "Haveli"},
                    "geometry": mapping(box(73.1, 18.1, 73.9, 18.9)),
                },
                {
                    "type": "Feature",
                    "properties": {"id": "set-2", "name": "Settlement Beta", "taluka": "Mulshi"},
                    "geometry": mapping(box(74.1, 19.1, 74.9, 19.9)),
                },
            ],
        }
        geojson_path = os.path.join(self.tmpdir.name, "settlements_fixture.geojson")
        with open(geojson_path, "w", encoding="utf-8") as f:
            json.dump(fixture_geojson, f)

        settlements = load_and_aggregate_settlements(raster_path, geojson_path)
        self.assertEqual(len(settlements), 2)

        s1 = settlements[0]
        self.assertEqual(s1.settlement_id, "set-1")
        self.assertEqual(s1.name, "Settlement Alpha")
        self.assertEqual(s1.taluka, "Haveli")
        self.assertGreater(s1.population, 0.0)
        self.assertAlmostEqual(s1.latitude, 18.5, places=1)
        self.assertAlmostEqual(s1.longitude, 73.5, places=1)

    def test_processed_pune_settlements_if_present(self):
        """Validate the processed Pune settlements dataset if available on disk."""
        processed_path = os.path.join("data", "processed", "pune_settlements.json")
        if os.path.exists(processed_path):
            settlements = load_settlements_from_file(processed_path)
            self.assertEqual(len(settlements), 14, "Expected all 14 official Pune talukas")
            for s in settlements:
                s.validate()
                self.assertGreater(s.population, 0.0, f"Population for {s.name} should be > 0")
                # Latitude within Pune District bounds [18.0, 19.5]
                self.assertTrue(18.0 <= s.latitude <= 19.5, f"Lat {s.latitude} out of Pune bounds")
                # Longitude within Pune District bounds [73.2, 75.2]
                self.assertTrue(73.2 <= s.longitude <= 75.2, f"Lon {s.longitude} out of Pune bounds")

    def test_load_settlements_file_not_found(self):
        """load_settlements_from_file raises FileNotFoundError for missing files."""
        with self.assertRaises(FileNotFoundError):
            load_settlements_from_file("data/nonexistent/file.json")

    def test_load_settlements_invalid_format(self):
        """load_settlements_from_file raises ValueError for malformed JSON structure."""
        bad_json_path = os.path.join(self.tmpdir.name, "bad.json")
        with open(bad_json_path, "w", encoding="utf-8") as f:
            f.write('{"settlements": "not a list"}')

        with self.assertRaises(ValueError):
            load_settlements_from_file(bad_json_path)


if __name__ == "__main__":
    unittest.main()
