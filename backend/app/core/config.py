"""
Application configuration loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "PachApp"
    DEBUG: bool = False

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "pachapp"

    # JWT Authentication
    JWT_SECRET: str = "pachapp-super-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440  # 24 hours

    # Google Cloud / Vertex AI
    GCP_PROJECT_ID: Optional[str] = None
    GCP_LOCATION: str = "us-central1"
    VERTEX_AI_MODEL: str = "gemini-2.0-flash"

    # Demo mode — if True, AI classification returns mock data
    DEMO_MODE: bool = True

    # File uploads
    UPLOAD_DIR: str = "uploads"

    # CORS
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
