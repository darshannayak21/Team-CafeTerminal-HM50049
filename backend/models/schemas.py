"""Data contract definitions for the hazard scoring engine and services.

This module defines lightweight, structured schemas for hazard inputs and outputs,
establishing the contract between future data ingestion services, the hazard calculation
engine, and the API/frontend layer.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List


@dataclass
class Location:
    """Geographic coordinate representing latitude and longitude."""
    lat: float
    lon: float

    def to_dict(self) -> Dict[str, float]:
        """Convert Location instance to a JSON-compatible dictionary."""
        return {
            "lat": self.lat,
            "lon": self.lon,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Location":
        """Instantiate Location from a dictionary with validation.

        Args:
            data: Dictionary containing 'lat' and 'lon'.

        Returns:
            Location instance.

        Raises:
            ValueError: If 'lat' or 'lon' are missing or invalid.
        """
        if "lat" not in data or "lon" not in data:
            raise ValueError("Location requires 'lat' and 'lon' coordinates.")
        return cls(lat=float(data["lat"]), lon=float(data["lon"]))


@dataclass
class HazardInput:
    """Input contract for the hazard evaluation engine.

    Represents environmental observations and spatial indicators for a given location.

    Attributes:
        location: Geographic coordinates (lat, lon).
        rainfall_1h: Hourly rainfall rate in mm (short-term intensity).
        rainfall_24h: 24-hour cumulative rainfall in mm (intermediate accumulation).
        rainfall_72h: 72-hour cumulative rainfall in mm (soil saturation index).
        terrain_susceptibility: Normalized terrain factor [0.0 - 1.0] derived from slope/elevation.
        historical_flood_proximity: Normalized proximity factor [0.0 - 1.0] to historical flood zones.
    """
    location: Location
    rainfall_1h: float
    rainfall_24h: float
    rainfall_72h: float
    terrain_susceptibility: float
    historical_flood_proximity: float

    def validate(self) -> None:
        """Validate input field ranges and coordinate constraints.

        Raises:
            ValueError: If any attribute is None, non-numeric, or outside valid physical/normalized boundaries.
        """
        if self.location is None or not isinstance(self.location, Location):
            raise ValueError("HazardInput requires a valid 'location' of type Location.")
        if not (-90.0 <= self.location.lat <= 90.0):
            raise ValueError(
                f"Invalid latitude: {self.location.lat}. Latitude must be between -90.0 and 90.0."
            )
        if not (-180.0 <= self.location.lon <= 180.0):
            raise ValueError(
                f"Invalid longitude: {self.location.lon}. Longitude must be between -180.0 and 180.0."
            )

        for name, val in [
            ("rainfall_1h", self.rainfall_1h),
            ("rainfall_24h", self.rainfall_24h),
            ("rainfall_72h", self.rainfall_72h),
        ]:
            if val is None or not isinstance(val, (int, float)):
                raise ValueError(f"HazardInput field '{name}' must be a non-null number.")
            if val < 0.0:
                raise ValueError(f"HazardInput field '{name}' cannot be negative: {val}")

        for name, val in [
            ("terrain_susceptibility", self.terrain_susceptibility),
            ("historical_flood_proximity", self.historical_flood_proximity),
        ]:
            if val is None or not isinstance(val, (int, float)):
                raise ValueError(f"HazardInput field '{name}' must be a non-null number.")
            if not (0.0 <= val <= 1.0):
                raise ValueError(
                    f"HazardInput field '{name}' must be normalized within [0.0, 1.0], got {val}"
                )

    def to_dict(self) -> Dict[str, Any]:
        """Convert HazardInput instance to a JSON-compatible dictionary."""
        return {
            "location": self.location.to_dict(),
            "rainfall_1h": self.rainfall_1h,
            "rainfall_24h": self.rainfall_24h,
            "rainfall_72h": self.rainfall_72h,
            "terrain_susceptibility": self.terrain_susceptibility,
            "historical_flood_proximity": self.historical_flood_proximity,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "HazardInput":
        """Instantiate HazardInput from a dictionary.

        Args:
            data: Dictionary containing all required hazard input fields.

        Returns:
            HazardInput instance.

        Raises:
            ValueError: If required fields are missing or invalid.
        """
        if not isinstance(data, dict):
            raise ValueError("HazardInput.from_dict requires a dictionary.")

        loc_data = data.get("location")
        if not isinstance(loc_data, dict):
            raise ValueError("HazardInput requires a 'location' dictionary.")

        required_fields = [
            "rainfall_1h",
            "rainfall_24h",
            "rainfall_72h",
            "terrain_susceptibility",
            "historical_flood_proximity",
        ]
        for field_name in required_fields:
            if field_name not in data or data[field_name] is None:
                raise ValueError(f"HazardInput requires non-null field '{field_name}'.")

        instance = cls(
            location=Location.from_dict(loc_data),
            rainfall_1h=float(data["rainfall_1h"]),
            rainfall_24h=float(data["rainfall_24h"]),
            rainfall_72h=float(data["rainfall_72h"]),
            terrain_susceptibility=float(data["terrain_susceptibility"]),
            historical_flood_proximity=float(data["historical_flood_proximity"]),
        )
        instance.validate()
        return instance


@dataclass
class HazardOutput:
    """Output contract for the hazard evaluation engine.

    Represents computed hazard score, risk classification, contributing evidence factors,
    and individual normalized component scores.

    Attributes:
        hazard_score: Normalized composite hazard score in range [0.0, 1.0].
        risk_level: Qualitative risk category (e.g., 'LOW', 'MODERATE', 'HIGH', 'CRITICAL').
        evidence: List of contributing factors or threshold triggers explaining the score.
        component_scores: Breakdown of individual normalized component factors contributing to the score.
    """
    hazard_score: float
    risk_level: str
    evidence: List[str] = field(default_factory=list)
    component_scores: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert HazardOutput instance to a JSON-compatible dictionary."""
        output: Dict[str, Any] = {
            "hazard_score": self.hazard_score,
            "risk_level": self.risk_level,
            "evidence": list(self.evidence),
        }
        if self.component_scores:
            output["component_scores"] = dict(self.component_scores)
        return output

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "HazardOutput":
        """Instantiate HazardOutput from a dictionary.

        Args:
            data: Dictionary containing 'hazard_score', 'risk_level', and optional 'evidence'/'component_scores'.

        Returns:
            HazardOutput instance.

        Raises:
            ValueError: If required fields are missing or invalid.
        """
        if not isinstance(data, dict):
            raise ValueError("HazardOutput.from_dict requires a dictionary.")
        if "hazard_score" not in data or data["hazard_score"] is None:
            raise ValueError("HazardOutput requires non-null 'hazard_score'.")
        if "risk_level" not in data or data["risk_level"] is None:
            raise ValueError("HazardOutput requires non-null 'risk_level'.")

        comp_scores: Dict[str, float] = {}
        if "component_scores" in data and isinstance(data["component_scores"], dict):
            comp_scores = {str(k): float(v) for k, v in data["component_scores"].items()}

        return cls(
            hazard_score=float(data["hazard_score"]),
            risk_level=str(data["risk_level"]),
            evidence=list(data.get("evidence", [])),
            component_scores=comp_scores,
        )


@dataclass
class RainfallMetrics:
    """Precipitation metrics aggregated over short and multi-day observation windows.

    Attributes:
        rainfall_1h: Precipitation depth over the 1-hour interval in mm.
        rainfall_24h: Cumulative precipitation depth over 24 hours in mm.
        rainfall_72h: Cumulative precipitation depth over 72 hours in mm.
    """
    rainfall_1h: float
    rainfall_24h: float
    rainfall_72h: float

    def to_dict(self) -> Dict[str, float]:
        """Convert RainfallMetrics instance to a JSON-compatible dictionary."""
        return {
            "rainfall_1h": self.rainfall_1h,
            "rainfall_24h": self.rainfall_24h,
            "rainfall_72h": self.rainfall_72h,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RainfallMetrics":
        """Instantiate RainfallMetrics from a dictionary.

        Args:
            data: Dictionary containing 'rainfall_1h', 'rainfall_24h', and 'rainfall_72h'.

        Returns:
            RainfallMetrics instance.

        Raises:
            ValueError: If required fields are missing or invalid.
        """
        if not isinstance(data, dict):
            raise ValueError("RainfallMetrics.from_dict requires a dictionary.")

        for field_name in ("rainfall_1h", "rainfall_24h", "rainfall_72h"):
            if field_name not in data or data[field_name] is None:
                raise ValueError(f"RainfallMetrics requires non-null field '{field_name}'.")

        return cls(
            rainfall_1h=float(data["rainfall_1h"]),
            rainfall_24h=float(data["rainfall_24h"]),
            rainfall_72h=float(data["rainfall_72h"]),
        )


@dataclass
class HourlyPrecipitationData:
    """Internal contract for parsed precipitation observations from a weather provider.

    Attributes:
        latitude: Latitude coordinate of the observation point.
        longitude: Longitude coordinate of the observation point.
        timestamps: Chronological ISO-8601 timestamp strings for hourly intervals.
        precipitation: Hourly precipitation values in millimeters (mm).
        source: Name or identifier of data provider (e.g., 'open-meteo').
        fetched_at: ISO-8601 timestamp indicating when data was ingested.
    """
    latitude: float
    longitude: float
    timestamps: List[str]
    precipitation: List[float]
    source: str = "open-meteo"
    fetched_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def __post_init__(self):
        """Validate that timestamp and precipitation series align."""
        if len(self.timestamps) != len(self.precipitation):
            raise ValueError(
                f"Timestamps count ({len(self.timestamps)}) does not match "
                f"precipitation count ({len(self.precipitation)})."
            )

    def to_dict(self) -> Dict[str, Any]:
        """Convert HourlyPrecipitationData instance to a JSON-compatible dictionary."""
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "timestamps": list(self.timestamps),
            "precipitation": list(self.precipitation),
            "source": self.source,
            "fetched_at": self.fetched_at,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "HourlyPrecipitationData":
        """Instantiate HourlyPrecipitationData from a dictionary.

        Args:
            data: Dictionary containing weather observation fields.

        Returns:
            HourlyPrecipitationData instance.

        Raises:
            ValueError: If required fields are missing or invalid.
        """
        if "latitude" not in data or "longitude" not in data:
            raise ValueError("HourlyPrecipitationData requires 'latitude' and 'longitude'.")
        if "timestamps" not in data or "precipitation" not in data:
            raise ValueError("HourlyPrecipitationData requires 'timestamps' and 'precipitation'.")

        return cls(
            latitude=float(data["latitude"]),
            longitude=float(data["longitude"]),
            timestamps=[str(t) for t in data["timestamps"]],
            precipitation=[float(p) for p in data["precipitation"]],
            source=str(data.get("source", "open-meteo")),
            fetched_at=str(data.get("fetched_at", datetime.now(timezone.utc).isoformat())),
        )
