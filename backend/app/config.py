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
    hf_token: str = ""
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_tts_model: str = "tts-1"
    openai_tts_voice: str = "nova"

    # Gmail OAuth
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_redirect_uri: str = ""

    # ElevenLabs
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel

    # Medium
    medium_token: str = ""

    model_config = {
        "env_prefix": "JHIONNEA_",
        "env_file": ".env.deploy",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
