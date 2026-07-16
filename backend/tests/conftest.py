import os
from pathlib import Path

# Must run before app imports.
_TEST_DB = Path(__file__).resolve().parent / "_pytest_grcx.db"
if _TEST_DB.exists():
    _TEST_DB.unlink()

os.environ["USE_SQLITE"] = "true"
os.environ["SQLITE_PATH"] = str(_TEST_DB)
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["AI_PROVIDER"] = "stub"

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

get_settings.cache_clear()
settings = get_settings()

from app.db.base import Base
import app.models  # noqa: F401
from app.db import session as session_mod
from app.core.deps import get_db
from app.main import create_app
from app.services.bootstrap import seed_rbac_and_demo_user

engine = create_engine(
    f"sqlite:///{_TEST_DB}",
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
session_mod.engine = engine
session_mod.SessionLocal = TestingSessionLocal


def override_get_db() -> Generator:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    db = TestingSessionLocal()
    try:
        # Reset tables between tests lightly via seed guard — ensure admin exists
        if db.query(__import__("app.models.user", fromlist=["User"]).User).count() == 0:
            seed_rbac_and_demo_user(db)
        else:
            seed_rbac_and_demo_user(db)
    finally:
        db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
