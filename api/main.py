import os
from typing import List, Dict, Any
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv
from datetime import date

CURRENT_YEAR = date.today().year

load_dotenv("infra/.env")
DB_URL = os.environ.get("DB_URL")
assert DB_URL, "DB_URL missing in infra/.env"

engine: Engine = create_engine(DB_URL, pool_pre_ping=True)

app = FastAPI(title="TMDB Explorer API", version="0.1.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://tmdb-explorer.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _where_and_join_for_filters(ymin: int | None, ymax: int | None, genre: str| None):
    joins = []
    wheres = ["m.budget_usd > 0", "m.revenue_usd > 0", "m.year IS NOT NULL", "m.year <= EXTRACT(YEAR FROM CURRENT_DATE)"]
    params: dict[str, object] = {}

    if ymin is not None:
        wheres.append("m.year >= :ymin")
        params["ymin"] = ymin
    if ymax is not None:
        wheres.append("m.year <= :ymax")
        params["ymax"] = ymax
    if genre:
        joins.append("JOIN movie_genres mg ON mg.movie_id = m.id")
        joins.append("JOIN genres g ON g.id = mg.genre_id")
        wheres.append("g.name = :genre")
        params["genre"] = genre
    join_sql = (" " + " ".join(joins)) if joins else ""
    where_sql = " WHERE " + " AND ".join(wheres)
    return join_sql, where_sql, params

@app.get("/meta")
def get_meta() -> Dict[str, Any]:
    with engine.begin() as conn:
        yr = conn.execute(text("""
                SELECT
                    MIN(year) FILTER (WHERE year IS NOT NULL AND year <= EXTRACT(YEAR FROM CURRENT_DATE)) AS year_max,
                    MAX(year) FILTER (WHERE year IS NOT NULL AND year <= EXTRACT(YEAR FROM CURRENT_DATE)) AS year_max  
                FROM movies
        """)).first()
        year_min, year_max = (yr[0], yr[1]) if yr else (None, None)

        genres = conn.execute(text("""
                SELECT g.name
                FROM genres g
                JOIN movie_genres mg ON mg.genre_id = g.id
                GROUP BY g.name
                ORDER BY COUNT(*) DESC, g.name                  
        """)).scalars().all()

        languages = conn.execute(text("""
                SELECT original_language
                FROM movies
                WHERE original_language IS NOT NULL AND original_language <> ''
                GROUP BY original_language
                ORDER BY COUNT(*) DESC
                LIMIT 20
        """)).scalars().all()

    return {
        "year_min": year_min,
        "year_max": year_max,
        "genres": genres,
        "languages": languages,
    }

@app.get("/scatter/budget-revenue")
def scatter_budget_revenue(
    ymin: int | None = Query(None),
    ymax: int | None = Query(None),
    genre: str | None = Query(None),
    limit: int = Query(12000, ge=100, le=50000)
):
    if ymax is not None and ymax > CURRENT_YEAR:
        ymax = CURRENT_YEAR
    
    join_sql, where_sql, params = _where_and_join_for_filters(ymin, ymax, genre)

    points_sql = f"""
        SELECT m.id, m.title, m.year, m.budget_usd AS budget, m.revenue_usd AS revenue, m.poster_path
        FROM movies m{join_sql}{where_sql}
        ORDER BY m.id
        LIMIT :limit
    """
    trend_sql = f"""
        SELECT
            regr_slope(LOG(10, m.budget_usd), LOG(10, m.revenue_usd)) AS slope,
            POWER(corr(LOG(10, m.budget_usd), LOG(10, m.revenue_usd)), 2) AS r2,
            COUNT(*)::int AS n
        FROM movies m{join_sql}{where_sql}
    """
    params_pts = dict(params)
    params_pts["limit"] = limit

    with engine.begin() as conn:
        rows = conn.execute(text(points_sql), params_pts).mappings().all()
        trend = conn.execute(text(trend_sql), params).mappings().first()

    points = [
        {
            "id": r["id"],
            "title": r["title"],
            "year": r["year"],
            "budget": float(r["budget"]) if r["budget"] is not None else None,
            "revenue": float(r["revenue"]) if r["revenue"] is not None else None,
            "poster_path": r["poster_path"],
        }
        for r in rows
    ]
    t = trend or {}
    out_trend = {
        "slope": float(t["slope"]) if t.get("slope") is not None else None,
        "r2": float(t["r2"]) if t.get("r2") is not None else None,
        "n": int(t["n"]) if t.get("n") is not None else 0,
    }

    return {"points": points, "trend": out_trend}

@app.get("/scatter/rating-revenue")
def scatter_rating_revenue(
    ymin: int | None = Query(None),
    ymax: int | None = Query(None),
    genre: str | None = Query(None),
    limit: int = Query(12000, ge=100, le=50000),
    source: str = Query("tmdb", pattern="^(tmdb|imdb)$"),
):
    if ymax is not None and ymax > CURRENT_YEAR:
        ymax = CURRENT_YEAR

    
    if source == "imdb":
        rating_col = "m.imdb_rating"
        votes_filter = "m.imdb_votes >= 1000"
    else:
        rating_col = "m.vote_avg_tmdb"
        votes_filter = "m.vote_count_tmdb >= 50"

    join_sql, where_sql, params = _where_and_join_for_filters(ymin, ymax, genre)

    where_sql_extra = where_sql + f" AND {rating_col} IS NOT NULL AND {votes_filter}"

    points_sql = f"""
        SELECT m.id, m.title, m.year,{rating_col} AS rating, m.revenue_usd AS revenue, m.poster_path
        FROM movies m{join_sql}{where_sql_extra}
        ORDER BY m.id
        LIMIT :limit
    """

    trend_sql = f"""
        SELECT 
            regr_slope({rating_col}, LOG(10, m.revenue_usd)) AS slope,
            POWER(corr({rating_col}, LOG(10, m.revenue_usd)), 2),
            COUNT(*)::int
        FROM movies m{join_sql}{where_sql_extra}
    """

    params_pts = dict(params)
    params_pts["limit"] = limit

    with engine.begin() as conn:
        rows = conn.execute(text(points_sql), params_pts).mappings().all()
        trend = conn.execute(text(trend_sql), params).mappings().first()

    points = [
        {
            "id": r["id"],
            "title": r["title"],
            "year": r["year"],
            "rating": float(r["rating"]) if r["rating"] is not None else None,
            "revenue": float(r["revenue"]) if r["revenue"] is not None else None,
            "poster_path": r["poster_path"],

        }
        for r in rows
    ]
    t = trend or {}
    out_trend = {
        "slope": float(t["slope"]) if t.get("slope") is not None else None,
        "r2": float(t["r2"]) if t.get("r2") is not None else None,
        "n": int(t["n"]) if t.get("n") is not None else 0,
    }
    return {"points": points, "trend": out_trend, "source": source}

@app.get("/health")
def health():
    return {"status": "ok"}