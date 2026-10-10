import os
import time
import logging
import requests
from shapely.geometry import LineString, Point
from shapely.ops import nearest_points

logger = logging.getLogger(__name__)

# Cache for traffic incidents
_TRAFFIC_CACHE = {
    "data": [],
    "last_fetched": 0
}

TRAFFIC_CACHE_TTL = 300  # 5 minutes

def fetch_live_traffic():
    """Fetch live traffic incidents from TomTom API.
    Uses caching to avoid excessive API calls.
    Returns a list of dicts with keys: 'id', 'delay', 'geometry' (Shapely LineString)
    """
    global _TRAFFIC_CACHE
    now = time.time()
    
    if _TRAFFIC_CACHE["data"] and (now - _TRAFFIC_CACHE["last_fetched"]) < TRAFFIC_CACHE_TTL:
        return _TRAFFIC_CACHE["data"]
        
    api_key = os.getenv("TOMTOM_API_KEY")
    if not api_key:
        logger.warning("[TrafficService] TOMTOM_API_KEY not found. Using baseline travel times.")
        return []
        
    # Bounding box for Pune (approximate)
    # format: minLon,minLat,maxLon,maxLat
    bbox = "73.65,18.40,74.00,18.70"
    
    url = f"https://api.tomtom.com/traffic/services/5/incidentDetails"
    params = {
        "bbox": bbox,
        "fields": "{incidents{properties{id,delay,magnitudeOfDelay,iconCategory},geometry{type,coordinates}}}",
        "language": "en-US",
        "timeValidityFilter": "present",
        "key": api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            incidents = data.get("incidents", [])
            
            parsed_incidents = []
            for inc in incidents:
                props = inc.get("properties", {})
                delay = props.get("delay", 0)  # Delay in seconds
                if delay <= 0:
                    continue
                    
                geom_data = inc.get("geometry", {})
                coords = geom_data.get("coordinates", [])
                if len(coords) < 2:
                    continue
                    
                # TomTom returns [[lon, lat], [lon, lat]]
                line = LineString(coords)
                parsed_incidents.append({
                    "id": props.get("id"),
                    "delay": delay,
                    "magnitude": props.get("magnitudeOfDelay", 0),
                    "geometry": line
                })
                
            logger.info(f"[TrafficService] Fetched {len(parsed_incidents)} traffic incidents.")
            
            try:
                from shapely.strtree import STRtree
            except ImportError:
                STRtree = None
                
            tree = STRtree([inc["geometry"] for inc in parsed_incidents]) if parsed_incidents and STRtree else None
            
            _TRAFFIC_CACHE["data"] = (parsed_incidents, tree)
            _TRAFFIC_CACHE["last_fetched"] = now
            return _TRAFFIC_CACHE["data"]
        else:
            logger.error(f"[TrafficService] API error {response.status_code}: {response.text}")
            return [], None
    except Exception as e:
        logger.error(f"[TrafficService] Request failed: {e}")
        return [], None
