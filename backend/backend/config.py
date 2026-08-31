import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(parents=True, exist_ok=True)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        if os.getenv("FLASK_ENV") == "production" or os.getenv("ENV") == "production":
            raise RuntimeError("SECRET_KEY must be set in production.")
        SECRET_KEY = "dev-secret-key"

    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "8"))
    DB_PATH = INSTANCE_DIR / "examguard.db"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URI") or f"sqlite:///{DB_PATH.as_posix()}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    _is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("ENV") == "production"
    _configured_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
    _local_origins = [] if _is_production else [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    CORS_ORIGINS = list(dict.fromkeys(_configured_origins + _local_origins))

    TAB_SWITCH_LIMIT = int(os.getenv("TAB_SWITCH_LIMIT", "3"))
    FACE_ABSENCE_LIMIT_SECONDS = int(os.getenv("FACE_ABSENCE_LIMIT_SECONDS", "120"))
    MAX_WARNINGS = int(os.getenv("MAX_WARNINGS", "10"))
    FOCUS_LOSS_LIMIT = int(os.getenv("FOCUS_LOSS_LIMIT", "3"))
    MULTIPLE_FACE_LIMIT = int(os.getenv("MULTIPLE_FACE_LIMIT", "1"))
    LONG_INACTIVITY_SECONDS = int(os.getenv("LONG_INACTIVITY_SECONDS", "300"))
