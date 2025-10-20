CREATE TABLE IF NOT EXISTS movies (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    release_date DATE,
    year INT,
    decade INT,
    runtime_mins INT,
    original_language TEXT,
    budget_usd NUMERIC,
    revenue_usd NUMERIC,
    popularity NUMERIC,
    vote_average_tmdb NUMERIC,
    vote_count_tmdb INT,
    imdb_rating NUMERIC,
    imdb_votes INT,
    poster_path TEXT,
    genres_json JSONB
);

CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id BIGINT REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INT REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

CREATE OR REPLACE VIEW movies_enriched AS
SELECT
    m.*,
    CASE WHEN m.budget_usd > 0 AND m.revenue_usd IS NOT NULL THEN (m.revenue_usd - m.budget_usd) / NULLIF(m.budget_usd, 0)
    END AS roi
FROM movies m;

CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_votes ON movies(vote_count_tmdb);
CREATE INDEX IF NOT EXISTS idx_movies_genres ON movie_genres(genre_id, movie_id);