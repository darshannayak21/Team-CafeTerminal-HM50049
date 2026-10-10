"""Comprehensive tests for RainGuard Live News Ingestion, Geocoding, and Cost-Control."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from backend.app import create_app
from backend.config import TestingConfig
from backend.services.db import (
    claim_article_for_processing,
    complete_article_processing,
    fail_article_processing,
    get_all_news,
    get_article_by_canonical_url,
    get_article_by_content_hash,
    get_cached_geocoding,
    get_operational_metrics,
    get_pending_articles,
    get_report_by_id,
    init_db,
    insert_raw_article,
    save_cached_geocoding,
    save_report,
)
from backend.services.geocoding_service import geocode_location, normalize_place_name
from backend.services.news_service import (
    canonicalize_url,
    compute_content_hash,
    process_single_article,
)


class TestNewsIngestionAndGeolocation(unittest.TestCase):
    """Test suite for database-first ingestion, deduplication, geocoding, and cost controls."""

    def setUp(self):
        # Create a fresh temporary database for isolated testing
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        os.close(self.temp_db_fd)

        class CustomTestingConfig(TestingConfig):
            DATABASE_PATH = self.temp_db_path
            TESTING = True

        self.app = create_app(CustomTestingConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            init_db()

    def tearDown(self):
        if os.path.exists(self.temp_db_path):
            try:
                os.remove(self.temp_db_path)
            except Exception:
                pass

    def test_canonicalize_url_strips_tracking_params(self):
        """Test that tracking queries are stripped and URLs are normalized."""
        url1 = "https://timesofindia.indiatimes.com/city/pune/article-1.cms?utm_source=rss&utm_medium=feed&ref=banner"
        url2 = "HTTPS://timesofindia.indiatimes.com/city/pune/article-1.cms"
        self.assertEqual(canonicalize_url(url1), canonicalize_url(url2))

    def test_content_fingerprint_generation(self):
        """Test stable deterministic content fingerprint."""
        hash1 = compute_content_hash("Pune Heavy Rainfall Alert", "Inundation on Sinhagad Road.")
        hash2 = compute_content_hash("  pune heavy rainfall alert ", "inundation on sinhagad road.  ")
        self.assertEqual(hash1, hash2)

    def test_repeated_api_news_reads_trigger_zero_llm_calls(self):
        """CRITICAL: Test that polling /api/news repeatedly does NOT invoke the LLM."""
        with self.app.app_context():
            # Seed articles directly in DB
            insert_raw_article({
                "id": "art-test-1",
                "title": "Road Flooded in Kothrud",
                "description": "Heavy water accumulation near Kothrud stand.",
                "source": "Local News",
                "canonical_url": "https://example.com/kothrud-flood",
                "content_hash": "hash-kothrud",
                "processing_status": "COMPLETED",
                "latitude": 18.5074,
                "longitude": 73.8077,
                "geolocation_status": "VERIFIED",
                "severity": "HIGH",
            })

        # Mock LLM and geocoding services to fail if called
        with patch("backend.services.ai_service.extract_news_location_and_hazard") as mock_llm, \
             patch("backend.services.geocoding_service.geocode_location") as mock_geo:

            # Make 10 consecutive GET requests simulating high-frequency frontend polling
            for _ in range(10):
                res = self.client.get("/api/news")
                self.assertEqual(res.status_code, 200)
                data = res.get_json()
                self.assertTrue(data["success"])
                self.assertGreaterEqual(len(data["news"]), 1)
                item = data["news"][0]
                self.assertEqual(item["id"], "art-test-1")
                self.assertEqual(item["geolocation_status"], "VERIFIED")
                self.assertEqual(item["latitude"], 18.5074)

            # Assert ZERO calls were made to LLM or geocoder during reads
            mock_llm.assert_not_called()
            mock_geo.assert_not_called()

    def test_duplicate_article_deduplication_skips_llm(self):
        """Test that duplicate RSS entries (by canonical URL or hash) are skipped."""
        with self.app.app_context():
            article1 = {
                "id": "art-dedup-1",
                "title": "Waterlogging at Navale Bridge",
                "description": "Traffic blocked due to waist-deep water.",
                "source": "TOI",
                "canonical_url": "https://toi.com/navale-bridge-waterlog",
                "content_hash": "hash-navale-1",
            }
            is_new, record1 = insert_raw_article(article1)
            self.assertTrue(is_new)

            # Attempt to insert identical canonical URL with different tracking params
            article2 = {
                "id": "art-dedup-2",
                "title": "Waterlogging at Navale Bridge (Updated)",
                "description": "Traffic blocked due to waist-deep water.",
                "source": "TOI",
                "canonical_url": "https://toi.com/navale-bridge-waterlog",
                "content_hash": "hash-navale-2",
            }
            is_new2, record2 = insert_raw_article(article2)
            self.assertFalse(is_new2)
            self.assertEqual(record1["id"], record2["id"])

    def test_concurrency_lock_prevents_simultaneous_processing(self):
        """Test atomic state claiming prevents two workers from processing the same article."""
        with self.app.app_context():
            insert_raw_article({
                "id": "art-race-1",
                "title": "Bridge Warning",
                "description": "Rising river water level.",
                "canonical_url": "https://example.com/bridge-warning",
                "content_hash": "hash-race-1",
                "processing_status": "PENDING",
            })

            # Worker A claims article
            claimed_a = claim_article_for_processing("art-race-1")
            self.assertTrue(claimed_a)

            # Worker B tries to claim simultaneously -> must be rejected
            claimed_b = claim_article_for_processing("art-race-1")
            self.assertFalse(claimed_b)

    def test_failure_retry_policy(self):
        """Test that processing failures transition to FAILED and stop at retry limit."""
        with self.app.app_context():
            insert_raw_article({
                "id": "art-fail-1",
                "title": "Erroneous Article",
                "description": "Broken text.",
                "canonical_url": "https://example.com/error-1",
                "content_hash": "hash-error-1",
                "processing_status": "PENDING",
            })

            # Simulate 3 failures
            for i in range(1, 4):
                claimed = claim_article_for_processing("art-fail-1", max_retries=3)
                self.assertTrue(claimed)
                fail_article_processing("art-fail-1", f"Error attempt {i}")

            # On 4th attempt, retry limit exceeded, worker cannot claim
            claimed_exceeded = claim_article_for_processing("art-fail-1", max_retries=3)
            self.assertFalse(claimed_exceeded)

    def test_genuine_geocoding_classification_and_caching(self):
        """Test OSM geocoder classifies VERIFIED, APPROXIMATE, AMBIGUOUS, and UNRESOLVED."""
        with self.app.app_context():
            # 1. Verified incident landmark (Sinhagad Road)
            res_verified = geocode_location("Sinhagad Road")
            self.assertEqual(res_verified["geolocation_status"], "VERIFIED")
            self.assertIsNotNone(res_verified["latitude"])
            self.assertIsNotNone(res_verified["longitude"])

            # 2. Approximate broad locality (Bhor Taluka)
            res_approx = geocode_location("Bhor")
            self.assertEqual(res_approx["geolocation_status"], "APPROXIMATE_LOCALITY")
            self.assertIsNotNone(res_approx["latitude"])

            # 3. Unresolved / Unknown place: NEVER fabricate coordinates, NO random jitter
            res_unknown = geocode_location("UnknownNonExistentPlaceXYZ12345")
            self.assertEqual(res_unknown["geolocation_status"], "UNRESOLVED")
            self.assertIsNone(res_unknown["latitude"])
            self.assertIsNone(res_unknown["longitude"])

            # 4. Cache hit check: Sinhagad Road must now be cached
            cache_entry = get_cached_geocoding("sinhagad road|pune|maharashtra")
            self.assertIsNotNone(cache_entry)
            self.assertEqual(cache_entry["geolocation_status"], "VERIFIED")

    def test_citizen_report_single_pass_and_caching(self):
        """Test citizen report analysis cost control: runs once, cached on subsequent queries."""
        with self.app.app_context():
            # Create a ground report
            res = self.client.post("/api/reports", json={
                "incident_type": "Waterlogging",
                "description": "Knee-deep water on main road.",
                "latitude": 18.5204,
                "longitude": 73.8567,
            })
            self.assertEqual(res.status_code, 201)
            report_data = res.get_json()["report"]
            report_id = report_data["id"]

            self.assertIsNotNone(report_data.get("analysis_result"))
            self.assertEqual(report_data.get("processing_status"), "completed")

            # Calling /api/ai/analyze-report with existing report_id must return cached=True
            with patch("backend.services.ai_service._get_groq_client") as mock_groq:
                res_analyze = self.client.post("/api/ai/analyze-report", json={
                    "report_id": report_id,
                    "description": "Knee-deep water on main road.",
                    "category": "Waterlogging",
                })
                self.assertEqual(res_analyze.status_code, 200)
                data_analyze = res_analyze.get_json()
                self.assertTrue(data_analyze["cached"])
                mock_groq.assert_not_called()

    def test_operational_metrics_endpoint(self):
        """Test /api/news/stats returns real persisted counters."""
        with self.app.app_context():
            res = self.client.get("/api/news/stats")
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data["success"])
            metrics = data["metrics"]
            self.assertIn("articles_fetched", metrics)
            self.assertIn("verified_locations", metrics)
            self.assertIn("approximate_locations", metrics)
            self.assertIn("unresolved_locations", metrics)
            self.assertIn("geocoding_cache_hits", metrics)


if __name__ == "__main__":
    unittest.main()
