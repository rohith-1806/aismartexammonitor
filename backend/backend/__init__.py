import logging
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")


db = SQLAlchemy()


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object("backend.config.Config")

    instance_dir = Path(__file__).resolve().parent.parent / "instance"
    instance_dir.mkdir(parents=True, exist_ok=True)

    db_uri = app.config.get("SQLALCHEMY_DATABASE_URI")
    if not db_uri:
        db_path = instance_dir / "examguard.db"
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path.as_posix()}"
    elif db_uri.startswith("sqlite://") and db_uri != "sqlite:///:memory:":
        db_path = Path(db_uri.replace("sqlite:///", "", 1))
        if not db_path.is_absolute():
            db_path = (Path(__file__).resolve().parent.parent / db_path).resolve()
        db_path.parent.mkdir(parents=True, exist_ok=True)
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path.as_posix()}"

    db.init_app(app)

    @app.teardown_appcontext
    def shutdown_session(_exception):
        db.session.remove()
        if app.config.get("TESTING"):
            db.engine.dispose()

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    logging.basicConfig(level=logging.INFO)
    app.logger.setLevel(logging.INFO)

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.exception("Unhandled exception", exc_info=error)
        return jsonify({"error": "Internal Server Error"}), 500

    from backend.routes.health import health_bp
    from backend.routes.auth import auth_bp
    from backend.routes.exams import exams_bp
    from backend.routes.events import events_bp
    from backend.routes.session_monitor import session_monitor_bp
    from backend.routes.integrity import integrity_bp
    from backend.routes.dashboard import dashboard_bp
    from backend.routes.reports import reports_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(exams_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(session_monitor_bp)
    app.register_blueprint(integrity_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(reports_bp)

    return app
