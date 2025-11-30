"""Tests for the LankaSat Live API."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_root():
    """Test root endpoint returns API information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "LankaSat Live API"
    assert "version" in data


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_get_layers():
    """Test layers endpoint returns available layers."""
    response = client.get("/layers")
    assert response.status_code == 200
    data = response.json()
    assert "layers" in data
    assert "sri_lanka" in data
    assert len(data["layers"]) > 0


def test_invalid_layer():
    """Test tile endpoint with invalid layer."""
    response = client.get("/tile?layer=INVALID&z=7&x=100&y=100&date=2024-01-01")
    assert response.status_code == 400


def test_cache_stats():
    """Test cache statistics endpoint."""
    response = client.get("/cache/stats")
    assert response.status_code == 200
    data = response.json()
    assert "tile_cache" in data
    assert "token_cache" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
