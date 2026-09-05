import os

class Settings:
    PROJECT_NAME: str = "RiskShield AI"
    API_V1_STR: str = "/api"

    # Load from environment — no hardcoded fallbacks for secrets
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # DB URL — defaults to local SQLite for development
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./riskshield.db"
    )

    # ML Paths
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./ml/models/model.pkl")
    METRICS_PATH: str = os.getenv("METRICS_PATH", "./ml/models/metrics.json")

    def __post_init__(self):
        if not self.SECRET_KEY:
            raise RuntimeError(
                "SECRET_KEY environment variable is not set. "
                "Copy .env.example to .env and fill in a real secret."
            )

settings = Settings()
