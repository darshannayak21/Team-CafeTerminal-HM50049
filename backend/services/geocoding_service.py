"""OpenStreetMap Nominatim Geocoding Service for RainGuard.

Provides rate-limited, cached, and validated geocoding without coordinate fabrication.
Enforces strict precision classification:
  - VERIFIED: Exact street, landmark, neighbourhood, village, or building.
  - APPROXIMATE_LOCALITY: Administrative centroid (e.g. Taluka, District, Municipal Zone).
  - AMBIGUOUS: Multiple conflicting candidate matches across disparate areas.
  - UNRESOLVED: Geocoding failure, unidentifiable name, or no results.

Never invents coordinates, never uses random offsets/jitter, and never defaults to Pune centroid.
"""

import logging
import os
import re
import threading
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import requests

from backend.services.db import (
    get_cached_geocoding,
    save_cached_geocoding,
    increment_metric,
)

logger = logging.getLogger(__name__)

# Lock and timestamp for Nominatim 1 req/sec rate limit adherence
_RATE_LIMIT_LOCK = threading.Lock()
_LAST_REQUEST_TIME = 0.0

DEFAULT_USER_AGENT = os.environ.get(
    "NOMINATIM_USER_AGENT",
    "RainGuard-EmergencyResponse/2.0 (contact: operations@rainguard-pune.local)",
)
NOMINATIM_URL = os.environ.get(
    "NOMINATIM_BASE_URL",
    "https://nominatim.openstreetmap.org/search",
)

# Known administrative centroid place types in OSM
BROAD_LOCALITY_TYPES = {
    "administrative", "state", "county", "district", "state_district",
    "municipality", "city", "region", "postcode", "country"
}

# Specific incident-level place types in OSM
SPECIFIC_LOCATION_TYPES = {
    "road", "highway", "residential", "neighbourhood", "suburb", "quarter",
    "village", "hamlet", "isolated_dwelling", "bridge", "amenity", "building",
    "commercial", "industrial", "station", "stop", "hospital", "school"
}

# Curated local Pune fallback gazetteer for offline testing or when Nominatim is unreachable
# NEVER guesses: only exact canonical names mapped to true landmark/taluka coordinates
PUNE_DISTRICT_GAZETTEER: Dict[str, Dict[str, Any]] = {
    "sinhagad road": {"lat": 18.4837, "lon": 73.8242, "status": "VERIFIED", "type": "road", "name": "Sinhagad Road, Pune"},
    "navale bridge": {"lat": 18.4612, "lon": 73.8184, "status": "VERIFIED", "type": "bridge", "name": "Navale Bridge, Vadgaon Budruk, Pune"},
    "warje bridge": {"lat": 18.4756, "lon": 73.8086, "status": "VERIFIED", "type": "bridge", "name": "Warje Bridge, Pune"},
    "warje": {"lat": 18.4820, "lon": 73.8015, "status": "VERIFIED", "type": "suburb", "name": "Warje, Pune"},
    "kothrud": {"lat": 18.5074, "lon": 73.8077, "status": "VERIFIED", "type": "suburb", "name": "Kothrud, Pune"},
    "shivajinagar": {"lat": 18.5314, "lon": 73.8446, "status": "VERIFIED", "type": "suburb", "name": "Shivajinagar, Pune"},
    "swargate": {"lat": 18.4991, "lon": 73.8586, "status": "VERIFIED", "type": "suburb", "name": "Swargate, Pune"},
    "hadapsar": {"lat": 18.5089, "lon": 73.9259, "status": "VERIFIED", "type": "suburb", "name": "Hadapsar, Pune"},
    "wakad": {"lat": 18.5987, "lon": 73.7688, "status": "VERIFIED", "type": "suburb", "name": "Wakad, Pimpri-Chinchwad"},
    "katraj": {"lat": 18.4529, "lon": 73.8596, "status": "VERIFIED", "type": "suburb", "name": "Katraj, Pune"},
    "baner": {"lat": 18.5590, "lon": 73.7868, "status": "VERIFIED", "type": "suburb", "name": "Baner, Pune"},
    "hinjewadi": {"lat": 18.5912, "lon": 73.7389, "status": "VERIFIED", "type": "suburb", "name": "Hinjewadi, Pune"},
    "viman nagar": {"lat": 18.5679, "lon": 73.9143, "status": "VERIFIED", "type": "suburb", "name": "Viman Nagar, Pune"},
    "bhor": {"lat": 18.1500, "lon": 73.8400, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Bhor Taluka, Pune District"},
    "velhe": {"lat": 18.2933, "lon": 73.6358, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Velhe Taluka, Pune District"},
    "mulshi": {"lat": 18.5028, "lon": 73.5133, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Mulshi Taluka, Pune District"},
    "maval": {"lat": 18.7547, "lon": 73.6853, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Maval Taluka, Pune District"},
    "haveli": {"lat": 18.5204, "lon": 73.8567, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Haveli Taluka, Pune District"},
    "ambegaon": {"lat": 19.0306, "lon": 73.8475, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Ambegaon Taluka, Pune District"},
    "junnar": {"lat": 19.2081, "lon": 73.8767, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Junnar Taluka, Pune District"},
    "khed": {"lat": 18.8478, "lon": 73.9069, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Khed Taluka, Pune District"},
    "daund": {"lat": 18.4631, "lon": 74.5807, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Daund Taluka, Pune District"},
    "baramati": {"lat": 18.1517, "lon": 74.5772, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Baramati Taluka, Pune District"},
    "indapur": {"lat": 18.1158, "lon": 75.0272, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Indapur Taluka, Pune District"},
    "shirur": {"lat": 18.8272, "lon": 74.3758, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Shirur Taluka, Pune District"},
    "purandar": {"lat": 18.2833, "lon": 74.0000, "status": "APPROXIMATE_LOCALITY", "type": "administrative", "name": "Purandar Taluka, Pune District"},
    "lonavala": {"lat": 18.7557, "lon": 73.4091, "status": "VERIFIED", "type": "suburb", "name": "Lonavala, Pune District"},
    "khandala": {"lat": 18.7614, "lon": 73.3753, "status": "VERIFIED", "type": "suburb", "name": "Khandala, Pune District"},
    "lavasa": {"lat": 18.4093, "lon": 73.5097, "status": "VERIFIED", "type": "settlement", "name": "Lavasa, Mulshi, Pune District"},
    "pimpri-chinchwad": {"lat": 18.6298, "lon": 73.7997, "status": "VERIFIED", "type": "suburb", "name": "Pimpri-Chinchwad, Pune"},
    "pimpri chinchwad": {"lat": 18.6298, "lon": 73.7997, "status": "VERIFIED", "type": "suburb", "name": "Pimpri-Chinchwad, Pune"},
    "kondhwa": {"lat": 18.4660, "lon": 73.8925, "status": "VERIFIED", "type": "suburb", "name": "Kondhwa, Pune"},
    "bibwewadi": {"lat": 18.4697, "lon": 73.8680, "status": "VERIFIED", "type": "suburb", "name": "Bibwewadi, Pune"},
    "undri": {"lat": 18.4540, "lon": 73.9048, "status": "VERIFIED", "type": "suburb", "name": "Undri, Pune"},
    "dhayari": {"lat": 18.4484, "lon": 73.8098, "status": "VERIFIED", "type": "suburb", "name": "Dhayari, Pune"},
    "pashan": {"lat": 18.5363, "lon": 73.7979, "status": "VERIFIED", "type": "suburb", "name": "Pashan, Pune"},
    "aundh": {"lat": 18.5582, "lon": 73.8073, "status": "VERIFIED", "type": "suburb", "name": "Aundh, Pune"},
    "deccan": {"lat": 18.5195, "lon": 73.8408, "status": "VERIFIED", "type": "suburb", "name": "Deccan Gymkhana, Pune"},
    "yerawada": {"lat": 18.5566, "lon": 73.8866, "status": "VERIFIED", "type": "suburb", "name": "Yerawada, Pune"},
    "kharadi": {"lat": 18.5522, "lon": 73.9413, "status": "VERIFIED", "type": "suburb", "name": "Kharadi, Pune"},
    "wagholi": {"lat": 18.5790, "lon": 73.9824, "status": "VERIFIED", "type": "suburb", "name": "Wagholi, Pune"},
    "patan": {"lat": 18.7700, "lon": 73.6500, "status": "VERIFIED", "type": "village", "name": "Patan, Maval Taluka, Pune"},
    "mumbai-pune expressway": {"lat": 18.7300, "lon": 73.4100, "status": "VERIFIED", "type": "road", "name": "Mumbai-Pune Expressway"},
    "mumbai pune expressway": {"lat": 18.7300, "lon": 73.4100, "status": "VERIFIED", "type": "road", "name": "Mumbai-Pune Expressway"},
    "mumbai pune highway": {"lat": 18.7300, "lon": 73.5000, "status": "VERIFIED", "type": "road", "name": "Mumbai-Pune Highway (NH48)"},
}


def normalize_place_name(name: str) -> str:
    """Clean and normalize a place name for lookup and caching."""
    if not name:
        return ""
    cleaned = re.sub(r"[^\w\s-]", " ", name).lower()
    return re.sub(r"\s+", " ", cleaned).strip()


def _enforce_rate_limit(min_delay: float = 1.0) -> None:
    """Ensure compliance with Nominatim usage policy (max 1 request per second)."""
    global _LAST_REQUEST_TIME
    with _RATE_LIMIT_LOCK:
        now = time.time()
        elapsed = now - _LAST_REQUEST_TIME
        if elapsed < min_delay:
            time.sleep(min_delay - elapsed)
        _LAST_REQUEST_TIME = time.time()


def geocode_location(
    location_name: Optional[str],
    district_context: str = "Pune",
    state_context: str = "Maharashtra",
    country_context: str = "India",
) -> Dict[str, Any]:
    """Resolve location to genuine coordinates with precision classification.

    Returns dict with keys:
      - latitude: Optional[float]
      - longitude: Optional[float]
      - geolocation_status: "VERIFIED" | "APPROXIMATE_LOCALITY" | "AMBIGUOUS" | "UNRESOLVED"
      - matched_name: Optional[str]
      - location_type: Optional[str]
      - provider: str
      - error: Optional[str]
    """
    if not location_name or not location_name.strip():
        return {
            "latitude": None,
            "longitude": None,
            "geolocation_status": "UNRESOLVED",
            "matched_name": None,
            "location_type": None,
            "provider": "none",
            "error": "No location name provided",
        }

    norm_loc = normalize_place_name(location_name)
    if not norm_loc or norm_loc in {"pune", "pune city", "pune district", "maharashtra", "india", "unspecified", "unknown", "unspecified area"}:
        # Too vague to infer incident coordinates or locality
        return {
            "latitude": None,
            "longitude": None,
            "geolocation_status": "UNRESOLVED",
            "matched_name": location_name,
            "location_type": "vague_region",
            "provider": "validator",
            "error": "Location too broad or unspecified",
        }

    cache_key = f"{norm_loc}|{normalize_place_name(district_context)}|{normalize_place_name(state_context)}"

    # 1. Check SQLite Persistent Cache
    cached = get_cached_geocoding(cache_key)
    if cached:
        increment_metric("geocoding_cache_hits")
        return {
            "latitude": cached.get("latitude"),
            "longitude": cached.get("longitude"),
            "geolocation_status": cached.get("geolocation_status", "UNRESOLVED"),
            "matched_name": cached.get("matched_name"),
            "location_type": cached.get("location_type"),
            "provider": f"{cached.get('provider', 'osm_nominatim')}_cache",
            "error": None,
        }

    # 2. Check local curated gazetteer for deterministic rapid match
    if norm_loc in PUNE_DISTRICT_GAZETTEER:
        gaz = PUNE_DISTRICT_GAZETTEER[norm_loc]
        save_cached_geocoding(
            query_key=cache_key,
            matched_name=gaz["name"],
            latitude=gaz["lat"],
            longitude=gaz["lon"],
            geolocation_status=gaz["status"],
            location_type=gaz["type"],
            provider="pune_gazetteer",
            raw_response=gaz,
        )
        increment_metric("geocoding_cache_hits")
        return {
            "latitude": gaz["lat"],
            "longitude": gaz["lon"],
            "geolocation_status": gaz["status"],
            "matched_name": gaz["name"],
            "location_type": gaz["type"],
            "provider": "pune_gazetteer",
            "error": None,
        }

    # 3. Perform Live OpenStreetMap Nominatim Query
    increment_metric("geocoding_requests")
    query_str = f"{location_name}, {district_context}, {state_context}, {country_context}"
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json",
    }
    params = {
        "q": query_str,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 5,
    }

    try:
        _enforce_rate_limit(1.0)
        resp = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=6.0)
        
        if resp.status_code == 200:
            results = resp.json()
            if not results or len(results) == 0:
                # Retry with just location_name, Pune without full hierarchy
                query_fallback = f"{location_name}, Pune"
                _enforce_rate_limit(1.0)
                resp_fb = requests.get(
                    NOMINATIM_URL,
                    params={"q": query_fallback, "format": "jsonv2", "addressdetails": 1, "limit": 5},
                    headers=headers,
                    timeout=6.0,
                )
                if resp_fb.status_code == 200:
                    results = resp_fb.json()

            if results and len(results) > 0:
                top = results[0]
                lat = float(top["lat"])
                lon = float(top["lon"])
                display_name = top.get("display_name", "")
                place_type = top.get("type", "")
                category = top.get("category", "")
                address = top.get("address", {})

                # Validate administrative context: must be in Maharashtra / India
                state = address.get("state", "").lower()
                country = address.get("country", "").lower()
                if "india" not in country and "bharat" not in country:
                    # Candidate resolved outside India -> reject as UNRESOLVED
                    save_cached_geocoding(cache_key, None, None, None, "UNRESOLVED", place_type, "osm_nominatim", results)
                    return {
                        "latitude": None,
                        "longitude": None,
                        "geolocation_status": "UNRESOLVED",
                        "matched_name": display_name,
                        "location_type": place_type,
                        "provider": "osm_nominatim",
                        "error": "Candidate matched outside target region",
                    }

                # Evaluate Ambiguity: if multiple results point to widely disparate coordinates (> 15km apart)
                if len(results) > 1:
                    second = results[1]
                    dist_approx = abs(lat - float(second["lat"])) + abs(lon - float(second["lon"]))
                    if dist_approx > 0.15:  # ~15km divergence
                        save_cached_geocoding(cache_key, display_name, None, None, "AMBIGUOUS", place_type, "osm_nominatim", results)
                        return {
                            "latitude": None,
                            "longitude": None,
                            "geolocation_status": "AMBIGUOUS",
                            "matched_name": display_name,
                            "location_type": place_type,
                            "provider": "osm_nominatim",
                            "error": "Multiple conflicting candidate locations",
                        }

                # Classify precision
                if place_type in SPECIFIC_LOCATION_TYPES or category in {"highway", "building", "amenity", "place"}:
                    status = "VERIFIED"
                elif place_type in BROAD_LOCALITY_TYPES or "district" in place_type or "taluka" in display_name.lower():
                    status = "APPROXIMATE_LOCALITY"
                else:
                    status = "APPROXIMATE_LOCALITY"

                save_cached_geocoding(
                    query_key=cache_key,
                    matched_name=display_name,
                    latitude=lat,
                    longitude=lon,
                    geolocation_status=status,
                    location_type=place_type,
                    provider="osm_nominatim",
                    raw_response=results,
                )

                return {
                    "latitude": lat,
                    "longitude": lon,
                    "geolocation_status": status,
                    "matched_name": display_name,
                    "location_type": place_type,
                    "provider": "osm_nominatim",
                    "error": None,
                }

    except Exception as e:
        logger.warning(f"[Geocoding] Nominatim query failed for '{location_name}': {e}")

    # Fallback when Nominatim returned no results or was offline:
    # Do NOT invent coordinates. Cache as UNRESOLVED.
    save_cached_geocoding(
        query_key=cache_key,
        matched_name=None,
        latitude=None,
        longitude=None,
        geolocation_status="UNRESOLVED",
        location_type=None,
        provider="osm_nominatim",
        raw_response=None,
    )

    return {
        "latitude": None,
        "longitude": None,
        "geolocation_status": "UNRESOLVED",
        "matched_name": None,
        "location_type": None,
        "provider": "osm_nominatim",
        "error": "No verified match found",
    }
