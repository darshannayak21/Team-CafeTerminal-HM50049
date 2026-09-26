"""Minimal backend configuration module."""

import os

try:
    with open(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())
except FileNotFoundError:
    pass


class Config:
    """Base configuration for backend application."""
    ENV = os.environ.get("FLASK_ENV", "production")
    DEBUG = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1", "t")
    TESTING = False
    PORT = int(os.environ.get("PORT", 5000))
    HOST = os.environ.get("HOST", "0.0.0.0")

    # Open-Meteo Weather Service Configuration
    OPEN_METEO_BASE_URL = os.environ.get(
        "OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast"
    )
    WEATHER_REQUEST_TIMEOUT_SECONDS = int(
        os.environ.get("WEATHER_REQUEST_TIMEOUT_SECONDS", 10)
    )
    WEATHER_DEFAULT_PAST_DAYS = int(os.environ.get("WEATHER_DEFAULT_PAST_DAYS", 3))
    WEATHER_DEFAULT_FORECAST_DAYS = int(
        os.environ.get("WEATHER_DEFAULT_FORECAST_DAYS", 1)
    )

    # Rainfall Normalization Thresholds (in mm)
    # Explicit configurable engineering baselines for scaling into [0.0, 1.0].
    # NOT real-world certified meteorological flood thresholds; calibrated for normalized scoring.
    RAINFALL_1H_MIN_MM = float(os.environ.get("RAINFALL_1H_MIN_MM", 0.0))
    RAINFALL_1H_MAX_MM = float(os.environ.get("RAINFALL_1H_MAX_MM", 50.0))
    RAINFALL_24H_MIN_MM = float(os.environ.get("RAINFALL_24H_MIN_MM", 0.0))
    RAINFALL_24H_MAX_MM = float(os.environ.get("RAINFALL_24H_MAX_MM", 150.0))
    RAINFALL_72H_MIN_MM = float(os.environ.get("RAINFALL_72H_MIN_MM", 0.0))
    RAINFALL_72H_MAX_MM = float(os.environ.get("RAINFALL_72H_MAX_MM", 250.0))

    # Hazard Scoring Model Weights (must sum to 1.0)
    HAZARD_WEIGHT_RAINFALL_1H = float(os.environ.get("HAZARD_WEIGHT_RAINFALL_1H", 0.20))
    HAZARD_WEIGHT_RAINFALL_24H = float(os.environ.get("HAZARD_WEIGHT_RAINFALL_24H", 0.25))
    HAZARD_WEIGHT_RAINFALL_72H = float(os.environ.get("HAZARD_WEIGHT_RAINFALL_72H", 0.20))
    HAZARD_WEIGHT_TERRAIN = float(os.environ.get("HAZARD_WEIGHT_TERRAIN", 0.20))
    HAZARD_WEIGHT_HISTORICAL = float(os.environ.get("HAZARD_WEIGHT_HISTORICAL", 0.15))

    # Hazard Risk Classification Thresholds
    HAZARD_RISK_MODERATE_THRESHOLD = float(os.environ.get("HAZARD_RISK_MODERATE_THRESHOLD", 0.30))
    HAZARD_RISK_HIGH_THRESHOLD = float(os.environ.get("HAZARD_RISK_HIGH_THRESHOLD", 0.60))
    HAZARD_RISK_CRITICAL_THRESHOLD = float(os.environ.get("HAZARD_RISK_CRITICAL_THRESHOLD", 0.80))


class DevelopmentConfig(Config):
    """Development configuration."""
    ENV = "development"
    DEBUG = True


class TestingConfig(Config):
    """Testing configuration."""
    ENV = "testing"
    TESTING = True
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    ENV = "production"
    DEBUG = False
    TESTING = False


CONFIG_MAP = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(env_name: str | None = None) -> type[Config]:
    """Retrieve config class based on environment name or FLASK_ENV."""
    if env_name is None:
        env_name = os.environ.get("FLASK_ENV", "development")
    return CONFIG_MAP.get(env_name.lower(), DevelopmentConfig)
