from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Get the absolute path to the .env file
ENV_FILE_PATH = Path(__file__).resolve().parent.parent.parent / ".env"

class Settings(BaseSettings):
    APP_NAME: str = "Thinking Box Backend"
    GOOGLE_API_KEY: str = ""
    
    class Config:
        env_file = str(ENV_FILE_PATH)
        env_file_encoding = 'utf-8'

@lru_cache()
def get_settings():
    settings = Settings()
    print(f"Loaded API Key: {settings.GOOGLE_API_KEY[:10]}..." if settings.GOOGLE_API_KEY else "WARNING: API Key not loaded!")
    return settings
