"""Minimal backend configuration module."""

import os


class Config:
    """Base configuration for backend application."""
    ENV = os.environ.get("FLASK_ENV", "production")
    DEBUG = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1", "t")
    TESTING = False
    PORT = int(os.environ.get("PORT", 5000))
    HOST = os.environ.get("HOST", "0.0.0.0")


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
