import os

from pydantic_settings import BaseSettings

data_dir = "/data" if os.path.isdir("/data") else "."


class Settings(BaseSettings):
    app_name: str = "Jhionnea"
    secret_key: str = "jhionnea-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    database_url: str = f"sqlite+aiosqlite:///{data_dir}/jhionnea.db"
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_prefix": "JHIONNEA_"}


settings = Settings()
