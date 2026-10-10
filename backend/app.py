"""Main application entry point for the backend Flask service."""

from flask import Flask
from flask_cors import CORS
from backend.config import Config, get_config
from backend.routes.health import health_bp
from backend.routes.elevation import elevation_bp
from backend.routes.rainfall import rainfall_bp
from backend.routes.reports import reports_bp
from backend.routes.news import news_bp
from backend.routes.priorities import priorities_bp
from backend.routes.ai import ai_bp
from backend.routes.replay import replay_bp
from backend.routes.routing import routing_bp
from backend.services.db import init_db


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

    # Initialize SQLite database & mock tables
    with app.app_context():
        init_db()

    # Register routes / blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(elevation_bp)
    app.register_blueprint(rainfall_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(news_bp)
    app.register_blueprint(priorities_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(replay_bp)
    app.register_blueprint(routing_bp)

    # Start background news ingestion worker if not in test mode
    # Disabled for demo purposes to preserve hardcoded DB
    # if not app.config.get("TESTING", False):
    #     try:
    #         from backend.services.news_service import start_background_ingestion
    #         interval = int(app.config.get("NEWS_INGESTION_INTERVAL_SECONDS", 600))
    #         start_background_ingestion(interval_seconds=interval)
    #     except Exception as e:
    #         app.logger.warning(f"Could not start background news ingestion: {e}")

    return app


# Cleanly exposed Flask application instance
app = create_app()

if __name__ == "__main__":
    app.run(
        host=app.config.get("HOST", "0.0.0.0"),
        port=app.config.get("PORT", 5000),
        debug=app.config.get("DEBUG", False),
    )
