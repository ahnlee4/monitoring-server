from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    portal_database_url: str = "postgresql+psycopg2://gateway:gateway@db:5432/gateway"
    base_domain: str = "tms.theintech.co.kr"
    session_cookie_name: str = "monitor_session"
    session_cookie_domain: str = ".tms.theintech.co.kr"
    session_secure: bool = True
    session_ttl_hours: int = 12
    bootstrap_admin_username: str = "admin"
    bootstrap_admin_password: str = ""
    trusted_origins: str = "https://tms.theintech.co.kr"
    allowed_target_ports: str = "80,443"
    registration_enabled: bool = True
    smtp_host: str = "smtp.naver.com"
    smtp_port: int = 465
    smtp_username: str = "ahnlee4@naver.com"
    smtp_password: str = ""
    smtp_from: str = "ahnlee4@naver.com"
    email_verification_ttl_minutes: int = 10
    email_verification_cooldown_seconds: int = 60
    email_verification_hourly_limit: int = 5
    email_verification_max_attempts: int = 5

    @property
    def trusted_origins_set(self) -> set[str]:
        return {item.strip().rstrip("/") for item in self.trusted_origins.split(",") if item.strip()}

    @property
    def allowed_target_ports_set(self) -> set[int]:
        return {int(item.strip()) for item in self.allowed_target_ports.split(",") if item.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
