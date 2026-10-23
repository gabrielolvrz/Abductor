"""Configurações centrais do Backend Abductor via Pydantic Settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent


class Settings(BaseSettings):
    """Variáveis de ambiente e parâmetros operacionais do sistema."""

    model_config = SettingsConfigDict(
        env_file=(str(PROJECT_ROOT / ".env"), str(BASE_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Banco de Dados
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres123"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "abductor_db"
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres123@localhost:5432/abductor_db"
    )

    # Integração com o Scraper gosom
    GOSOM_API_URL: str = "http://localhost:8080"

    # Servidor FastAPI
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    # Parâmetros de Validação Concorrente
    VALIDATOR_MAX_CONCURRENCY: int = 30
    VALIDATOR_TIMEOUT_SECONDS: float = 4.0

    # Watchdog de Jobs (segundos)
    JOB_TIMEOUT_SECONDS: int = 180

    @property
    def cors_origins_list(self) -> list[str]:
        """Retorna lista de origens CORS permitidas."""
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()
