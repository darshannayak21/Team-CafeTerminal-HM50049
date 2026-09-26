# Elevation & Flood Risk Calculations

This folder contains the raw SRTM (Shuttle Radar Topography Mission) data and the conversion logic used to generate the high-performance elevation backend for Pune, India. 

Because loading and parsing raw binary data on every API request is too slow, we convert it into a NumPy `.npy` array ahead of time.

## 1. Raw Data (`.hgt` files)
- **N18E073.hgt**: Covers the 1°x1° grid from 18°N to 19°N and 73°E to 74°E (Western edge of Pune district / Sahyadris).
- **N18E074.hgt**: Covers the 1°x1° grid from 18°N to 19°N and 74°E to 75°E (Eastern half of Pune district).

*Note: These files are ~25MB each. If you clone this repository and they are missing, you can run `python download_tiles.py` to fetch them from AWS Open Data.*

## 2. Generating the NumPy Array
Run the conversion script to stitch the two tiles together and export a `pune_elevation_merged.npy` file into the `backend/data` folder:
```bash
python convert_hgt.py
```
**How it works:**
- Each `.hgt` file is a 3601 x 3601 grid of 16-bit signed integers (Big Endian `>h`).
- The script unpacks the binary files using `struct.unpack`.
- It stitches them horizontally. Since column 3600 of E073 overlaps perfectly with column 0 of E074, we slice out the overlap and produce a `3601 x 7201` array covering exactly `73.0°E to 75.0°E`.

## 3. Coordinate Math
When the Flask backend (`backend/routes/elevation.py`) queries this array, it relies on this exact mapping to convert Lat/Lng into X/Y indices:
```python
x_index = int((longitude - 73.0) * 3600)
y_index = int((19.0 - latitude) * 3600)
```
*(Notice `19.0 - latitude` because array rows increase as you move South).*

## 4. Flood Risk Algorithm
The algorithm determines risk out of 100 points based on three factors:
1. **Elevation Percentile**: We calculate how the current point compares to the rest of the map. If the percentile is < 20% (or elevation < mean - 15m), we add up to **30 points**.
2. **Topographical Slope**: We sample the elevation at the center, 30m North (`lat + 0.0003`), and 30m East (`lng + 0.0003`). If the calculated slope is < 3° (meaning flat land where water pools), we add **25 points**.
3. **Local Rainfall**: Added proportionally based on mm/hr (up to **30 points**).

## 5. Dynamic Heatmap Generation
The frontend uses Leaflet's `moveend` and `zoomend` events to fetch the exact localized bounding box from the API. The backend slices the `.npy` array, calculates the *local* minimum and maximum, and applies a Blue (Dangerous/Low) to Red (Safe/High) gradient. 
This dynamic generation ensures micro-topography contrast is always crisp regardless of zoom level.
