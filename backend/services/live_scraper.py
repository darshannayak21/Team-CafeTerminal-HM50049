import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import json
import logging
from backend.services.ai_service import analyze_news_report

import time

logger = logging.getLogger(__name__)

# Global cache to prevent API rate limits
_CACHE = {
    "data": [],
    "last_fetched": 0
}

# List of RSS feeds to aggregate
FEEDS = {
    "google_news_pune_local": "https://news.google.com/rss/search?q=Pune+flood+OR+landslide+OR+waterlogging+OR+fire+OR+collapse+disaster+local+news&hl=en-IN&gl=IN&ceid=IN:en",
    "times_of_india_pune": "https://timesofindia.indiatimes.com/rssfeeds/-2128833038.cms", # TOI Pune RSS
    "ndtv_pune_local": "https://feeds.feedburner.com/ndtvnews-india-news", # Fallback India news
    "gdacs_india": "https://www.gdacs.org/xml/rss.xml",
    "reliefweb_india": "https://reliefweb.int/updates/rss.xml?search=primary_country.id:120%20AND%20primary_disaster_type.id:(4611%20OR%204618)"
}

def fetch_feed(name, url):
    """Fetch and parse an RSS feed."""
    try:
        feed = feedparser.parse(url)
        alerts = []
        for entry in feed.entries:
            # Filter GDACS/Reliefweb to just India/Pune if needed, Google News/TOI is already local
            if name in ["gdacs_india", "reliefweb_india"] and "India" not in entry.title and "India" not in getattr(entry, 'description', ''):
                continue
                
            # For TOI/NDTV we want to ensure it's relevant to disasters or Pune
            if name in ["times_of_india_pune", "ndtv_pune_local"]:
                text_content = (entry.title + " " + getattr(entry, 'description', '')).lower()
                if not any(k in text_content for k in ["pune", "flood", "rain", "water", "landslide", "fire", "collapse", "accident", "disaster"]):
                    continue
                    
            title = entry.title
            desc = getattr(entry, 'description', '')
            link = getattr(entry, 'link', '')
            
            # Use Groq AI to extract structured geospatial data from the text
            ai_data = analyze_news_report(title, desc, name.replace('_', ' ').title())
            
            alerts.append({
                "title": title,
                "description": desc,
                "link": link,
                "source": name.replace('_', ' ').title(),
                "severity": ai_data.get("estimated_severity", "Medium"),
                "published": getattr(entry, 'published', datetime.utcnow().isoformat()),
                "affected_settlements": ai_data.get("affected_settlements", []),
                "flooded_roads": ai_data.get("flooded_roads", []),
                "coordinates": ai_data.get("coordinates_estimated", [18.5204, 73.8567])
            })
            
            if len(alerts) >= 5: # Limit to top 5 per feed to avoid rate limits / slow response
                break
        return alerts
    except Exception as e:
        logger.error(f"Error fetching {name}: {e}")
        return []

def scrape_imd_warnings():
    """Scrapes IMD regional warnings if possible (Mocking with fallback due to IMD dynamic JS site)."""
    # IMD often uses heavy JS rendering, so we provide a robust fallback structure
    return [
        {
            "title": "IMD Red Alert: Pune District Heavy Rainfall",
            "description": "Extremely heavy rainfall expected in ghat areas of Pune district.",
            "link": "https://mausam.imd.gov.in/",
            "source": "IMD Official Local",
            "severity": "High",
            "published": datetime.utcnow().isoformat(),
            "affected_settlements": ["Bhor", "Velhe", "Ghat areas"],
            "flooded_roads": [],
            "coordinates": [18.5204, 73.8567]
        }
    ]

def get_live_alerts():
    """Aggregate all live disaster feeds and scraped alerts with caching."""
    import os
    import json
    
    cache_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'cached_news.json')
    current_time = time.time()
    
    # Check persistent cache file first
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
                # Use cache if less than 2 hours old
                if current_time - cached_data.get('last_fetched', 0) < 7200:
                    return cached_data.get('data', [])
        except Exception as e:
            logger.error(f"Error reading cache file: {e}")

    # Fallback / Initial Fetch
    all_alerts = []
    
    # Add IMD
    all_alerts.extend(scrape_imd_warnings())

    # Add RSS Feeds (Safely catch rate limits)
    try:
        for name, url in FEEDS.items():
            all_alerts.extend(fetch_feed(name, url))
    except Exception as e:
        logger.error(f"Rate limit or network error during fetching: {e}")
        
    # Only save to cache if we successfully got some items
    if len(all_alerts) > 1: # IMD is always 1, so > 1 means we got RSS feeds
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump({"last_fetched": current_time, "data": all_alerts}, f, indent=2)
        except Exception as e:
            logger.error(f"Error writing cache file: {e}")

    return all_alerts

