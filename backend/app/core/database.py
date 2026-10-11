from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


database_url = settings.database_url
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    # Additive migration for databases created before project and triage features.
    additions = {
        "findings": {
            "reachability": "VARCHAR(24) NOT NULL DEFAULT 'unknown'",
            "attack_path": "TEXT NOT NULL DEFAULT '[]'",
            "status": "VARCHAR(24) NOT NULL DEFAULT 'open'",
            "status_reason": "VARCHAR(1000) NOT NULL DEFAULT ''",
            "assigned_to_user_id": "VARCHAR(36)",
        },
        "scans": {
            "project_id": "VARCHAR(36)",
            "workspace_id": "VARCHAR(36)",
        },
    }
    with engine.begin() as connection:
        for table, fields in additions.items():
            columns = {column["name"] for column in inspect(connection).get_columns(table)}
            for name, definition in fields.items():
                if name not in columns:
                    connection.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
        connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_scans_project_id ON scans (project_id)")
        connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_scans_workspace_id ON scans (workspace_id)")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
