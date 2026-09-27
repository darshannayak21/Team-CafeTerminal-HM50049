"""Tests for Ground Reports and Simulated News API endpoints."""

import io
import os
import tempfile
import pytest
from backend.app import create_app
from backend.config import TestingConfig
from backend.services.db import init_db


@pytest.fixture
def client():
    """Create test client with isolated SQLite database and upload folder."""
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_rainguard.db")
    test_uploads = os.path.join(temp_dir, "test_uploads")
    os.makedirs(test_uploads, exist_ok=True)

    class CustomTestingConfig(TestingConfig):
        DATABASE_PATH = test_db
        UPLOAD_FOLDER = test_uploads

    app = create_app(CustomTestingConfig)
    with app.test_client() as client:
        with app.app_context():
            init_db()
        yield client


def test_create_report_json(client):
    """Test creating a report via JSON payload."""
    payload = {
        "incident_type": "Road Blocked",
        "description": "Fallen tree blocking both lanes near Katraj Ghat",
        "latitude": 18.4520,
        "longitude": 73.8640,
        "accuracy": 8.5,
        "location_name": "Katraj Ghat Road",
    }
    response = client.post("/api/reports", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data["success"] is True
    report = data["report"]
    assert report["incident_type"] == "Road Blocked"
    assert report["latitude"] == 18.4520
    assert report["longitude"] == 73.8640
    assert report["source"] == "ground_report"
    assert report["status"] == "pending"
    assert report["id"].startswith("RG-")


def test_create_report_multipart_with_image(client):
    """Test creating a report with multipart form data including an image."""
    image_content = b"fake-jpeg-image-binary-stream-data"
    data = {
        "incident_type": "Flooded Road",
        "description": "Water level reaching 2 feet near bridge",
        "latitude": "18.4600",
        "longitude": "73.8231",
        "accuracy": "10.0",
        "location_name": "Navale Bridge approach",
        "image": (io.BytesIO(image_content), "field_photo.jpg"),
    }
    response = client.post("/api/reports", data=data, content_type="multipart/form-data")
    assert response.status_code == 201
    res_data = response.get_json()
    assert res_data["success"] is True
    report = res_data["report"]
    assert report["image_url"] is not None
    assert "/api/uploads/" in report["image_url"]

    # Test retrieving the uploaded image
    img_url = report["image_url"]
    img_response = client.get(img_url)
    assert img_response.status_code == 200
    assert img_response.data == image_content


def test_create_report_validation_errors(client):
    """Test validation errors for missing fields and out of bounds coordinates."""
    # 1. Missing incident type
    res = client.post("/api/reports", json={"latitude": 18.5, "longitude": 73.8})
    assert res.status_code == 400
    assert "incident_type" in res.get_json()["error"].lower()

    # 2. Missing coordinates
    res = client.post("/api/reports", json={"incident_type": "Landslide"})
    assert res.status_code == 400
    assert "coordinates" in res.get_json()["error"].lower()

    # 3. Out of bounds coordinates
    res = client.post("/api/reports", json={
        "incident_type": "Landslide",
        "latitude": 999.0,
        "longitude": 73.8
    })
    assert res.status_code == 400
    assert "out of bounds" in res.get_json()["error"].lower()

    # 4. Disallowed file extension
    bad_file_data = {
        "incident_type": "Waterlogging",
        "latitude": "18.5",
        "longitude": "73.8",
        "image": (io.BytesIO(b"executable"), "malicious.exe"),
    }
    res = client.post("/api/reports", data=bad_file_data, content_type="multipart/form-data")
    assert res.status_code == 400
    assert "invalid image format" in res.get_json()["error"].lower()


def test_list_and_get_reports(client):
    """Test listing reports and fetching by ID."""
    # Insert two reports
    client.post("/api/reports", json={
        "incident_type": "Bridge Damage",
        "description": "Scouring visible",
        "latitude": 18.51,
        "longitude": 73.85,
    })
    res2 = client.post("/api/reports", json={
        "incident_type": "Power Infrastructure Damage",
        "description": "Transformer spark",
        "latitude": 18.52,
        "longitude": 73.86,
    })
    r2_id = res2.get_json()["report"]["id"]

    # List reports
    list_res = client.get("/api/reports")
    assert list_res.status_code == 200
    reports = list_res.get_json()["reports"]
    assert len(reports) >= 2

    # Get single report
    single_res = client.get(f"/api/reports/{r2_id}")
    assert single_res.status_code == 200
    assert single_res.get_json()["report"]["id"] == r2_id

    # 404 for nonexistent report
    not_found_res = client.get("/api/reports/NONEXISTENT-999")
    assert not_found_res.status_code == 404


def test_list_news(client):
    """Test retrieving the single contextual news item."""
    res = client.get("/api/news")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["news"]) == 1
    item = data["news"][0]
    assert "Navale Bridge" in item["title"]
    assert item["source"] == "News"

