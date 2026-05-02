from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Jhionnea"
    secret_key: str = "jhionnea-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    database_url: str = "sqlite+aiosqlite:///./jhionnea.db"

    model_config = {"env_prefix": "JHIONNEA_"}


settings = Settings()
