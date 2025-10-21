from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_meta_ok():
    r = client.get("/meta")
    assert r.status_code == 200
    data = r.json()
    assert "year_min" in data and "year_max" in data
    assert isinstance(data["genres"], list)
    assert isinstance(data["languages"], list)
    if data["year_min"] is not None:
        assert isinstance(data["year_min"], int)
    if data["year_max"] is not None:
        assert isinstance(data["year_max"], int)