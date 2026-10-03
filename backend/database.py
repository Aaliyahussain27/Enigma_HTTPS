import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

base_dir = Path(__file__).resolve().parent
load_dotenv(base_dir / ".env", override=False)
load_dotenv(base_dir / "venv" / ".env", override=False)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./estateclear.db")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
