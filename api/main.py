import os
from typing import List, Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

load_dotenv("infra/.env")
DB_URL = os.environ.get("DB_URL")
assert DB_URL, "DB_URL missing in infra/.env"

engine: Engine = create_engine(DB_URL, pool_pre_ping=True)

app = FastAPI(title="TMDB Explorer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/meta")
def get_meta() -> Dict[str, Any]:
    with engine.begin() as conn:
        yr = conn.execute(text("SELECT MIN(year), MAX(year) FROM movies WHERE year IS NOT NULL")).first()
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