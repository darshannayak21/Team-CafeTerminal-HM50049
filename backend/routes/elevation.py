import os
import io
import base64
import math
import numpy as np
from PIL import Image
from flask import Blueprint, jsonify, request
import logging

logger = logging.getLogger(__name__)

elevation_bp = Blueprint('elevation', __name__)

class ElevationProcessor:
    def __init__(self, file_path):
        print(f"Loading NPY file: {file_path}")
        try:
            self.elevation_data = np.load(file_path)
            self.mean_elevation = float(np.mean(self.elevation_data))
            self.total_elements = self.elevation_data.size
            print(f"Mean elevation: {self.mean_elevation:.1f}m")
        except Exception as e:
            print(f"Failed to load NPY file: {e}")
            self.elevation_data = None
            self.mean_elevation = 550
            self.total_elements = 3601 * 3601

    def get_indices(self, lat, lng):
        """Convert lat/lng to grid indices with clamping."""
        x = int((lng - 73.0) * 3600)
        y = int((19.0 - lat) * 3600)
        x = max(0, min(7200, x))
        y = max(0, min(3600, y))
        return y, x

    def get_elevation_at_coord(self, lat, lng):
        if self.elevation_data is None:
            return None
        y, x = self.get_indices(lat, lng)
        return int(self.elevation_data[y, x])

    def get_elevation_percentile(self, elev):
        if self.elevation_data is None or elev is None:
            return 50.0
        percentile = (np.sum(self.elevation_data < elev) / self.total_elements) * 100
        return float(percentile)

    def calculate_slope(self, lat, lng):
        center = self.get_elevation_at_coord(lat, lng)
        north = self.get_elevation_at_coord(lat + 0.0003, lng)
        east = self.get_elevation_at_coord(lat, lng + 0.0003)
        
        if any(e is None for e in [center, north, east]):
            return None
            
        slope_deg = math.degrees(
            math.atan((abs(north - center) + abs(east - center)) / 2 / 30)
        )
        return float(slope_deg)

class FloodRiskCalculator:
    def __init__(self, elevation_processor):
        self.elev = elevation_processor
        
    def assess_flood_risk(self, lat, lng, current_rain_mm_hr=0):
        try:
            elev = self.elev.get_elevation_at_coord(lat, lng)
            if elev is None:
                return {'risk_level': 'UNKNOWN', 'score': 0, 'color': '#808080'}
                
            elev_percentile = self.elev.get_elevation_percentile(elev)
            slope = self.elev.calculate_slope(lat, lng)
            
            # Elevation Risk
            elev_risk = 0
            if elev_percentile < 20:
                elev_risk = 30
            elif elev < (self.elev.mean_elevation - 15):
                elev_risk = 25
                
            # Slope Risk
            slope_risk = 0
            if slope is not None and slope < 3:
                slope_risk = 25
                
            # Rain Risk
            rain_risk = 0
            if current_rain_mm_hr > 25:
                rain_risk = 30
            elif current_rain_mm_hr > 10:
                rain_risk = 15
                
            total_risk = min(100, elev_risk + slope_risk + rain_risk)
            
            if total_risk >= 70:
                risk_level = 'VERY HIGH'
                color = '#ff0000'
            elif total_risk >= 50:
                risk_level = 'HIGH'
                color = '#ff9900'
            elif total_risk >= 30:
                risk_level = 'MODERATE'
                color = '#ffff00'
            else:
                risk_level = 'LOW'
                color = '#00ff00'
                
            return {
                'risk_level': risk_level,
                'score': total_risk,
                'color': color,
                'elevation': elev,
                'elev_percentile': elev_percentile,
                'slope': slope,
                'rain_mm_hr': current_rain_mm_hr
            }
        except Exception as e:
            logger.error(f"Risk calculation error: {e}")
            return {'risk_level': 'UNKNOWN', 'score': 0, 'color': '#808080'}

# Initialize globally
NPY_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'pune_elevation_merged.npy')
processor = ElevationProcessor(NPY_FILE_PATH)
risk_calculator = FloodRiskCalculator(processor)


@elevation_bp.route('/api/elevation/at-point')
def get_elevation_at_point():
    """Endpoint A: /api/elevation/at-point"""
    try:
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        
        if lat is None or lng is None:
            return jsonify({'success': False, 'error': 'Missing lat or lng parameter'}), 400
            
        if not (18.0 <= lat <= 19.0) or not (73.0 <= lng <= 75.0):
            return jsonify({'success': False, 'error': 'Coordinates outside supported bounds (18-19N, 73-75E)'}), 400
            
        elev = processor.get_elevation_at_coord(lat, lng)
        if elev is None:
            return jsonify({'success': False, 'error': 'Elevation data unavailable'}), 500
            
        # Get risk assessment
        rain = request.args.get('rain_mm_hr', type=float, default=0)
        risk = risk_calculator.assess_flood_risk(lat, lng, rain)
        
        return jsonify({
            'success': True,
            'lat': lat,
            'lng': lng,
            'elevation': elev,
            'risk_assessment': risk
        })
    except Exception as e:
        logger.error(f'Point elevation error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


@elevation_bp.route('/api/elevation/heatmap')
def get_elevation_heatmap():
    """Endpoint B: /api/elevation/heatmap"""
    try:
        if processor.elevation_data is None:
            return jsonify({'success': False, 'error': 'Elevation data not loaded'}), 500
            
        lat_min = request.args.get('lat_min', type=float, default=18.0)
        lat_max = request.args.get('lat_max', type=float, default=19.0)
        lng_min = request.args.get('lng_min', type=float, default=73.0)
        lng_max = request.args.get('lng_max', type=float, default=75.0)
        width = request.args.get('width', type=int, default=512)
        height = request.args.get('height', type=int, default=256)
        
        y_max_idx, x_min_idx = processor.get_indices(lat_min, lng_min)
        y_min_idx, x_max_idx = processor.get_indices(lat_max, lng_max)
        
        if x_min_idx >= x_max_idx or y_min_idx >= y_max_idx:
             return jsonify({'success': False, 'error': 'Invalid bounds'}), 400

        region_data = processor.elevation_data[y_min_idx:y_max_idx, x_min_idx:x_max_idx]
        
        min_elev = np.min(region_data)
        max_elev = np.max(region_data)
        
        if min_elev == max_elev:
            min_elev -= 1
            max_elev += 1
            
        normalized = (region_data - min_elev) / (max_elev - min_elev)
        img_array = np.zeros((height, width, 4), dtype=np.uint8)
        
        y_indices = np.linspace(0, region_data.shape[0] - 1, height).astype(int)
        x_indices = np.linspace(0, region_data.shape[1] - 1, width).astype(int)
        
        for y in range(height):
            for x in range(width):
                src_y = y_indices[y]
                src_x = x_indices[x]
                norm_val = normalized[src_y, src_x]
                
                # 0.0 - 0.25: Red to Yellow (Low lying areas / dangerous)
                if norm_val < 0.25:
                    ratio = norm_val / 0.25
                    r = 255
                    g = int(255 * ratio)
                    b = 0
                    a = 200  # Opaque and clearly visible
                # 0.25 - 0.50: Yellow to Green
                elif norm_val < 0.5:
                    ratio = (norm_val - 0.25) / 0.25
                    r = int(255 * (1 - ratio))
                    g = 255
                    b = 0
                    a = 160
                # 0.50 - 0.75: Green to Cyan
                elif norm_val < 0.75:
                    ratio = (norm_val - 0.5) / 0.25
                    r = 0
                    g = 255
                    b = int(255 * ratio)
                    a = 120
                # 0.75 - 1.00: Cyan to Blue (Highest points / safe)
                else:
                    ratio = (norm_val - 0.75) / 0.25
                    r = 0
                    g = int(255 * (1 - ratio))
                    b = 255
                    a = 80  # more transparent for high/safe areas
                
                img_array[y, x] = [r, g, b, a]
        
        img = Image.fromarray(img_array, 'RGBA')
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        img_base64 = base64.b64encode(img_io.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_base64}',
            'min_elevation': int(min_elev),
            'max_elevation': int(max_elev),
            'bounds': {
                'north': lat_max,
                'south': lat_min,
                'east': lng_max,
                'west': lng_min
            }
        })
    except Exception as e:
        logger.error(f'Heatmap error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500
