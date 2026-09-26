"""Main application entry point for the backend Flask service."""

from flask import Flask
from flask_cors import CORS
from backend.config import Config, get_config
from backend.routes.health import health_bp
from backend.routes.elevation import elevation_bp
from backend.routes.rainfall import rainfall_bp


def create_app(config_class: type[Config] | None = None) -> Flask:
    """Application factory for creating and configuring the Flask app.

    Args:
        config_class: Configuration class to load into app.config.
                      Defaults to environment-based configuration.

    Returns:
        Configured Flask application instance.
    """
    app = Flask(__name__)

    if config_class is None:
        config_class = get_config()
    app.config.from_object(config_class)

    CORS(app)

    # Register routes / blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(elevation_bp)
    app.register_blueprint(rainfall_bp)

    return app


# Cleanly exposed Flask application instance
app = create_app()

if __name__ == "__main__":
    app.run(
        host=app.config.get("HOST", "0.0.0.0"),
        port=app.config.get("PORT", 5000),
        debug=app.config.get("DEBUG", False),
    )
