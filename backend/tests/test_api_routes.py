import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import init_db

# Ensure tables are initialized for testing
init_db()
client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "sabrina-listens"
    assert "ffmpeg_detected" in data

def test_settings_get_and_update():
    # GET settings
    r = client.get("/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert "output_directory" in data
    assert "max_concurrent_downloads" in data

    # PUT settings
    update_data = {
        "max_concurrent_downloads": 4,
        "default_quality": "mp3_320",
    }
    r2 = client.put("/api/settings", json=update_data)
    assert r2.status_code == 200
    assert r2.json()["max_concurrent_downloads"] == 4
    assert r2.json()["default_quality"] == "mp3_320"

def test_downloads_queue_get():
    r = client.get("/api/downloads")
    assert r.status_code == 200
    data = r.json()
    assert "total_jobs" in data
    assert "active_jobs" in data
    assert "jobs" in data

def test_history_get_and_clear():
    r = client.get("/api/history")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    r_delete = client.delete("/api/history?delete_files=false")
    assert r_delete.status_code == 200
    assert "Cleared" in r_delete.json()["message"]

def test_resolve_invalid_url():
    r = client.post("/api/resolve", json={"url": "http://127.0.0.1:9999/private"})
    assert r.status_code == 400
    assert "blocked" in r.json()["detail"].lower() or "restricted" in r.json()["detail"].lower()
