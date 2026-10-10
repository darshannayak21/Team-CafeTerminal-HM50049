import unittest
from unittest.mock import patch, MagicMock
import json
import os
from datetime import datetime, timezone
from twilio.request_validator import RequestValidator

from backend.app import create_app
from backend.config import TestingConfig
from backend.services.db import get_connection

class TestWhatsAppIntegration(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Ensure clean DB state for tests
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM reports WHERE source = 'whatsapp'")
            conn.commit()

        # Set Twilio auth token
        os.environ["TWILIO_AUTH_TOKEN"] = "test_auth_token"
        
        # Validator for signing requests in tests
        self.validator = RequestValidator("test_auth_token")

    def tearDown(self):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM reports WHERE source = 'whatsapp'")
            conn.commit()
        self.app_context.pop()

    def generate_signature(self, url, params):
        return self.validator.compute_signature(url, params)

    @patch("backend.routes.whatsapp.analyze_citizen_report")
    @patch("backend.routes.whatsapp.extract_news_location_and_hazard")
    @patch("backend.routes.whatsapp.geocode_location")
    def test_whatsapp_text_only(self, mock_geocode, mock_extract, mock_analyze):
        mock_extract.return_value = {"exact_location_name": "Test Road"}
        mock_geocode.return_value = {"latitude": 18.1, "longitude": 73.1, "geolocation_status": "VERIFIED"}
        mock_analyze.return_value = {
            "is_relevant": True,
            "verified_severity": "HIGH",
            "detected_hazards": ["standing_water"]
        }

        params = {
            "MessageSid": "SM12345",
            "From": "whatsapp:+1234567890",
            "Body": "Flood on Test Road",
            "NumMedia": "0"
        }
        
        url = "http://localhost/api/whatsapp"
        signature = self.generate_signature(url, params)
        
        response = self.client.post(
            "/api/whatsapp",
            data=params,
            headers={"X-Twilio-Signature": signature}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Thank you. Your report has been verified", response.data)
        
        # Check DB
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM reports WHERE id = 'WA-SM12345'")
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["incident_type"], "WhatsApp Report")
            self.assertEqual(row["description"], "Flood on Test Road")
            self.assertEqual(row["latitude"], 18.1)
            self.assertEqual(row["longitude"], 73.1)

    @patch("backend.routes.whatsapp.analyze_citizen_report")
    @patch("backend.routes.whatsapp.requests.get")
    def test_whatsapp_with_media_and_location(self, mock_get, mock_analyze):
        mock_analyze.return_value = {
            "is_relevant": True,
            "verified_severity": "CRITICAL",
            "detected_hazards": ["structural_damage"]
        }
        
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = b"fake_image_data"
        mock_get.return_value = mock_resp

        params = {
            "MessageSid": "SM67890",
            "From": "whatsapp:+0987654321",
            "Body": "Bridge collapsed",
            "NumMedia": "1",
            "MediaUrl0": "https://api.twilio.com/media/test",
            "MediaContentType0": "image/jpeg",
            "Latitude": "18.5",
            "Longitude": "73.8"
        }
        
        url = "http://localhost/api/whatsapp"
        signature = self.generate_signature(url, params)
        
        response = self.client.post(
            "/api/whatsapp",
            data=params,
            headers={"X-Twilio-Signature": signature}
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Check DB
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM reports WHERE id = 'WA-SM67890'")
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertIsNotNone(row["image_url"])
            self.assertTrue(row["image_url"].startswith("/api/uploads/"))
            self.assertEqual(row["latitude"], 18.5)
            self.assertEqual(row["longitude"], 73.8)

    @patch("backend.routes.whatsapp.analyze_citizen_report")
    def test_whatsapp_duplicate_message(self, mock_analyze):
        mock_analyze.return_value = {"is_relevant": True, "verified_severity": "LOW"}
        
        params = {
            "MessageSid": "SM_DUP",
            "From": "whatsapp:+111",
            "Body": "Hello",
            "NumMedia": "0",
            "Latitude": "10.0",
            "Longitude": "10.0"
        }
        url = "http://localhost/api/whatsapp"
        signature = self.generate_signature(url, params)
        
        # First request
        self.client.post("/api/whatsapp", data=params, headers={"X-Twilio-Signature": signature})
        
        # Second request (duplicate)
        response2 = self.client.post("/api/whatsapp", data=params, headers={"X-Twilio-Signature": signature})
        
        self.assertEqual(response2.status_code, 200)
        self.assertIn(b"We already received this report", response2.data)
        
        # Analyze should be called only once
        mock_analyze.assert_called_once()

    def test_whatsapp_invalid_signature(self):
        params = {
            "MessageSid": "SM_BAD",
            "From": "whatsapp:+111",
            "Body": "Hack attempt",
            "NumMedia": "0"
        }
        # In tests, if TWILIO_AUTH_TOKEN is set and app is not TESTING, it will validate.
        # Wait, our TestingConfig sets TESTING=True. Let's temporarily mock app_is_testing to False
        with patch("backend.routes.whatsapp.app_is_testing", return_value=False):
            response = self.client.post(
                "/api/whatsapp",
                data=params,
                headers={"X-Twilio-Signature": "fake_signature"}
            )
            self.assertEqual(response.status_code, 403)
            self.assertIn(b"Invalid Twilio Signature", response.data)
