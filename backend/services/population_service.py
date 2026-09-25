"""Population service for real geospatial aggregation of WorldPop raster data.

Aggregates gridded population counts (WorldPop GeoTIFF) over official settlement
and administrative boundary polygons using spatial masking, CRS reconciliation,
and strict nodata handling.
"""

import json
import math
import os
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import rasterio
import rasterio.mask
import rasterio.warp
from shapely.geometry import shape, mapping
from shapely.ops import transform as shapely_transform

from backend.models.schemas import Settlement


def verify_raster_dataset(raster_path: str) -> Dict[str, Any]:
    """Verify that a raster dataset exists, is readable, and covers Pune District.

    Args:
        raster_path: Path to the GeoTIFF file.

    Returns:
        Dictionary containing metadata, dimensions, CRS, bounds, nodata, and Pune coverage.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file is not a valid readable raster.
    """
    if not os.path.exists(raster_path):
        raise FileNotFoundError(f"Raster file not found: {raster_path}")

    try:
        with rasterio.open(raster_path) as src:
            bounds = src.bounds
            crs_str = str(src.crs) if src.crs else "UNKNOWN"
            nodata_val = src.nodata

            # Pune District approximate bounding box: lat 18.05 to 19.38 N, lon 73.32 to 75.17 E
            pune_covered = (
                bounds.left <= 73.32 and bounds.right >= 75.17 and
                bounds.bottom <= 18.05 and bounds.top >= 19.38
            )

            return {
                "file_path": raster_path,
                "driver": src.driver,
                "width": src.width,
                "height": src.height,
                "count": src.count,
                "crs": crs_str,
                "bounds": {
                    "left": bounds.left,
                    "bottom": bounds.bottom,
                    "right": bounds.right,
                    "top": bounds.top,
                },
                "nodata": nodata_val,
                "pune_covered": bool(pune_covered),
            }
    except Exception as e:
        raise ValueError(f"Failed to read raster dataset at '{raster_path}': {e}") from e


def aggregate_polygon_population(
    raster_source: Union[str, rasterio.io.DatasetReader],
    geometry: Union[Dict[str, Any], Any],
    geom_crs: str = "EPSG:4326",
) -> float:
    """Spatially aggregate population counts within a boundary polygon.

    Properly handles:
    - CRS differences: reprojects polygon geometries to match raster CRS.
    - Raster nodata: excludes nodata values and non-finite cells.
    - Population counts: calculates total sum of counts within the polygon mask.
    - Edge/intersection handling: ensures non-overlapping or boundary edge pixels are cleanly filtered.

    Args:
        raster_source: Opened rasterio DatasetReader or path to raster file.
        geometry: GeoJSON geometry dict or Shapely geometry object.
        geom_crs: Coordinate reference system of the input geometry (default: EPSG:4326).

    Returns:
        Total aggregated population count as a float.

    Raises:
        ValueError: If geometry is invalid or population calculation fails.
    """
    if isinstance(geometry, dict):
        poly_geom = shape(geometry)
        geojson_dict = geometry
    else:
        poly_geom = geometry
        geojson_dict = mapping(geometry)

    if poly_geom.is_empty or not poly_geom.is_valid:
        raise ValueError("Invalid or empty geometry provided for population aggregation.")

    close_after = False
    if isinstance(raster_source, str):
        if not os.path.exists(raster_source):
            raise FileNotFoundError(f"Raster file not found: {raster_source}")
        src = rasterio.open(raster_source)
        close_after = True
    else:
        src = raster_source

    try:
        raster_crs = src.crs
        # Reproject geometry if CRS differs
        if raster_crs and geom_crs and str(raster_crs).upper() != str(geom_crs).upper():
            reprojected_geom = _reproject_geometry(poly_geom, geom_crs, str(raster_crs))
            shapes_to_mask = [mapping(reprojected_geom)]
        else:
            shapes_to_mask = [geojson_dict]

        nodata_val = src.nodata

        try:
            out_img, _ = rasterio.mask.mask(src, shapes_to_mask, crop=True, all_touched=False)
        except ValueError:
            # Raised by rasterio when shapes do not overlap raster
            return 0.0

        band_data = out_img[0]

        # Filter out nodata, infinite values, and NaN
        if nodata_val is not None:
            valid_mask = (band_data != nodata_val) & np.isfinite(band_data)
        else:
            valid_mask = np.isfinite(band_data)

        # Population counts cannot be negative
        valid_mask = valid_mask & (band_data >= 0.0)

        valid_population = band_data[valid_mask]
        if len(valid_population) == 0:
            return 0.0

        total_pop = float(np.sum(valid_population))
        return total_pop
    finally:
        if close_after:
            src.close()


def _reproject_geometry(geom: Any, from_crs: str, to_crs: str) -> Any:
    """Reproject a Shapely geometry from one CRS to another."""
    from rasterio.warp import transform_geom
    transformed_dict = transform_geom(from_crs, to_crs, mapping(geom))
    return shape(transformed_dict)


def load_and_aggregate_settlements(
    raster_path: str,
    boundary_geojson_path: str,
    id_key: str = "id",
    name_key: str = "name",
    taluka_key: Optional[str] = "taluka",
    district_filter: Optional[str] = None,
) -> List[Settlement]:
    """Load boundary features from GeoJSON, aggregate population, and return Settlement list.

    Args:
        raster_path: Path to WorldPop population raster GeoTIFF.
        boundary_geojson_path: Path to administrative or settlement GeoJSON.
        id_key: Property name containing unique settlement ID.
        name_key: Property name containing settlement name.
        taluka_key: Property name containing taluka / subdivision name.
        district_filter: Optional district filter string (e.g. 'pune').

    Returns:
        List of validated Settlement instances with real population counts.

    Raises:
        FileNotFoundError: If raster or GeoJSON file does not exist.
        ValueError: If files are malformed or missing required attributes.
    """
    if not os.path.exists(boundary_geojson_path):
        raise FileNotFoundError(f"Boundary file not found: {boundary_geojson_path}")

    with open(boundary_geojson_path, "r", encoding="utf-8") as f:
        geojson_data = json.load(f)

    features = geojson_data.get("features", [])
    if not features:
        raise ValueError(f"No features found in boundary file: {boundary_geojson_path}")

    # Detect geometry CRS if defined
    crs_prop = geojson_data.get("crs", {}).get("properties", {}).get("name", "EPSG:4326")
    if "CRS84" in crs_prop or "4326" in crs_prop:
        geom_crs = "EPSG:4326"
    else:
        geom_crs = crs_prop

    settlements: List[Settlement] = []

    with rasterio.open(raster_path) as src:
        for idx, feat in enumerate(features):
            props = feat.get("properties", {})

            # Optional district filter
            if district_filter:
                dist_val = str(props.get("districtId") or props.get("district") or "").lower()
                if dist_val != district_filter.lower():
                    continue

            # Resolve settlement ID
            settlement_id = props.get(id_key) or props.get("id") or props.get("lgdCode")
            if not settlement_id:
                settlement_id = f"settlement-{idx + 1}"
            settlement_id = str(settlement_id).strip()

            # Resolve name
            name = props.get(name_key) or props.get("name") or props.get("sourceName")
            if not name:
                name = f"Unnamed Area {idx + 1}"
            name = str(name).strip()

            # Resolve taluka
            taluka = None
            if taluka_key and taluka_key in props:
                taluka = str(props[taluka_key]).strip()
            elif "district" in props:
                taluka = str(props["district"]).strip()
            elif "districtId" in props and props["districtId"] == "pune":
                # For Pune taluka layers, the taluka itself is the division
                taluka = name

            geom = feat.get("geometry")
            if not geom:
                continue

            sh_geom = shape(geom)
            centroid = sh_geom.centroid
            lat = float(centroid.y)
            lon = float(centroid.x)

            # Spatial population aggregation
            pop_count = aggregate_polygon_population(src, geom, geom_crs=geom_crs)

            settlement = Settlement(
                settlement_id=settlement_id,
                name=name,
                latitude=lat,
                longitude=lon,
                population=round(pop_count, 1),
                taluka=taluka,
                geometry=geom,
            )
            settlement.validate()
            settlements.append(settlement)

    return settlements


def process_and_save_pune_settlements(
    raster_path: str,
    boundary_path: str,
    output_path: str,
) -> List[Settlement]:
    """Process real WorldPop raster against Pune boundaries and save to processed JSON.

    Args:
        raster_path: Path to WorldPop population raster GeoTIFF.
        boundary_path: Path to Pune boundaries GeoJSON (talukas or wards).
        output_path: Destination path for processed settlements JSON.

    Returns:
        List of generated Settlement instances.
    """
    settlements = load_and_aggregate_settlements(
        raster_path=raster_path,
        boundary_geojson_path=boundary_path,
        id_key="id",
        name_key="name",
        taluka_key="name",
    )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    payload = {
        "_metadata": {
            "source_raster": "WorldPop Global 2000-2020 1km ppp (IND 2020)",
            "source_boundaries": "Local Government Directory (LGD) Subdistricts",
            "geographic_scope": "Pune District, Maharashtra, India",
            "total_settlements": len(settlements),
            "total_population": sum(s.population for s in settlements),
        },
        "settlements": [s.to_dict() for s in settlements],
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    return settlements
