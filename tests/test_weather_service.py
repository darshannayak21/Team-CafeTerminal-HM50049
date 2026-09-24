"""Tests for Open-Meteo weather and rainfall data ingestion service."""

import io
import json
import os
import unittest
from unittest.mock import MagicMock, patch
import urllib.error

from backend.models.schemas import HourlyPrecipitationData
from backend.services.weather_service import (
    WeatherAPIError,
    WeatherParsingError,
    WeatherServiceError,
    build_open_meteo_url,
    fetch_open_meteo_raw,
    get_hourly_precipitation,
    parse_open_meteo_response,
    validate_coordinates,
)


class TestWeatherServiceCoordinatesValidation(unittest.TestCase):
    """Test validation of latitude and longitude coordinates."""

    def test_valid_coordinates(self):
        # Standard Pune coordinates
        validate_coordinates(18.5204, 73.8567)
        # Extreme boundary coordinates
        validate_coordinates(-90.0, -180.0)
        validate_coordinates(90.0, 180.0)
        validate_coordinates(0.0, 0.0)

    def test_invalid_latitude_out_of_bounds(self):
        with self.assertRaises(ValueError):
            validate_coordinates(91.0, 73.8567)
        with self.assertRaises(ValueError):
            validate_coordinates(-90.1, 73.8567)

    def test_invalid_longitude_out_of_bounds(self):
        with self.assertRaises(ValueError):
            validate_coordinates(18.5204, 181.0)
        with self.assertRaises(ValueError):
            validate_coordinates(18.5204, -180.5)

    def test_invalid_coordinate_types(self):
        with self.assertRaises(ValueError):
            validate_coordinates("18.52", 73.8567)  # type: ignore
        with self.assertRaises(ValueError):
            validate_coordinates(18.5204, None)  # type: ignore


class TestWeatherServiceURLBuilder(unittest.TestCase):
    """Test URL generation for Open-Meteo requests."""

    def test_build_open_meteo_url(self):
        url = build_open_meteo_url(
            latitude=18.5204,
            longitude=73.8567,
            past_days=3,
            forecast_days=1,
            base_url="https://api.open-meteo.com/v1/forecast",
        )
        self.assertTrue(url.startswith("https://api.open-meteo.com/v1/forecast?"))
        self.assertIn("latitude=18.5204", url)
        self.assertIn("longitude=73.8567", url)
        self.assertIn("hourly=precipitation", url)
        self.assertIn("past_days=3", url)
        self.assertIn("forecast_days=1", url)
        self.assertIn("timezone=UTC", url)

    def test_build_open_meteo_url_negative_days_clamped(self):
        url = build_open_meteo_url(
            latitude=18.5204,
            longitude=73.8567,
            past_days=-2,
            forecast_days=-1,
        )
        self.assertIn("past_days=0", url)
        self.assertIn("forecast_days=0", url)


class TestWeatherServiceFetchingAndErrors(unittest.TestCase):
    """Test HTTP fetching logic and error handling with mocked responses."""

    @patch("urllib.request.urlopen")
    def test_fetch_open_meteo_raw_success(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_payload = {
            "latitude": 18.52,
            "longitude": 73.86,
            "hourly": {
                "time": ["2026-09-25T00:00", "2026-09-25T01:00"],
                "precipitation": [0.0, 5.2],
            },
        }
        mock_response.read.return_value = json.dumps(mock_payload).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        data = fetch_open_meteo_raw(18.52, 73.86)
        self.assertEqual(data["latitude"], 18.52)
        self.assertEqual(data["hourly"]["precipitation"], [0.0, 5.2])

    @patch("urllib.request.urlopen")
    def test_fetch_http_error_handling(self, mock_urlopen):
        err_body = json.dumps({"reason": "Invalid parameter"}).encode("utf-8")
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.open-meteo.com/v1/forecast",
            code=400,
            msg="Bad Request",
            hdrs={},  # type: ignore
            fp=io.BytesIO(err_body),
        )

        with self.assertRaises(WeatherAPIError) as ctx:
            fetch_open_meteo_raw(18.52, 73.86)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Invalid parameter", str(ctx.exception))

    @patch("urllib.request.urlopen")
    def test_fetch_network_connection_error(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")

        with self.assertRaises(WeatherServiceError) as ctx:
            fetch_open_meteo_raw(18.52, 73.86)
        self.assertIn("Failed to connect", str(ctx.exception))

    @patch("urllib.request.urlopen")
    def test_fetch_timeout_error(self, mock_urlopen):
        mock_urlopen.side_effect = TimeoutError("Request timed out")

        with self.assertRaises(WeatherServiceError) as ctx:
            fetch_open_meteo_raw(18.52, 73.86)
        self.assertIn("timed out", str(ctx.exception))

    @patch("urllib.request.urlopen")
    def test_fetch_malformed_json_response(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_response.read.return_value = b"<html>Service Unavailable</html>"
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        with self.assertRaises(WeatherParsingError) as ctx:
            fetch_open_meteo_raw(18.52, 73.86)
        self.assertIn("Failed to decode Open-Meteo JSON", str(ctx.exception))

    @patch("urllib.request.urlopen")
    def test_fetch_api_error_payload(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_response.read.return_value = json.dumps(
            {"error": True, "reason": "Rate limit exceeded"}
        ).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        with self.assertRaises(WeatherAPIError) as ctx:
            fetch_open_meteo_raw(18.52, 73.86)
        self.assertIn("Rate limit exceeded", str(ctx.exception))


class TestWeatherServiceParsing(unittest.TestCase):
    """Test parsing and conversion of raw API structures into typed contracts."""

    def test_parse_successful_response(self):
        raw = {
            "latitude": 18.5204,
            "longitude": 73.8567,
            "hourly": {
                "time": ["2026-09-25T00:00", "2026-09-25T01:00", "2026-09-25T02:00"],
                "precipitation": [0.0, 12.5, 4.2],
            },
        }
        parsed = parse_open_meteo_response(raw)
        self.assertIsInstance(parsed, HourlyPrecipitationData)
        self.assertEqual(parsed.latitude, 18.5204)
        self.assertEqual(parsed.longitude, 73.8567)
        self.assertEqual(len(parsed.timestamps), 3)
        self.assertEqual(len(parsed.precipitation), 3)
        self.assertEqual(parsed.precipitation, [0.0, 12.5, 4.2])
        self.assertEqual(parsed.source, "open-meteo")
        self.assertIsNotNone(parsed.fetched_at)

    def test_parse_none_precipitation_raises_parsing_error(self):
        raw = {
            "latitude": 18.52,
            "longitude": 73.86,
            "hourly": {
                "time": ["2026-09-25T00:00", "2026-09-25T01:00"],
                "precipitation": [None, 3.5],
            },
        }
        with self.assertRaises(WeatherParsingError) as ctx:
            parse_open_meteo_response(raw)
        self.assertIn("index 0", str(ctx.exception))
        self.assertIn("Missing precipitation value", str(ctx.exception))

    def test_parse_missing_hourly_block(self):
        raw = {"latitude": 18.52, "longitude": 73.86}
        with self.assertRaises(WeatherParsingError) as ctx:
            parse_open_meteo_response(raw)
        self.assertIn("missing 'hourly' data block", str(ctx.exception))

    def test_parse_empty_precipitation_data(self):
        raw = {
            "latitude": 18.52,
            "longitude": 73.86,
            "hourly": {
                "time": [],
                "precipitation": [],
            },
        }
        with self.assertRaises(WeatherParsingError) as ctx:
            parse_open_meteo_response(raw)
        self.assertIn("empty", str(ctx.exception))

    def test_parse_mismatched_time_and_precipitation_lengths(self):
        raw = {
            "latitude": 18.52,
            "longitude": 73.86,
            "hourly": {
                "time": ["2026-09-25T00:00", "2026-09-25T01:00"],
                "precipitation": [1.5],
            },
        }
        with self.assertRaises(WeatherParsingError) as ctx:
            parse_open_meteo_response(raw)
        self.assertIn("Mismatched data lengths", str(ctx.exception))

    def test_parse_non_numeric_precipitation(self):
        raw = {
            "latitude": 18.52,
            "longitude": 73.86,
            "hourly": {
                "time": ["2026-09-25T00:00"],
                "precipitation": ["heavy_rain"],
            },
        }
        with self.assertRaises(WeatherParsingError) as ctx:
            parse_open_meteo_response(raw)
        self.assertIn("Non-numeric precipitation", str(ctx.exception))

    def test_parse_missing_coordinates_uses_fallback(self):
        raw = {
            "hourly": {
                "time": ["2026-09-25T00:00"],
                "precipitation": [2.0],
            },
        }
        parsed = parse_open_meteo_response(
            raw, fallback_latitude=18.52, fallback_longitude=73.86
        )
        self.assertEqual(parsed.latitude, 18.52)
        self.assertEqual(parsed.longitude, 73.86)


class TestWeatherServiceSampleFile(unittest.TestCase):
    """Test loading and parsing the reference sample Open-Meteo file."""

    def test_load_and_parse_sample_pune_data(self):
        sample_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "data",
            "sample",
            "open_meteo_pune_sample.json",
        )
        self.assertTrue(
            os.path.exists(sample_path), f"Sample file not found at {sample_path}"
        )

        with open(sample_path, "r", encoding="utf-8") as f:
            sample_data = json.load(f)

        self.assertIn("_metadata", sample_data)
        self.assertIn("SAMPLE / MOCK DATA ONLY", sample_data["_metadata"]["description"])

        parsed = parse_open_meteo_response(sample_data)
        self.assertEqual(parsed.latitude, 18.52)
        self.assertEqual(parsed.longitude, 73.86)
        self.assertEqual(len(parsed.timestamps), 48)
        self.assertEqual(len(parsed.precipitation), 48)
        self.assertAlmostEqual(max(parsed.precipitation), 42.5)


class TestHourlyPrecipitationDataContract(unittest.TestCase):
    """Test schema serialization and contract behavior of HourlyPrecipitationData."""

    def test_contract_serialization_round_trip(self):
        data = HourlyPrecipitationData(
            latitude=18.5204,
            longitude=73.8567,
            timestamps=["2026-09-25T00:00", "2026-09-25T01:00"],
            precipitation=[0.0, 15.2],
            source="open-meteo",
            fetched_at="2026-09-25T01:00:00Z",
        )
        as_dict = data.to_dict()
        self.assertEqual(as_dict["latitude"], 18.5204)
        self.assertEqual(as_dict["longitude"], 73.8567)
        self.assertEqual(as_dict["precipitation"], [0.0, 15.2])
        self.assertEqual(as_dict["source"], "open-meteo")

        restored = HourlyPrecipitationData.from_dict(as_dict)
        self.assertEqual(restored.latitude, data.latitude)
        self.assertEqual(restored.precipitation, data.precipitation)
        self.assertEqual(restored.fetched_at, data.fetched_at)

    def test_contract_length_mismatch_raises_value_error(self):
        with self.assertRaises(ValueError):
            HourlyPrecipitationData(
                latitude=18.5204,
                longitude=73.8567,
                timestamps=["2026-09-25T00:00"],
                precipitation=[1.0, 2.0],
            )


if __name__ == "__main__":
    unittest.main()
