"""Tests for Ground Reports and Simulated News API endpoints."""

import io
import os
import shutil
import tempfile
import unittest

from backend.app import create_app
from backend.config import TestingConfig
from backend.services.db import init_db


class TestReportsAPI(unittest.TestCase):
    """Test suite for citizen reports and news endpoints."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.test_db = os.path.join(self.temp_dir, "test_rainguard.db")
        self.test_uploads = os.path.join(self.temp_dir, "test_uploads")
        os.makedirs(self.test_uploads, exist_ok=True)

        class CustomTestingConfig(TestingConfig):
            DATABASE_PATH = self.test_db
            UPLOAD_FOLDER = self.test_uploads

        self.app = create_app(CustomTestingConfig)
        self.client = self.app.test_client()
        with self.app.app_context():
            init_db()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_create_report_json(self):
        """Test creating a report via JSON payload."""
        payload = {
            "incident_type": "Road Blocked",
            "description": "Fallen tree blocking both lanes near Katraj Ghat",
            "latitude": 18.4520,
            "longitude": 73.8640,
            "accuracy": 8.5,
            "location_name": "Katraj Ghat Road",
        }
        response = self.client.post("/api/reports", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertTrue(data["success"])
        report = data["report"]
        self.assertEqual(report["incident_type"], "Road Blocked")
        self.assertEqual(report["latitude"], 18.4520)
        self.assertEqual(report["longitude"], 73.8640)
        self.assertEqual(report["source"], "ground_report")
        self.assertEqual(report["status"], "pending")
        self.assertTrue(report["id"].startswith("RG-"))

    def test_create_report_multipart_with_image(self):
        """Test creating a report with multipart form data including an image."""
        image_content = b"fake-jpeg-image-binary-stream-data"
        data = {
            "incident_type": "Flooded Road",
            "description": "Water level reaching 2 feet near bridge",
            "latitude": "18.4600",
            "longitude": "73.8231",
            "accuracy": "10.0",
            "location_name": "Navale Bridge approach",
            "image": (io.BytesIO(image_content), "field_photo.jpg"),
        }
        response = self.client.post("/api/reports", data=data, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 201)
        res_data = response.get_json()
        self.assertTrue(res_data["success"])
        report = res_data["report"]
        self.assertIsNotNone(report["image_url"])
        self.assertIn("/api/uploads/", report["image_url"])

        # Test retrieving the uploaded image
        img_url = report["image_url"]
        img_response = self.client.get(img_url)
        self.assertEqual(img_response.status_code, 200)
        self.assertEqual(img_response.data, image_content)

    def test_create_report_validation_errors(self):
        """Test validation errors for missing fields and out of bounds coordinates."""
        # 1. Missing incident type
        res = self.client.post("/api/reports", json={"latitude": 18.5, "longitude": 73.8})
        self.assertEqual(res.status_code, 400)
        self.assertIn("incident_type", res.get_json()["error"].lower())

        # 2. Missing coordinates
        res = self.client.post("/api/reports", json={"incident_type": "Landslide"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("coordinates", res.get_json()["error"].lower())

        # 3. Out of bounds coordinates
        res = self.client.post("/api/reports", json={
            "incident_type": "Landslide",
            "latitude": 999.0,
            "longitude": 73.8
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("out of bounds", res.get_json()["error"].lower())

        # 4. Disallowed file extension
        bad_file_data = {
            "incident_type": "Waterlogging",
            "latitude": "18.5",
            "longitude": "73.8",
            "image": (io.BytesIO(b"executable"), "malicious.exe"),
        }
        res = self.client.post("/api/reports", data=bad_file_data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        self.assertIn("invalid image format", res.get_json()["error"].lower())

    def test_list_and_get_reports(self):
        """Test listing reports and fetching by ID."""
        self.client.post("/api/reports", json={
            "incident_type": "Bridge Damage",
            "description": "Scouring visible",
            "latitude": 18.51,
            "longitude": 73.85,
        })
        res2 = self.client.post("/api/reports", json={
            "incident_type": "Power Infrastructure Damage",
            "description": "Transformer spark",
            "latitude": 18.52,
            "longitude": 73.86,
        })
        r2_id = res2.get_json()["report"]["id"]

        list_res = self.client.get("/api/reports")
        self.assertEqual(list_res.status_code, 200)
        reports = list_res.get_json()["reports"]
        self.assertGreaterEqual(len(reports), 2)

        single_res = self.client.get(f"/api/reports/{r2_id}")
        self.assertEqual(single_res.status_code, 200)
        self.assertEqual(single_res.get_json()["report"]["id"], r2_id)

        not_found_res = self.client.get("/api/reports/NONEXISTENT-999")
        self.assertEqual(not_found_res.status_code, 404)

    def test_list_news(self):
        """Test retrieving the news items."""
        res = self.client.get("/api/news")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(len(data["news"]), 1)


if __name__ == "__main__":
    unittest.main()
