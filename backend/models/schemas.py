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
        loc_data = data.get("location")
        if not isinstance(loc_data, dict):
            raise ValueError("HazardInput requires a 'location' dictionary.")

        return cls(
            location=Location.from_dict(loc_data),
            rainfall_1h=float(data["rainfall_1h"]),
            rainfall_24h=float(data["rainfall_24h"]),
            rainfall_72h=float(data["rainfall_72h"]),
            terrain_susceptibility=float(data["terrain_susceptibility"]),
            historical_flood_proximity=float(data["historical_flood_proximity"]),
        )


@dataclass
class HazardOutput:
    """Output contract for the hazard evaluation engine.

    Represents computed hazard score, risk classification, and contributing evidence factors.

    Attributes:
        hazard_score: Normalized composite hazard score in range [0.0, 1.0].
        risk_level: Qualitative risk category (e.g., 'LOW', 'MODERATE', 'HIGH', 'CRITICAL').
        evidence: List of contributing factors or threshold triggers explaining the score.
    """
    hazard_score: float
    risk_level: str
    evidence: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert HazardOutput instance to a JSON-compatible dictionary."""
        return {
            "hazard_score": self.hazard_score,
            "risk_level": self.risk_level,
            "evidence": list(self.evidence),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "HazardOutput":
        """Instantiate HazardOutput from a dictionary.

        Args:
            data: Dictionary containing 'hazard_score', 'risk_level', and optional 'evidence'.

        Returns:
            HazardOutput instance.

        Raises:
            ValueError: If required fields are missing or invalid.
        """
        if "hazard_score" not in data or "risk_level" not in data:
            raise ValueError("HazardOutput requires 'hazard_score' and 'risk_level'.")

        return cls(
            hazard_score=float(data["hazard_score"]),
            risk_level=str(data["risk_level"]),
            evidence=list(data.get("evidence", [])),
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
