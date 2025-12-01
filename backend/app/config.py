"""Configuration module for Sentinel Hub API credentials and settings."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Sentinel Hub credentials
    SENTINEL_CLIENT_ID: str = ""
    SENTINEL_CLIENT_SECRET: str = ""
    
    # Sentinel Hub endpoints (Planet/Sentinel Hub - NOT Copernicus Data Space)
    SENTINEL_AUTH_URL: str = "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token"
    SENTINEL_PROCESS_URL: str = "https://services.sentinel-hub.com/api/v1/process"
    SENTINEL_CATALOG_URL: str = "https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search"
    
    # Grok API for AI chatbot
    GROK_API_KEY: str = ""
    
    # OpenWeatherMap API
    OPENWEATHER_API_KEY: str = ""
    
    # Supabase Configuration (NEW non-legacy keys - NOT legacy keys)
    # These keys use the new format: sb_publishable_* and sb_secret_*
    SUPABASE_URL: str = "https://oamiozzalswsfmxhvybp.supabase.co"
    SUPABASE_PUBLISHABLE_KEY: str = "sb_publishable_caw633kAGJbEGlcN5s8q_g_QjDCan8o"
    SUPABASE_SECRET_KEY: str = "sb_secret_5DnZ4M6C8-_xW8AjaRNDXA_TFcEXi_U"
    
    # JWT Secret for session tokens
    JWT_SECRET: str = "your-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Sri Lanka bounds
    SRI_LANKA_BBOX: list = [79.4, 5.9, 82.2, 10.1]  # [west, south, east, north]
    SRI_LANKA_CENTER: list = [7.8731, 80.7718]
    
    # Cache settings
    CACHE_TTL_SECONDS: int = 300  # 5 minutes
    
    # CORS settings
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "*"]
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
