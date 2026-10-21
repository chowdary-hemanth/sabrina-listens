from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

Base = declarative_base()

class JobRecord(Base):
    __tablename__ = "download_jobs"

    id = Column(String(36), primary_key=True)
    track_id = Column(String(255), index=True)
    title = Column(String(500), nullable=False)
    artist = Column(String(500), nullable=False)
    album = Column(String(500), nullable=False)
    cover_url = Column(Text, nullable=True)
    status = Column(String(50), default="pending", index=True)
    progress_percent = Column(Float, default=0.0)
    download_speed = Column(String(50), nullable=True)
    eta_seconds = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    file_path = Column(Text, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    quality_id = Column(String(50), default="mp3_320")
    format = Column(String(20), default="mp3")
    actual_source_bitrate = Column(Integer, nullable=True)
    is_transcoded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class HistoryRecord(Base):
    __tablename__ = "download_history"

    id = Column(String(36), primary_key=True)
    track_id = Column(String(255))
    title = Column(String(500), nullable=False)
    artist = Column(String(500), nullable=False)
    album = Column(String(500), nullable=False)
    cover_url = Column(Text, nullable=True)
    file_path = Column(Text, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    quality_id = Column(String(50), default="mp3_320")
    status = Column(String(50), default="completed")
    completed_at = Column(DateTime, default=datetime.utcnow)

class RecentUrlRecord(Base):
    __tablename__ = "recent_urls"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String(2048), unique=True, nullable=False)
    title = Column(String(500), nullable=False)
    provider = Column(String(50), nullable=False)
    resource_type = Column(String(50), nullable=False)
    cover_url = Column(Text, nullable=True)
    visited_at = Column(DateTime, default=datetime.utcnow)

class AppSettingRecord(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
