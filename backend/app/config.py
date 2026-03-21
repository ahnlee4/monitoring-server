from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Industrial Monitoring Backend"
    database_url: str = "postgresql+psycopg2://monitor:monitor123@db:5432/monitoring"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    backend_cors_origins: str = "http://localhost,http://127.0.0.1"
    collector_token: str = "change-me"
    seed_device_codes: str = "PRESS-01,FURNACE-01,PUMP-01"

    @property
    def cors_origins_list(self) -> list[str]:
        return [item.strip() for item in self.backend_cors_origins.split(",") if item.strip()]

    @property
    def seed_device_codes_list(self) -> list[str]:
        return [item.strip() for item in self.seed_device_codes.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
