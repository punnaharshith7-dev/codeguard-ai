from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    app_name: str = "CodeGuard AI API"
    environment: str = "development"
    database_url: str = "sqlite:///./codeguard.db"
    secret_key: str = "development-only-change-this-secret-before-deploying"
    access_token_minutes: int = 60 * 24 * 7
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    cookie_secure: bool = False
    cookie_name: str = "codeguard_session"
    auth_bridge_secret: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    max_upload_bytes: int = 2 * 1024 * 1024
    api_docs_enabled: bool = True
    llm_provider: str = ""
    llm_model: str = ""
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_timeout_seconds: int = 45
    agent_max_output_tokens: int = 4096
    github_app_id: str = ""
    github_app_private_key: str = ""
    github_webhook_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

