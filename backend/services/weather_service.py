"""Weather and rainfall data ingestion service.

This module provides functions to fetch, validate, and parse hourly precipitation data
from the public Open-Meteo API into structured internal data contracts.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import urllib.error
import urllib.parse
import urllib.request

from backend.config import Config
from backend.models.schemas import HourlyPrecipitationData

logger = logging.getLogger(__name__)


class WeatherServiceError(Exception):
    """Base exception for weather data ingestion service errors."""
    pass


class WeatherAPIError(WeatherServiceError):
    """Exception raised when the weather provider API returns an HTTP or payload error."""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class WeatherParsingError(WeatherServiceError):
    """Exception raised when weather provider data is malformed or missing required fields."""
    pass


def validate_coordinates(latitude: float, longitude: float) -> None:
    """Validate latitude and longitude values against geographic boundaries.

    Args:
        latitude: Latitude coordinate (-90.0 to 90.0).
        longitude: Longitude coordinate (-180.0 to 180.0).

    Raises:
        ValueError: If coordinates are outside valid geographic ranges.
    """
    if not isinstance(latitude, (int, float)) or not (-90.0 <= latitude <= 90.0):
        raise ValueError(
            f"Invalid latitude: {latitude}. Latitude must be a float between -90.0 and 90.0."
        )
    if not isinstance(longitude, (int, float)) or not (-180.0 <= longitude <= 180.0):
        raise ValueError(
            f"Invalid longitude: {longitude}. Longitude must be a float between -180.0 and 180.0."
        )


def build_open_meteo_url(
    latitude: float,
    longitude: float,
    past_days: int = Config.WEATHER_DEFAULT_PAST_DAYS,
    forecast_days: int = Config.WEATHER_DEFAULT_FORECAST_DAYS,
    base_url: str = Config.OPEN_METEO_BASE_URL,
) -> str:
    """Build the fully-qualified Open-Meteo forecast API request URL.

    Args:
        latitude: Latitude of target location.
        longitude: Longitude of target location.
        past_days: Number of past observation days to include.
        forecast_days: Number of forecast days to include.
        base_url: Base endpoint URL for Open-Meteo forecast API.

    Returns:
        Complete URL string with encoded query parameters.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "precipitation",
        "past_days": max(0, past_days),
        "forecast_days": max(0, forecast_days),
        "timezone": "UTC",
    }
    query_string = urllib.parse.urlencode(params)
    return f"{base_url}?{query_string}"


def fetch_open_meteo_raw(
    latitude: float,
    longitude: float,
    past_days: int = Config.WEATHER_DEFAULT_PAST_DAYS,
    forecast_days: int = Config.WEATHER_DEFAULT_FORECAST_DAYS,
    base_url: str = Config.OPEN_METEO_BASE_URL,
    timeout: int = Config.WEATHER_REQUEST_TIMEOUT_SECONDS,
) -> Dict[str, Any]:
    """Fetch raw weather JSON response from the Open-Meteo forecast API.

    Args:
        latitude: Target latitude coordinate.
        longitude: Target longitude coordinate.
        past_days: Number of historical days to retrieve.
        forecast_days: Number of forecast days to retrieve.
        base_url: Open-Meteo base API endpoint.
        timeout: HTTP request timeout in seconds.

    Returns:
        Parsed JSON dictionary from the Open-Meteo response.

    Raises:
        ValueError: If coordinates are out of bounds.
        WeatherAPIError: If Open-Meteo returns HTTP error or error payload.
        WeatherParsingError: If response body is not valid JSON.
        WeatherServiceError: If a connection or timeout error occurs.
    """
    validate_coordinates(latitude, longitude)
    url = build_open_meteo_url(
        latitude=latitude,
        longitude=longitude,
        past_days=past_days,
        forecast_days=forecast_days,
        base_url=base_url,
    )

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "HackMatrix-CafeTerminal/1.0 (Disaster-Response-Platform)"},
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status_code = response.getcode()
            if status_code != 200:
                raise WeatherAPIError(
                    f"Open-Meteo returned unexpected status code: {status_code}",
                    status_code=status_code,
                )
            raw_body = response.read().decode("utf-8")
    except urllib.error.HTTPError as http_err:
        err_msg = f"Open-Meteo HTTP request failed with status {http_err.code}: {http_err.reason}"
        try:
            err_body = http_err.read().decode("utf-8")
            err_data = json.loads(err_body)
            if "reason" in err_data:
                err_msg += f" - {err_data['reason']}"
        except Exception:
            pass
        raise WeatherAPIError(err_msg, status_code=http_err.code) from http_err
    except urllib.error.URLError as url_err:
        raise WeatherServiceError(
            f"Failed to connect to Open-Meteo service: {url_err.reason}"
        ) from url_err
    except (TimeoutError, OSError) as os_err:
        raise WeatherServiceError(
            f"Request to Open-Meteo timed out or failed: {str(os_err)}"
        ) from os_err

    try:
        data = json.loads(raw_body)
    except json.JSONDecodeError as json_err:
        raise WeatherParsingError(
            f"Failed to decode Open-Meteo JSON response: {str(json_err)}"
        ) from json_err

    if isinstance(data, dict) and data.get("error") is True:
        reason = data.get("reason", "Unknown API error")
        raise WeatherAPIError(f"Open-Meteo API reported error: {reason}")

    return data


def parse_open_meteo_response(
    raw_data: Dict[str, Any],
    fallback_latitude: Optional[float] = None,
    fallback_longitude: Optional[float] = None,
) -> HourlyPrecipitationData:
    """Parse and normalize Open-Meteo response dictionary into HourlyPrecipitationData contract.

    Args:
        raw_data: Raw JSON dictionary from Open-Meteo API.
        fallback_latitude: Latitude to use if missing from response.
        fallback_longitude: Longitude to use if missing from response.

    Returns:
        Structured HourlyPrecipitationData instance.

    Raises:
        WeatherParsingError: If required fields or precipitation series are missing or malformed.
    """
    if not isinstance(raw_data, dict):
        raise WeatherParsingError("Expected JSON object from Open-Meteo response.")

    lat = raw_data.get("latitude", fallback_latitude)
    lon = raw_data.get("longitude", fallback_longitude)

    if lat is None or lon is None:
        raise WeatherParsingError("Response missing latitude or longitude.")

    try:
        lat = float(lat)
        lon = float(lon)
    except (TypeError, ValueError) as conv_err:
        raise WeatherParsingError(f"Invalid coordinate format in response: {conv_err}")

    hourly = raw_data.get("hourly")
    if not isinstance(hourly, dict):
        raise WeatherParsingError("Response missing 'hourly' data block.")

    times = hourly.get("time")
    precip = hourly.get("precipitation")

    if not isinstance(times, list) or not isinstance(precip, list):
        raise WeatherParsingError(
            "Hourly block must contain 'time' and 'precipitation' lists."
        )

    if len(times) == 0 or len(precip) == 0:
        raise WeatherParsingError("Hourly precipitation data is empty.")

    if len(times) != len(precip):
        raise WeatherParsingError(
            f"Mismatched data lengths: {len(times)} timestamps vs {len(precip)} precipitation values."
        )

    cleaned_precip = []
    for idx, val in enumerate(precip):
        if val is None:
            raise WeatherParsingError(
                f"Missing precipitation value (None) at index {idx}."
            )
        try:
            cleaned_precip.append(float(val))
        except (TypeError, ValueError):
            raise WeatherParsingError(
                f"Non-numeric precipitation value at index {idx}: {val}"
            )

    timestamps = [str(t) for t in times]

    return HourlyPrecipitationData(
        latitude=lat,
        longitude=lon,
        timestamps=timestamps,
        precipitation=cleaned_precip,
        source="open-meteo",
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )


def get_hourly_precipitation(
    latitude: float,
    longitude: float,
    past_days: int = Config.WEATHER_DEFAULT_PAST_DAYS,
    forecast_days: int = Config.WEATHER_DEFAULT_FORECAST_DAYS,
    base_url: str = Config.OPEN_METEO_BASE_URL,
    timeout: int = Config.WEATHER_REQUEST_TIMEOUT_SECONDS,
) -> HourlyPrecipitationData:
    """Fetch and parse hourly precipitation data for a geographic coordinate.

    Orchestrates URL construction, HTTP fetching, error validation, and contract parsing.

    Args:
        latitude: Target latitude coordinate.
        longitude: Target longitude coordinate.
        past_days: Historical window in days.
        forecast_days: Forecast window in days.
        base_url: Open-Meteo endpoint URL.
        timeout: HTTP request timeout in seconds.

    Returns:
        Structured HourlyPrecipitationData contract.

    Raises:
        ValueError: On invalid coordinates.
        WeatherAPIError: On Open-Meteo API errors.
        WeatherParsingError: On malformed responses.
        WeatherServiceError: On connection or timeout errors.
    """
    raw_data = fetch_open_meteo_raw(
        latitude=latitude,
        longitude=longitude,
        past_days=past_days,
        forecast_days=forecast_days,
        base_url=base_url,
        timeout=timeout,
    )
    return parse_open_meteo_response(
        raw_data=raw_data,
        fallback_latitude=latitude,
        fallback_longitude=longitude,
    )
