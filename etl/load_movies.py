import os, json
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("infra/.env")
DB_URL = os.environ.get("DB_URL")
assert DB_URL, "DB_URL missing in infra/.env"

CSV_PATH = os.path.join("dataset", "tmdb_movies.csv")

def parse_genre_names(genre_cell):
    """
    Accepts comma-separated text like:
      "Comedy, Drama, Romance"
    Also tolerates lists/JSON if they appear later.
    Returns list[str] of cleaned genre names.
    """
    import pandas as pd, json, ast
    if pd.isna(genre_cell):
        return []

    if isinstance(genre_cell, list):
        out = []
        for g in genre_cell:
            if isinstance(g, dict) and g.get("name"):
                out.append(str(g["name"]).strip())
            elif isinstance(g, str) and g.strip():
                out.append(g.strip())
        return [x for x in out if x]

    s = str(genre_cell).strip()
    if not s:
        return []

    if (s.startswith("[") and s.endswith("]")) or (s.startswith("{") and s.endswith("}")):
        try:
            data = json.loads(s)
            if isinstance(data, list):
                out = []
                for g in data:
                    if isinstance(g, dict) and g.get("name"):
                        out.append(str(g["name"]).strip())
                    elif isinstance(g, str) and g.strip():
                        out.append(g.strip())
                return [x for x in out if x]
        except Exception:
            pass
        try:
            data = ast.literal_eval(s)
            if isinstance(data, list):
                out = []
                for g in data:
                    if isinstance(g, dict) and g.get("name"):
                        out.append(str(g["name"]).strip())
                    elif isinstance(g, str) and g.strip():
                        out.append(g.strip())
                return [x for x in out if x]
        except Exception:
            pass

    parts = [p.strip() for p in s.split(",")]
    return [p for p in parts if p]


def main():
    print("Reading CSV:", CSV_PATH)
    df = pd.read_csv(CSV_PATH)

    rename_map = {
        "budget": "budget_usd",
        "revenue": "revenue_usd",
        "vote_average": "vote_avg_tmdb",
        "vote_count": "vote_count_tmdb",
    }
    df = df.rename(columns=rename_map)

    title_before_nulls = int(df["title"].isna().sum()) if "title" in df.columns else len(df)
    if "title" not in df.columns:
        df["title"] = pd.NA
    if "original_title" in df.columns:
        df["title"] = df["title"].fillna(df["original_title"])
    if "name" in df.columns:
        df["title"] = df["title"].fillna(df["name"])

    df["title"] = df["title"].astype("string").str.strip()
    still_null = int(df["title"].isna().sum() + (df["title"] == "").sum())
    if still_null > 0:
        df = df[df["title"].notna() & (df["title"] != "")]
    print(f"[ETL] titles initially missing: {title_before_nulls}, "
          f"after fallback still empty: {still_null} (dropped those)")

    df["release_date"] = pd.to_datetime(df.get("release_date"), errors="coerce")
    df["year"] = df["release_date"].dt.year
    df["decade"] = (df["year"] // 10) * 10

    if "runtime" in df.columns:
        df["runtime_min"] = pd.to_numeric(df["runtime"], errors="coerce").astype("Int64")
    elif "runtime_min" not in df.columns:
        df["runtime_min"] = pd.NA
    if "original_language" not in df.columns:
        df["original_language"] = pd.NA

    for col in ["budget_usd","revenue_usd","popularity","vote_avg_tmdb","vote_count_tmdb","imdb_rating","imdb_votes"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    genre_lists = df.get("genres", pd.Series([None]*len(df))).apply(parse_genre_names)
    df["genres_json"] = genre_lists.apply(lambda L: json.dumps(L, ensure_ascii=False))

    keep = [
        "id","title","release_date","year","decade","runtime_min",
        "original_language","budget_usd","revenue_usd","popularity",
        "vote_avg_tmdb","vote_count_tmdb","imdb_rating","imdb_votes",
        "poster_path","genres_json"
    ]
    for k in keep:
        if k not in df.columns:
            df[k] = pd.NA
    df = df[keep].drop_duplicates(subset=["id"]).reset_index(drop=True)

    engine = create_engine(DB_URL)
    with engine.begin() as conn:
        schema_sql = open(os.path.join("etl","sql","schema.sql"), "r", encoding="utf-8").read()
        conn.execute(text(schema_sql))

        df.to_sql("movies_stage", conn, if_exists="replace", index=False)

        conn.execute(text("""
            INSERT INTO movies (
              id, title, release_date, year, decade, runtime_min, original_language,
              budget_usd, revenue_usd, popularity, vote_avg_tmdb, vote_count_tmdb,
              imdb_rating, imdb_votes, poster_path, genres_json
            )
            SELECT
              id, title, release_date, year, decade, runtime_min, original_language,
              budget_usd, revenue_usd, popularity, vote_avg_tmdb, vote_count_tmdb,
              imdb_rating, imdb_votes, poster_path,
              genres_json::jsonb
            FROM movies_stage
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              release_date = EXCLUDED.release_date,
              year = EXCLUDED.year,
              decade = EXCLUDED.decade,
              runtime_min = EXCLUDED.runtime_min,
              original_language = EXCLUDED.original_language,
              budget_usd = EXCLUDED.budget_usd,
              revenue_usd = EXCLUDED.revenue_usd,
              popularity = EXCLUDED.popularity,
              vote_avg_tmdb = EXCLUDED.vote_avg_tmdb,
              vote_count_tmdb = EXCLUDED.vote_count_tmdb,
              imdb_rating = EXCLUDED.imdb_rating,
              imdb_votes = EXCLUDED.imdb_votes,
              poster_path = EXCLUDED.poster_path,
              genres_json = EXCLUDED.genres_json;
        """))

        conn.execute(text("CREATE TEMP TABLE _g(name TEXT PRIMARY KEY);"))
        conn.execute(text("""
            INSERT INTO _g(name)
            SELECT DISTINCT TRIM(value::text, '\"')
            FROM movies_stage, json_array_elements_text(movies_stage.genres_json::json) AS value
            WHERE movies_stage.genres_json IS NOT NULL
            ON CONFLICT DO NOTHING;
        """))
        conn.execute(text("""
            INSERT INTO genres(name)
            SELECT name FROM _g
            ON CONFLICT (name) DO NOTHING;
        """))
        conn.execute(text("""
            DELETE FROM movie_genres
            WHERE movie_id IN (SELECT id FROM movies_stage);
        """))
        conn.execute(text("""
            INSERT INTO movie_genres (movie_id, genre_id)
            SELECT DISTINCT ms.id, g.id
            FROM movies_stage ms
            CROSS JOIN LATERAL (
                SELECT trim(both '"' from trim(x)) AS name
                FROM json_array_elements_text(ms.genres_json::json) AS t(x)
            ) j
            JOIN genres g ON g.name = j.name
            ON CONFLICT DO NOTHING;
        """))

    print("ETL load completed.")

if __name__ == "__main__":
    main()
