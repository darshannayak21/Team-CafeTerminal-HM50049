import os
import time
from urllib import request, error
import json
from flask import Blueprint, jsonify
from concurrent.futures import ThreadPoolExecutor

rainfall_bp = Blueprint('rainfall', __name__)

STATIONS = [
    {"id": 1, "name": "NIMGIRI", "lat": 19.2092, "lng": 73.8725},
    {"id": 2, "name": "SHIVAJINAGAR1", "lat": 18.5386, "lng": 73.8420},
    {"id": 3, "name": "LAVASA", "lat": 18.4144, "lng": 73.5069},
    {"id": 4, "name": "DAPODI", "lat": 18.6032, "lng": 73.8541},
    {"id": 5, "name": "HADAPSAR", "lat": 18.4659, "lng": 73.9244},
    {"id": 6, "name": "DAUND", "lat": 18.5056, "lng": 74.3304},
    {"id": 7, "name": "LONAVALA", "lat": 18.7240, "lng": 73.3697},
    {"id": 8, "name": "HAVELI / LONIKALBHOR", "lat": 18.4697, "lng": 74.0013},
    {"id": 9, "name": "NARAYANGOAN", "lat": 19.1003, "lng": 73.9655},
    {"id": 10, "name": "BARAMATI", "lat": 18.1530, "lng": 74.5003},
    {"id": 11, "name": "PASHAN1", "lat": 18.5167, "lng": 73.8500},
    {"id": 12, "name": "RAJGURUNAGAR", "lat": 18.8410, "lng": 73.8840},
    {"id": 13, "name": "TALEGAON", "lat": 18.7220, "lng": 73.6632},
    {"id": 14, "name": "BALLALWADI", "lat": 19.2396, "lng": 73.9155},
    {"id": 15, "name": "KOREGAON PARK", "lat": 18.5400, "lng": 73.8886},
    {"id": 16, "name": "CHINCHWAD", "lat": 18.6595, "lng": 73.7987},
    {"id": 17, "name": "GIRIVAN", "lat": 18.5607, "lng": 73.5211},
    {"id": 18, "name": "BHOR", "lat": 18.0728, "lng": 73.6706},
    {"id": 19, "name": "JUNNAR", "lat": 19.2070, "lng": 73.8679},
    {"id": 20, "name": "KHADAKWADI", "lat": 18.9052, "lng": 74.0938},
    {"id": 21, "name": "LAVALE", "lat": 18.5363, "lng": 73.7325},
    {"id": 22, "name": "MAGARPATTA", "lat": 18.5115, "lng": 73.9285},
    {"id": 23, "name": "AMBEGAON", "lat": 19.1574, "lng": 73.6811},
    {"id": 24, "name": "PASHAN2", "lat": 18.5383, "lng": 73.8045},
    {"id": 25, "name": "SHIVANE", "lat": 18.4700, "lng": 73.7800},
    {"id": 26, "name": "INDAPUR", "lat": 18.1748, "lng": 74.6890},
    {"id": 27, "name": "SHIRUR", "lat": 18.8344, "lng": 74.0536},
    {"id": 28, "name": "DUDULGAON", "lat": 18.6751, "lng": 73.8772},
    {"id": 29, "name": "SHIVAJINAGAR2", "lat": 18.5286, "lng": 73.8493},
    {"id": 30, "name": "DHAMDHERE", "lat": 18.6710, "lng": 74.1480},
    {"id": 31, "name": "KHED", "lat": 18.9390, "lng": 73.7744},
    {"id": 32, "name": "WADGAON SHERI", "lat": 18.5482, "lng": 73.9278},
    {"id": 33, "name": "W PURANDAR", "lat": 18.1748, "lng": 74.1498}
]

cache = {
    "data": None,
    "last_fetched": 0
}

CACHE_DURATION = 300  # 5 minutes

def fetch_station(station):
    api_key = os.environ.get("OPENWEATHER_API_KEY", "89c163c854ce95c12338dac1fc4d3f0e")
    if not api_key:
        print("OPENWEATHER_API_KEY is not set.")
        return None
        
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={station['lat']}&lon={station['lng']}&appid={api_key}&units=metric"
    try:
        req = request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            rain_1h = 0.0
            if 'rain' in data and '1h' in data['rain']:
                rain_1h = data['rain']['1h']
            
            return {
                "id": station["id"],
                "name": station["name"],
                "lat": station["lat"],
                "lng": station["lng"],
                "temp": data.get("main", {}).get("temp"),
                "humidity": data.get("main", {}).get("humidity"),
                "wind_speed": data.get("wind", {}).get("speed"),
                "rain_1h": rain_1h,
                "condition": data.get("weather", [{}])[0].get("main", "Unknown"),
                "timestamp": data.get("dt")
            }
    except Exception as e:
        print(f"Error fetching {station['name']}: {e}")
        return None

@rainfall_bp.route('/api/rainfall/live')
def get_live_rainfall():
    global cache
    now = time.time()
    
    if cache["data"] and (now - cache["last_fetched"]) < CACHE_DURATION:
        return jsonify({"success": True, "cached": True, "data": cache["data"]})
        
    results = []
    # 10 workers ensures we are respectful to the API while being fast
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(fetch_station, s) for s in STATIONS]
        for f in futures:
            res = f.result()
            if res:
                results.append(res)
                
    if results:
        cache["data"] = results
        cache["last_fetched"] = now
        return jsonify({"success": True, "cached": False, "data": results})
    else:
        return jsonify({"success": False, "error": "Failed to fetch data or missing API key"}), 500
