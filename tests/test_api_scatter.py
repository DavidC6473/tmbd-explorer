import pytest

@pytest.mark.parametrize(
    "path",
    [
        "/scatter/budget-revenue",
        "/scatter/budget-revenue?genre=Drama&ymin=1990&ymax=2020&limit=500",
        "/scatter/rating-revenue",
        "/scatter/rating-revenue?genre=Drama&ymin=1990&ymax=2020&limit=500",
        "/scatter/rating-revenue?source=imdb&genre=Drama&ymin=1990&ymax=2020&limit=500",
    ],
)
def test_scatter_endpoints_ok(client, path):
    r = client.get(path)
    assert r.status_code == 200, r.text
    payload = r.json()
    assert "points" in payload and "trend" in payload
    assert isinstance(payload["points"], list)
    assert isinstance(payload["trend"], dict)
    if payload["points"]:
        p0 = payload["points"][0]
        assert "id" in p0 and "title" in p0 and "year" in p0 and "poster_path" in p0
        if "budget" in p0:
            assert "revenue" in p0
        if "rating" in p0:
            assert "revenue" in p0
        t = payload["trend"]
        assert set(t.keys()) == {"slope", "r2", "n"}
        assert isinstance(t["n"], int)